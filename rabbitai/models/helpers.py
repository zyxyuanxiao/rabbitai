"""a collection of model-related helper classes and functions"""
import json
import logging
import re
import uuid
from datetime import datetime, timedelta
from json.decoder import JSONDecodeError
from typing import Any, Dict, List, Optional, Set, Union

import humanize
import pandas as pd
import pytz
import sqlalchemy as sa
import yaml
from flask import escape, g, Markup
from flask_appbuilder.models.decorators import renders
from flask_appbuilder.models.mixins import AuditMixin
from flask_appbuilder.security.sqla.models import User
from sqlalchemy import and_, or_, UniqueConstraint
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapper, Session
from sqlalchemy.orm.exc import MultipleResultsFound
from sqlalchemy_utils import UUIDType

from rabbitai.utils.core import QueryStatus

logger = logging.getLogger(__name__)


def json_to_dict(json_str: str) -> Dict[Any, Any]:
    if json_str:
        val = re.sub(",[ \t\r\n]+}", "}", json_str)
        val = re.sub(",[ \t\r\n]+\\]", "]", val)
        return json.loads(val)

    return {}


def convert_uuids(obj: Any) -> Any:
    """
    Convert UUID objects to str so we can use yaml.safe_dump
    """
    if isinstance(obj, uuid.UUID):
        return str(obj)

    if isinstance(obj, list):
        return [convert_uuids(el) for el in obj]

    if isinstance(obj, dict):
        return {k: convert_uuids(v) for k, v in obj.items()}

    return obj


class ImportExportMixin:
    """导入导出混入类，定义导入导出相关字段。"""

    uuid = sa.Column(
        UUIDType(binary=True), primary_key=False, unique=True, default=uuid.uuid4
    )

    export_parent: Optional[str] = None
    """The name of the attribute with the SQL Alchemy back reference"""

    export_children: List[str] = []
    """List of (str) names of attributes with the SQL Alchemy forward references"""

    export_fields: List[str] = []
    """The names of the attributes that are available for import and export"""

    extra_import_fields: List[str] = []
    """Additional fields that should be imported, even though they were not exported"""

    __mapper__: Mapper
    """映射器，定义类属性与数据库表列的映射关系。"""

    @classmethod
    def _unique_constrains(cls) -> List[Set[str]]:
        """获取所有（单列和多列）唯一约束"""
        unique = [
            {c.name for c in u.columns}
            for u in cls.__table_args__  # type: ignore
            if isinstance(u, UniqueConstraint)
        ]
        unique.extend(
            {c.name} for c in cls.__table__.columns if c.unique  # type: ignore
        )
        return unique

    @classmethod
    def parent_foreign_key_mappings(cls) -> Dict[str, str]:
        """获取外键名到外键本地名的映射。"""
        parent_rel = cls.__mapper__.relationships.get(cls.export_parent)
        if parent_rel:
            return {l.name: r.name for (l, r) in parent_rel.local_remote_pairs}
        return {}

    @classmethod
    def export_schema(
        cls, recursive: bool = True, include_parent_ref: bool = False
    ) -> Dict[str, Any]:
        """
        导出结构为字典形式。

        :param recursive: 是否递归，默认True。
        :param include_parent_ref: 是否包括反向引用，默认False。
        :return:
        """

        parent_excludes = set()
        if not include_parent_ref:
            parent_ref = cls.__mapper__.relationships.get(cls.export_parent)
            if parent_ref:
                parent_excludes = {column.name for column in parent_ref.local_columns}

        def formatter(column: sa.Column) -> str:
            return (
                "{0} Default ({1})".format(str(column.type), column.default.arg)
                if column.default
                else str(column.type)
            )

        schema: Dict[str, Any] = {
            column.name: formatter(column)
            for column in cls.__table__.columns  # type: ignore
            if (column.name in cls.export_fields and column.name not in parent_excludes)
        }
        if recursive:
            for column in cls.export_children:
                child_class = cls.__mapper__.relationships[column].argument.class_
                schema[column] = [
                    child_class.export_schema(
                        recursive=recursive, include_parent_ref=include_parent_ref
                    )
                ]
        return schema

    @classmethod
    def import_from_dict(
        cls,
        session: Session,
        dict_rep: Dict[Any, Any],
        parent: Optional[Any] = None,
        recursive: bool = True,
        sync: Optional[List[str]] = None,
    ) -> Any:
        """
        从字典导入。

        :param session:
        :param dict_rep:
        :param parent:
        :param recursive:
        :param sync:
        :return:
        """
        if sync is None:
            sync = []
        parent_refs = cls.parent_foreign_key_mappings()
        export_fields = (
            set(cls.export_fields)
            | set(cls.extra_import_fields)
            | set(parent_refs.keys())
            | {"uuid"}
        )
        new_children = {c: dict_rep[c] for c in cls.export_children if c in dict_rep}
        unique_constrains = cls._unique_constrains()

        filters = []  # Using these filters to check if obj already exists

        # Remove fields that should not get imported
        for k in list(dict_rep):
            if k not in export_fields and k not in parent_refs:
                del dict_rep[k]

        if not parent:
            if cls.export_parent:
                for prnt in parent_refs.keys():
                    if prnt not in dict_rep:
                        raise RuntimeError(
                            "{0}: Missing field {1}".format(cls.__name__, prnt)
                        )
        else:
            # Set foreign keys to parent obj
            for k, v in parent_refs.items():
                dict_rep[k] = getattr(parent, v)

        # Add filter for parent obj
        filters.extend([getattr(cls, k) == dict_rep.get(k) for k in parent_refs.keys()])

        # Add filter for unique constraints
        ucs = [
            and_(
                *[
                    getattr(cls, k) == dict_rep.get(k)
                    for k in cs
                    if dict_rep.get(k) is not None
                ]
            )
            for cs in unique_constrains
        ]
        filters.append(or_(*ucs))

        # Check if object already exists in DB, break if more than one is found
        try:
            obj_query = session.query(cls).filter(and_(*filters))
            obj = obj_query.one_or_none()
        except MultipleResultsFound as ex:
            logger.error(
                "Error importing %s \n %s \n %s",
                cls.__name__,
                str(obj_query),
                yaml.safe_dump(dict_rep),
                exc_info=True,
            )
            raise ex

        if not obj:
            is_new_obj = True
            # Create new DB object
            obj = cls(**dict_rep)  # type: ignore
            logger.info("Importing new %s %s", obj.__tablename__, str(obj))
            if cls.export_parent and parent:
                setattr(obj, cls.export_parent, parent)
            session.add(obj)
        else:
            is_new_obj = False
            logger.info("Updating %s %s", obj.__tablename__, str(obj))
            # Update columns
            for k, v in dict_rep.items():
                setattr(obj, k, v)

        # Recursively create children
        if recursive:
            for child in cls.export_children:
                child_class = cls.__mapper__.relationships[child].argument.class_
                added = []
                for c_obj in new_children.get(child, []):
                    added.append(
                        child_class.import_from_dict(
                            session=session, dict_rep=c_obj, parent=obj, sync=sync
                        )
                    )
                # If children should get synced, delete the ones that did not
                # get updated.
                if child in sync and not is_new_obj:
                    back_refs = child_class.parent_foreign_key_mappings()
                    delete_filters = [
                        getattr(child_class, k) == getattr(obj, back_refs.get(k))
                        for k in back_refs.keys()
                    ]
                    to_delete = set(
                        session.query(child_class).filter(and_(*delete_filters))
                    ).difference(set(added))
                    for o in to_delete:
                        logger.info("Deleting %s %s", child, str(obj))
                        session.delete(o)

        return obj

    def export_to_dict(
        self,
        recursive: bool = True,
        include_parent_ref: bool = False,
        include_defaults: bool = False,
        export_uuids: bool = False,
    ) -> Dict[Any, Any]:
        """
        导出为字典形式。

        :param recursive:
        :param include_parent_ref:
        :param include_defaults:
        :param export_uuids:
        :return:
        """
        export_fields = set(self.export_fields)
        if export_uuids:
            export_fields.add("uuid")
            if "id" in export_fields:
                export_fields.remove("id")

        cls = self.__class__
        parent_excludes = set()
        if recursive and not include_parent_ref:
            parent_ref = cls.__mapper__.relationships.get(cls.export_parent)
            if parent_ref:
                parent_excludes = {c.name for c in parent_ref.local_columns}
        dict_rep = {
            c.name: getattr(self, c.name)
            for c in cls.__table__.columns  # type: ignore
            if (
                c.name in export_fields
                and c.name not in parent_excludes
                and (
                    include_defaults
                    or (
                        getattr(self, c.name) is not None
                        and (not c.default or getattr(self, c.name) != c.default.arg)
                    )
                )
            )
        }

        # sort according to export_fields using DSU (decorate, sort, undecorate)
        order = {field: i for i, field in enumerate(self.export_fields)}
        decorated_keys = [(order.get(k, len(order)), k) for k in dict_rep]
        decorated_keys.sort()
        dict_rep = {k: dict_rep[k] for _, k in decorated_keys}

        if recursive:
            for cld in self.export_children:
                # sorting to make lists of children stable
                dict_rep[cld] = sorted(
                    [
                        child.export_to_dict(
                            recursive=recursive,
                            include_parent_ref=include_parent_ref,
                            include_defaults=include_defaults,
                        )
                        for child in getattr(self, cld)
                    ],
                    key=lambda k: sorted(str(k.items())),
                )

        return convert_uuids(dict_rep)

    def override(self, obj: Any) -> None:
        """
        使用指定对象的属性值重写该模型对象的导出字段的值。

        :param obj:
        :return:
        """
        for field in obj.__class__.export_fields:
            setattr(self, field, getattr(obj, field))

    def copy(self) -> Any:
        """返回该死了的副本。"""

        new_obj = self.__class__()
        new_obj.override(self)
        return new_obj

    def alter_params(self, **kwargs: Any) -> None:
        """使用指定关键字参数更新参数对象。"""

        params = self.params_dict
        params.update(kwargs)
        self.params = json.dumps(params)

    def remove_params(self, param_to_remove: str) -> None:
        params = self.params_dict
        params.pop(param_to_remove, None)
        self.params = json.dumps(params)

    def reset_ownership(self) -> None:
        """ object will belong to the user the current user """
        # make sure the object doesn't have relations to a user
        # it will be filled by appbuilder on save
        self.created_by = None
        self.changed_by = None
        # flask global context might not exist (in cli or tests for example)
        self.owners = []
        if g and hasattr(g, "user"):
            self.owners = [g.user]

    @property
    def params_dict(self) -> Dict[Any, Any]:
        """获取参数对象的字典形式。"""
        return json_to_dict(self.params)

    @property
    def template_params_dict(self) -> Dict[Any, Any]:
        """获取模板参数对象的字典形式。"""
        return json_to_dict(self.template_params)  # type: ignore


def _user_link(user: User) -> Union[Markup, str]:
    """
    返回用户访问Html超链接。

    :param user: 用户对象。
    :return:
    """

    if not user:
        return ""

    url = "/rabbitai/profile/{}/".format(user.username)

    return Markup('<a href="{}">{}</a>'.format(url, escape(user) or ""))


class AuditMixinNullable(AuditMixin):
    """可空审计混入，使用可空类型字段（created_on、changed_on），声明属性：created_by_fk、changed_by_fk。

    允许在CRUD外部编程创建对象。
    """

    created_on = sa.Column(sa.DateTime, default=datetime.now, nullable=True)
    changed_on = sa.Column(
        sa.DateTime, default=datetime.now, onupdate=datetime.now, nullable=True
    )

    @declared_attr
    def created_by_fk(self) -> sa.Column:
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=self.get_user_id,
            nullable=True,
        )

    @declared_attr
    def changed_by_fk(self) -> sa.Column:
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=self.get_user_id,
            onupdate=self.get_user_id,
            nullable=True,
        )

    @property
    def changed_by_name(self) -> str:
        if self.changed_by:
            return escape("{}".format(self.changed_by))
        return ""

    @renders("created_by")
    def creator(self) -> Union[Markup, str]:
        return _user_link(self.created_by)

    @property
    def changed_by_(self) -> Union[Markup, str]:
        return _user_link(self.changed_by)

    @renders("changed_on")
    def changed_on_(self) -> Markup:
        return Markup(f'<span class="no-wrap">{self.changed_on}</span>')

    @renders("changed_on")
    def changed_on_delta_humanized(self) -> str:
        return self.changed_on_humanized

    @renders("changed_on")
    def changed_on_utc(self) -> str:
        # Convert naive datetime to UTC
        return self.changed_on.astimezone(pytz.utc).strftime("%Y-%m-%dT%H:%M:%S.%f%z")

    @property
    def changed_on_humanized(self) -> str:
        return humanize.naturaltime(datetime.now() - self.changed_on)

    @renders("changed_on")
    def modified(self) -> Markup:
        return Markup(f'<span class="no-wrap">{self.changed_on_humanized}</span>')


class QueryResult:
    """查询结果对象，包括：df、query、duration、status、error_message、errors。"""

    def __init__(
        self,
        df: pd.DataFrame,
        query: str,
        duration: timedelta,
        status: str = QueryStatus.SUCCESS,
        error_message: Optional[str] = None,
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        self.df = df
        self.query = query
        self.duration = duration
        self.status = status
        self.error_message = error_message
        self.errors = errors or []


class ExtraJSONMixin:
    """额外Json列（extra_json）混入类型，并提供访问 extra_json 列的属性 `extra` 。"""

    extra_json = sa.Column(sa.Text, default="{}")

    @property
    def extra(self) -> Dict[str, Any]:
        try:
            return json.loads(self.extra_json)
        except (TypeError, JSONDecodeError) as exc:
            logger.error(
                "Unable to load an extra json: %r. Leaving empty.", exc, exc_info=True
            )
            return {}

    def set_extra_json(self, extras: Dict[str, Any]) -> None:
        self.extra_json = json.dumps(extras)

    def set_extra_json_key(self, key: str, value: Any) -> None:
        extra = self.extra
        extra[key] = value
        self.extra_json = json.dumps(extra)
