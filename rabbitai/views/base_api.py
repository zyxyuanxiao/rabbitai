import functools
import logging
from typing import Any, Callable, cast, Dict, List, Optional, Set, Tuple, Type, Union

from apispec import APISpec
from apispec.exceptions import DuplicateComponentNameError
from flask import Blueprint, g, Response
from flask_appbuilder import AppBuilder, Model, ModelRestApi
from flask_appbuilder.api import expose, protect, rison, safe
from flask_appbuilder.models.filters import BaseFilter, Filters
from flask_appbuilder.models.sqla.filters import FilterStartsWith
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_babel import lazy_gettext as _
from marshmallow import fields, Schema
from sqlalchemy import and_, distinct, func
from sqlalchemy.orm.query import Query

from rabbitai.extensions import db, event_logger, security_manager
from rabbitai.models.core import FavStar
from rabbitai.models.dashboard import Dashboard
from rabbitai.models.slice import Slice
from rabbitai.schemas import error_payload_content
from rabbitai.sql_lab import Query as SqllabQuery
from rabbitai.stats_logger import BaseStatsLogger
from rabbitai.typing import FlaskResponse
from rabbitai.utils.core import time_function

logger = logging.getLogger(__name__)
get_related_schema = {
    "type": "object",
    "properties": {
        "page_size": {"type": "integer"},
        "page": {"type": "integer"},
        "include_ids": {"type": "array", "items": {"type": "integer"}},
        "filter": {"type": "string"},
    },
}
"""获取关联的架构"""


class RelatedResultResponseSchema(Schema):
    """关联结果响应架构，定义字段：value、text。"""

    value = fields.Integer(description="关联项唯一标识")
    text = fields.String(description="关联项字符串表示")


class RelatedResponseSchema(Schema):
    """关联响应架构，定义字段：count、result。"""
    count = fields.Integer(description="关联值的总数")
    result = fields.List(fields.Nested(RelatedResultResponseSchema))


class DistinctResultResponseSchema(Schema):
    """不同值结果响应架构，定义字段：text。"""
    text = fields.String(description="不同项")


class DistincResponseSchema(Schema):
    """不同值响应架构，定义字段：count、result"""
    count = fields.Integer(description="不同值的个数")
    result = fields.List(fields.Nested(DistinctResultResponseSchema))


def statsd_metrics(f: Callable[..., Any]) -> Callable[..., Any]:
    """
    处理 REST API 调用，发送所有 statsd 指标（如耗时）。

    :param f: 要包裹的可调用对象。
    :return:
    """

    def wraps(self: "BaseRabbitaiModelRestApi", *args: Any, **kwargs: Any) -> Response:
        try:
            duration, response = time_function(f, self, *args, **kwargs)
        except Exception as ex:
            self.incr_stats("error", f.__name__)
            raise ex

        self.send_stats_metrics(response, f.__name__, duration)
        return response

    return functools.update_wrapper(wraps, f)


class RelatedFieldFilter:
    """关联字段过滤器。"""

    # data class to specify what filter to use on a /related endpoint
    def __init__(self, field_name: str, filter_class: Type[BaseFilter]):
        self.field_name = field_name
        self.filter_class = filter_class


class BaseFavoriteFilter(BaseFilter):
    """
    Base Custom filter for the GET list that filters all dashboards, slices
    that a user has favored or not
    """

    name = _("Is favorite")
    arg_name = ""
    class_name = ""
    """ The FavStar class_name to user """
    model: Type[Union[Dashboard, Slice, SqllabQuery]] = Dashboard
    """ The SQLAlchemy model """

    def apply(self, query: Query, value: Any) -> Query:
        # If anonymous user filter nothing
        if security_manager.current_user is None:
            return query
        users_favorite_query = db.session.query(FavStar.obj_id).filter(
            and_(
                FavStar.user_id == g.user.get_id(),
                FavStar.class_name == self.class_name,
            )
        )
        if value:
            return query.filter(and_(self.model.id.in_(users_favorite_query)))

        return query.filter(and_(~self.model.id.in_(users_favorite_query)))


class BaseRabbitaiModelRestApi(ModelRestApi):
    """扩展 FAB 的 ModelResApi 以实现 rabbitai 所需通用功能。"""

    # region 类属性

    csrf_exempt = False
    method_permission_name = {
        "bulk_delete": "delete",
        "data": "list",
        "data_from_cache": "list",
        "delete": "delete",
        "distinct": "list",
        "export": "mulexport",
        "import_": "add",
        "get": "show",
        "get_list": "list",
        "info": "list",
        "post": "add",
        "put": "edit",
        "refresh": "edit",
        "related": "list",
        "related_objects": "list",
        "schemas": "list",
        "select_star": "list",
        "table_metadata": "list",
        "test_connection": "post",
        "thumbnail": "list",
        "viz_types": "list",
    }
    """各方法的权限名称字典"""
    order_rel_fields: Dict[str, Tuple[str, str]] = {}
    """
    关联查询排序字段 ::

        order_rel_fields = {
            "<RELATED_FIELD>": ("<RELATED_FIELD_FIELD>", "<asc|desc>"),
             ...
        }
    """
    related_field_filters: Dict[str, Union[RelatedFieldFilter, str]] = {}
    """
    声明的过滤字段 ::

        related_fields = {
            "<RELATED_FIELD>": <RelatedFieldFilter>)
        }
    """
    filter_rel_fields: Dict[str, BaseFilter] = {}
    """
    声明关联字段过滤器 ::

        filter_rel_fields_field = {
            "<RELATED_FIELD>": "<FILTER>")
        }
    """
    allowed_rel_fields: Set[str] = set()
    """关联（ `related` ）端点支持的允许关联字段集合。"""

    text_field_rel_fields: Dict[str, str] = {}
    """
    模型对象的显示文本 ::

        text_field_rel_fields = {
            "<RELATED_FIELD>": "<RELATED_OBJECT_FIELD>"
        }
    """

    allowed_distinct_fields: Set[str] = set()
    """允许的不同字段名称的集合。"""
    openapi_spec_component_schemas: Tuple[Type[Schema], ...] = tuple()
    """添加额外架构到 OpenAPI 组件架构 schemas。"""

    add_columns: List[str]
    """要添加列名称的列表。"""
    edit_columns: List[str]
    """要编辑列名称的列表。"""
    list_columns: List[str]
    """要列出列名称的列表。"""
    show_columns: List[str]
    """要显示列名称的列表。"""

    responses = {
        "400": {"description": "Bad request", "content": error_payload_content},
        "401": {"description": "Unauthorized", "content": error_payload_content},
        "403": {"description": "Forbidden", "content": error_payload_content},
        "404": {"description": "Not found", "content": error_payload_content},
        "422": {
            "description": "Could not process entity",
            "content": error_payload_content,
        },
        "500": {"description": "Fatal error", "content": error_payload_content},
    }
    """响应对象"""

    # endregion

    def __init__(self) -> None:
        # Setup statsd
        self.stats_logger = BaseStatsLogger()
        # Add base API spec base query parameter schemas
        if self.apispec_parameter_schemas is None:
            self.apispec_parameter_schemas = {}
        self.apispec_parameter_schemas["get_related_schema"] = get_related_schema
        if self.openapi_spec_component_schemas is None:
            self.openapi_spec_component_schemas = ()
        self.openapi_spec_component_schemas = self.openapi_spec_component_schemas + (
            RelatedResponseSchema,
            DistincResponseSchema,
        )
        super().__init__()

    def add_apispec_components(self, api_spec: APISpec) -> None:
        """
        Adds extra OpenApi schema spec components, these are declared
        on the `openapi_spec_component_schemas` class property
        """
        for schema in self.openapi_spec_component_schemas:
            try:
                api_spec.components.schema(schema.__name__, schema=schema,)
            except DuplicateComponentNameError:
                pass
        super().add_apispec_components(api_spec)

    def create_blueprint(self, appbuilder: AppBuilder, *args: Any, **kwargs: Any) -> Blueprint:
        """
        创建一个蓝图，注册该类的公开API地址到蓝图。

        :param appbuilder: 应用构建者。
        :param args: 参数。
        :param kwargs: 关键字参数。
        :return:
        """
        self.stats_logger = self.appbuilder.get_app.config["STATS_LOGGER"]
        return super().create_blueprint(appbuilder, *args, **kwargs)

    def _init_properties(self) -> None:
        model_id = self.datamodel.get_pk_name()
        if self.list_columns is None and not self.list_model_schema:
            self.list_columns = [model_id]
        if self.show_columns is None and not self.show_model_schema:
            self.show_columns = [model_id]
        if self.edit_columns is None and not self.edit_model_schema:
            self.edit_columns = [model_id]
        if self.add_columns is None and not self.add_model_schema:
            self.add_columns = [model_id]
        super()._init_properties()

    def _get_related_filter(self, datamodel: SQLAInterface, column_name: str, value: str) -> Filters:
        """
        获取关联过滤器。

        :param datamodel: 数据模型接口。
        :param column_name: 列名称。
        :param value: 值。
        :return:
        """

        filter_field = self.related_field_filters.get(column_name)
        if isinstance(filter_field, str):
            filter_field = RelatedFieldFilter(cast(str, filter_field), FilterStartsWith)
        filter_field = cast(RelatedFieldFilter, filter_field)
        search_columns = [filter_field.field_name] if filter_field else None
        filters = datamodel.get_filters(search_columns)
        base_filters = self.filter_rel_fields.get(column_name)
        if base_filters:
            filters.add_filter_list(base_filters)
        if value and filter_field:
            filters.add_filter(
                filter_field.field_name, filter_field.filter_class, value
            )
        return filters

    def _get_distinct_filter(self, column_name: str, value: str) -> Filters:
        """
        获取不同值过滤器。

        :param column_name: 列名称
        :param value: 值
        :return:
        """

        filter_field = RelatedFieldFilter(column_name, FilterStartsWith)
        filter_field = cast(RelatedFieldFilter, filter_field)
        search_columns = [filter_field.field_name] if filter_field else None
        filters = self.datamodel.get_filters(search_columns)
        filters.add_filter_list(self.base_filters)
        if value and filter_field:
            filters.add_filter(
                filter_field.field_name, filter_field.filter_class, value
            )
        return filters

    def _get_text_for_model(self, model: Model, column_name: str) -> str:
        """
        获取指定模型和列的文本表示。

        :param model:
        :param column_name:
        :return:
        """
        if column_name in self.text_field_rel_fields:
            model_column_name = self.text_field_rel_fields.get(column_name)
            if model_column_name:
                return getattr(model, model_column_name)
        return str(model)

    def _get_result_from_rows(
        self, datamodel: SQLAInterface, rows: List[Model], column_name: str
    ) -> List[Dict[str, Any]]:
        """
        从指定行数据中获取指定列的结果。

        :param datamodel:
        :param rows:
        :param column_name:
        :return:
        """
        return [
            {
                "value": datamodel.get_pk_value(row),
                "text": self._get_text_for_model(row, column_name),
            }
            for row in rows
        ]

    def _add_extra_ids_to_result(
        self,
        datamodel: SQLAInterface,
        column_name: str,
        ids: List[int],
        result: List[Dict[str, Any]],
    ) -> None:
        if ids:
            # Filter out already present values on the result
            values = [row["value"] for row in result]
            ids = [id_ for id_ in ids if id_ not in values]
            pk_col = datamodel.get_pk()
            # Fetch requested values from ids
            extra_rows = db.session.query(datamodel.obj).filter(pk_col.in_(ids)).all()
            result += self._get_result_from_rows(datamodel, extra_rows, column_name)

    def incr_stats(self, action: str, func_name: str) -> None:
        """
        Proxy function for statsd.incr to impose a key structure for REST API's

        :param action: String with an action name eg: error, success
        :param func_name: The function name
        """
        self.stats_logger.incr(f"{self.__class__.__name__}.{func_name}.{action}")

    def timing_stats(self, action: str, func_name: str, value: float) -> None:
        """
        Proxy function for statsd.incr to impose a key structure for REST API's

        :param action: String with an action name eg: error, success
        :param func_name: The function name
        :param value: A float with the time it took for the endpoint to execute
        """
        self.stats_logger.timing(
            f"{self.__class__.__name__}.{func_name}.{action}", value
        )

    def send_stats_metrics(
        self, response: Response, key: str, time_delta: Optional[float] = None
    ) -> None:
        """
        发送统计指标，在性能统计日志中记录相关信息。

        :param response: flask response object, will evaluate if it was an error
        :param key: The function name
        :param time_delta: Optional time it took for the endpoint to execute
        """

        if 200 <= response.status_code < 400:
            self.incr_stats("success", key)
        else:
            self.incr_stats("error", key)
        if time_delta:
            self.timing_stats("time", key, time_delta)

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.info",
        object_ref=False,
        log_to_statsd=False,
    )
    def info_headless(self, **kwargs: Any) -> Response:
        """
        Add statsd metrics to builtin FAB _info endpoint
        """
        duration, response = time_function(super().info_headless, **kwargs)
        self.send_stats_metrics(response, self.info.__name__, duration)
        return response

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get",
        object_ref=False,
        log_to_statsd=False,
    )
    def get_headless(self, pk: int, **kwargs: Any) -> Response:
        """
        Add statsd metrics to builtin FAB GET endpoint
        """
        duration, response = time_function(super().get_headless, pk, **kwargs)
        self.send_stats_metrics(response, self.get.__name__, duration)
        return response

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get_list",
        object_ref=False,
        log_to_statsd=False,
    )
    def get_list_headless(self, **kwargs: Any) -> Response:
        """
        Add statsd metrics to builtin FAB GET list endpoint
        """
        duration, response = time_function(super().get_list_headless, **kwargs)
        self.send_stats_metrics(response, self.get_list.__name__, duration)
        return response

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.post",
        object_ref=False,
        log_to_statsd=False,
    )
    def post_headless(self) -> Response:
        """
        Add statsd metrics to builtin FAB POST endpoint
        """
        duration, response = time_function(super().post_headless)
        self.send_stats_metrics(response, self.post.__name__, duration)
        return response

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.put",
        object_ref=False,
        log_to_statsd=False,
    )
    def put_headless(self, pk: int) -> Response:
        """
        Add statsd metrics to builtin FAB PUT endpoint
        """
        duration, response = time_function(super().put_headless, pk)
        self.send_stats_metrics(response, self.put.__name__, duration)
        return response

    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.delete",
        object_ref=False,
        log_to_statsd=False,
    )
    def delete_headless(self, pk: int) -> Response:
        """
        Add statsd metrics to builtin FAB DELETE endpoint
        """
        duration, response = time_function(super().delete_headless, pk)
        self.send_stats_metrics(response, self.delete.__name__, duration)
        return response

    @expose("/related/<column_name>", methods=["GET"])
    @protect()
    @safe
    @statsd_metrics
    @rison(get_related_schema)
    def related(self, column_name: str, **kwargs: Any) -> FlaskResponse:
        """获取关联字段数据。

        ---
        get:
          parameters:
          - in: path
            schema:
              type: string
            name: column_name
          - in: query
            name: q
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/get_related_schema'
          responses:
            200:
              description: Related column data
              content:
                application/json:
                  schema:
                  schema:
                    $ref: "#/components/schemas/RelatedResponseSchema"
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """

        if column_name not in self.allowed_rel_fields:
            self.incr_stats("error", self.related.__name__)
            return self.response_404()

        args = kwargs.get("rison", {})

        # handle pagination
        page, page_size = self._handle_page_args(args)
        try:
            datamodel = self.datamodel.get_related_interface(column_name)
        except KeyError:
            return self.response_404()

        page, page_size = self._sanitize_page_args(page, page_size)
        # handle ordering
        order_field = self.order_rel_fields.get(column_name)
        if order_field:
            order_column, order_direction = order_field
        else:
            order_column, order_direction = "", ""
        # handle filters
        filters = self._get_related_filter(datamodel, column_name, args.get("filter"))
        # Make the query
        _, rows = datamodel.query(
            filters, order_column, order_direction, page=page, page_size=page_size
        )

        # produce response
        result = self._get_result_from_rows(datamodel, rows, column_name)

        # If ids are specified make sure we fetch and include them on the response
        ids = args.get("include_ids")
        self._add_extra_ids_to_result(datamodel, column_name, ids, result)

        return self.response(200, count=len(result), result=result)

    @expose("/distinct/<column_name>", methods=["GET"])
    @protect()
    @safe
    @statsd_metrics
    @rison(get_related_schema)
    def distinct(self, column_name: str, **kwargs: Any) -> FlaskResponse:
        """获取指定列的不同数据。

        ---
        get:
          parameters:
          - in: path
            schema:
              type: string
            name: column_name
          - in: query
            name: q
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/get_related_schema'
          responses:
            200:
              description: Distinct field data
              content:
                application/json:
                  schema:
                  schema:
                    $ref: "#/components/schemas/DistincResponseSchema"
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """

        if column_name not in self.allowed_distinct_fields:
            self.incr_stats("error", self.related.__name__)
            return self.response_404()
        args = kwargs.get("rison", {})
        # handle pagination
        page, page_size = self._sanitize_page_args(*self._handle_page_args(args))
        # Create generic base filters with added request filter
        filters = self._get_distinct_filter(column_name, args.get("filter"))
        # Make the query
        query_count = self.appbuilder.get_session.query(
            func.count(distinct(getattr(self.datamodel.obj, column_name)))
        )
        count = self.datamodel.apply_filters(query_count, filters).scalar()
        if count == 0:
            return self.response(200, count=count, result=[])
        query = self.appbuilder.get_session.query(
            distinct(getattr(self.datamodel.obj, column_name))
        )
        # Apply generic base filters with added request filter
        query = self.datamodel.apply_filters(query, filters)
        # Apply sort
        query = self.datamodel.apply_order_by(query, column_name, "asc")
        # Apply pagination
        result = self.datamodel.apply_pagination(query, page, page_size).all()
        # produce response
        result = [
            {"text": item[0], "value": item[0]}
            for item in result
            if item[0] is not None
        ]
        return self.response(200, count=count, result=result)
