import simplejson as json
from flask import g, redirect, request, Response
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access, has_access_api
from flask_babel import lazy_gettext as _

from rabbitai import db, is_feature_enabled
from rabbitai.constants import MODEL_VIEW_RW_METHOD_PERMISSION_MAP, RouteMethod
from rabbitai.models.sql_lab import Query, SavedQuery, TableSchema, TabState
from rabbitai.typing import FlaskResponse
from rabbitai.utils import core as utils

from .base import BaseRabbitaiView, DeleteMixin, json_success, RabbitaiModelView


class SavedQueryView(RabbitaiModelView, DeleteMixin):
    """保存的查询视图。"""

    datamodel = SQLAInterface(SavedQuery)
    include_route_methods = RouteMethod.CRUD_SET

    class_permission_name = "SavedQuery"
    method_permission_name = MODEL_VIEW_RW_METHOD_PERMISSION_MAP
    list_title = _("List Saved Query")
    show_title = _("Show Saved Query")
    add_title = _("Add Saved Query")
    edit_title = _("Edit Saved Query")

    list_columns = [
        "label",
        "user",
        "database",
        "schema",
        "description",
        "modified",
        "pop_tab_link",
    ]
    order_columns = ["label", "schema", "description", "modified"]
    show_columns = [
        "id",
        "label",
        "user",
        "database",
        "description",
        "sql",
        "pop_tab_link",
    ]
    search_columns = ("label", "user", "database", "schema", "changed_on")
    add_columns = ["label", "database", "description", "sql"]
    edit_columns = add_columns
    base_order = ("changed_on", "desc")
    label_columns = {
        "label": _("Label"),
        "user": _("User"),
        "database": _("Database"),
        "description": _("Description"),
        "modified": _("Modified"),
        "end_time": _("End Time"),
        "pop_tab_link": _("Pop Tab Link"),
        "changed_on": _("Changed on"),
    }

    @expose("/list/")
    @has_access
    def list(self) -> FlaskResponse:
        if not is_feature_enabled("ENABLE_REACT_CRUD_VIEWS"):
            return super().list()

        return super().render_app_template()

    def pre_add(self, item: "SavedQueryView") -> None:
        item.user = g.user

    def pre_update(self, item: "SavedQueryView") -> None:
        self.pre_add(item)


class SavedQueryViewApi(SavedQueryView):
    """保存的查询视图API。"""

    include_route_methods = {
        RouteMethod.API_READ,
        RouteMethod.API_CREATE,
        RouteMethod.API_UPDATE,
        RouteMethod.API_GET,
    }

    class_permission_name = "SavedQuery"
    method_permission_name = MODEL_VIEW_RW_METHOD_PERMISSION_MAP

    list_columns = [
        "id",
        "label",
        "sqlalchemy_uri",
        "user_email",
        "schema",
        "description",
        "sql",
        "extra_json",
        "extra",
    ]
    add_columns = ["label", "db_id", "schema", "description", "sql", "extra_json"]
    edit_columns = add_columns
    show_columns = add_columns + ["id"]

    @has_access_api
    @expose("show/<pk>")
    def show(self, pk: int) -> FlaskResponse:
        return super().show(pk)


def _get_owner_id(tab_state_id: int) -> int:
    return db.session.query(TabState.user_id).filter_by(id=tab_state_id).scalar()


class TabStateView(BaseRabbitaiView):
    """选项卡状态视图。"""
    @has_access_api
    @expose("/", methods=["POST"])
    def post(self) -> FlaskResponse:
        query_editor = json.loads(request.form["queryEditor"])
        tab_state = TabState(
            user_id=g.user.get_id(),
            label=query_editor.get("title", "Untitled Query"),
            active=True,
            database_id=query_editor["dbId"],
            schema=query_editor.get("schema"),
            sql=query_editor.get("sql", "SELECT ..."),
            query_limit=query_editor.get("queryLimit"),
            hide_left_bar=query_editor.get("hideLeftBar"),
        )
        (
            db.session.query(TabState)
            .filter_by(user_id=g.user.get_id())
            .update({"active": False})
        )
        db.session.add(tab_state)
        db.session.commit()
        return json_success(json.dumps({"id": tab_state.id}))

    @has_access_api
    @expose("/<int:tab_state_id>", methods=["DELETE"])
    def delete(self, tab_state_id: int) -> FlaskResponse:
        if _get_owner_id(tab_state_id) != int(g.user.get_id()):
            return Response(status=403)

        db.session.query(TabState).filter(TabState.id == tab_state_id).delete(
            synchronize_session=False
        )
        db.session.query(TableSchema).filter(
            TableSchema.tab_state_id == tab_state_id
        ).delete(synchronize_session=False)
        db.session.commit()
        return json_success(json.dumps("OK"))

    @has_access_api
    @expose("/<int:tab_state_id>", methods=["GET"])
    def get(self, tab_state_id: int) -> FlaskResponse:
        if _get_owner_id(tab_state_id) != int(g.user.get_id()):
            return Response(status=403)

        tab_state = db.session.query(TabState).filter_by(id=tab_state_id).first()
        if tab_state is None:
            return Response(status=404)
        return json_success(
            json.dumps(tab_state.to_dict(), default=utils.json_iso_dttm_ser)
        )

    @has_access_api
    @expose("<int:tab_state_id>/activate", methods=["POST"])
    def activate(self, tab_state_id: int) -> FlaskResponse:
        owner_id = _get_owner_id(tab_state_id)
        if owner_id is None:
            return Response(status=404)
        if owner_id != int(g.user.get_id()):
            return Response(status=403)

        (
            db.session.query(TabState)
            .filter_by(user_id=g.user.get_id())
            .update({"active": TabState.id == tab_state_id})
        )
        db.session.commit()
        return json_success(json.dumps(tab_state_id))

    @has_access_api
    @expose("<int:tab_state_id>", methods=["PUT"])
    def put(self, tab_state_id: int) -> FlaskResponse:
        if _get_owner_id(tab_state_id) != int(g.user.get_id()):
            return Response(status=403)

        fields = {k: json.loads(v) for k, v in request.form.to_dict().items()}
        db.session.query(TabState).filter_by(id=tab_state_id).update(fields)
        db.session.commit()
        return json_success(json.dumps(tab_state_id))

    @has_access_api
    @expose("<int:tab_state_id>/migrate_query", methods=["POST"])
    def migrate_query(self, tab_state_id: int) -> FlaskResponse:
        if _get_owner_id(tab_state_id) != int(g.user.get_id()):
            return Response(status=403)

        client_id = json.loads(request.form["queryId"])
        db.session.query(Query).filter_by(client_id=client_id).update(
            {"sql_editor_id": tab_state_id}
        )
        db.session.commit()
        return json_success(json.dumps(tab_state_id))

    @has_access_api
    @expose("<int:tab_state_id>/query/<client_id>", methods=["DELETE"])
    def delete_query(self, tab_state_id: str, client_id: str) -> FlaskResponse:
        db.session.query(Query).filter_by(
            client_id=client_id, user_id=g.user.get_id(), sql_editor_id=tab_state_id
        ).delete(synchronize_session=False)
        db.session.commit()
        return json_success(json.dumps("OK"))


class TableSchemaView(BaseRabbitaiView):
    """数据表架构视图。"""

    @has_access_api
    @expose("/", methods=["POST"])
    def post(self) -> FlaskResponse:
        table = json.loads(request.form["table"])

        # delete any existing table schema
        db.session.query(TableSchema).filter(
            TableSchema.tab_state_id == table["queryEditorId"],
            TableSchema.database_id == table["dbId"],
            TableSchema.schema == table["schema"],
            TableSchema.table == table["name"],
        ).delete(synchronize_session=False)

        table_schema = TableSchema(
            tab_state_id=table["queryEditorId"],
            database_id=table["dbId"],
            schema=table["schema"],
            table=table["name"],
            description=json.dumps(table),
            expanded=True,
        )
        db.session.add(table_schema)
        db.session.commit()
        return json_success(json.dumps({"id": table_schema.id}))

    @has_access_api
    @expose("/<int:table_schema_id>", methods=["DELETE"])
    def delete(self, table_schema_id: int) -> FlaskResponse:
        db.session.query(TableSchema).filter(TableSchema.id == table_schema_id).delete(
            synchronize_session=False
        )
        db.session.commit()
        return json_success(json.dumps("OK"))

    @has_access_api
    @expose("/<int:table_schema_id>/expanded", methods=["POST"])
    def expanded(self, table_schema_id: int) -> FlaskResponse:
        payload = json.loads(request.form["expanded"])
        (
            db.session.query(TableSchema)
            .filter_by(id=table_schema_id)
            .update({"expanded": payload})
        )
        db.session.commit()
        response = json.dumps({"id": table_schema_id, "expanded": payload})
        return json_success(response)


class SqlLab(BaseRabbitaiView):
    """SQL工具箱视图。"""

    @expose("/my_queries/")
    @has_access
    def my_queries(self) -> FlaskResponse:
        """Assigns a list of found users to the given role."""
        return redirect("/savedqueryview/list/?_flt_0_user={}".format(g.user.get_id()))
