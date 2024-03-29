import functools
import logging
from typing import Any, Callable, Optional

from flask import g
from flask_babel import lazy_gettext as _

from rabbitai.models.core import Database
from rabbitai.sql_parse import Table
from rabbitai.utils.core import parse_js_uri_path_item
from rabbitai.views.base_api import BaseRabbitaiModelRestApi

logger = logging.getLogger(__name__)


def check_datasource_access(f: Callable[..., Any]) -> Callable[..., Any]:
    """
    A Decorator that checks if a user has datasource access
    """

    def wraps(
        self: BaseRabbitaiModelRestApi,
        pk: int,
        table_name: str,
        schema_name: Optional[str] = None,
    ) -> Any:
        schema_name_parsed = parse_js_uri_path_item(schema_name, eval_undefined=True)
        table_name_parsed = parse_js_uri_path_item(table_name)
        if not table_name_parsed:
            return self.response_422(message=_("Table name undefined"))
        database: Database = self.datamodel.get(pk)
        if not database:
            self.stats_logger.incr(
                f"database_not_found_{self.__class__.__name__}.select_star"
            )
            return self.response_404()
        if not self.appbuilder.sm.can_access_table(
            database, Table(table_name_parsed, schema_name_parsed)
        ):
            self.stats_logger.incr(
                f"permisssion_denied_{self.__class__.__name__}.select_star"
            )
            logger.warning(
                "Permission denied for user %s on table: %s schema: %s",
                g.user,
                table_name_parsed,
                schema_name_parsed,
            )
            return self.response_404()
        return f(self, database, table_name_parsed, schema_name_parsed)

    return functools.update_wrapper(wraps, f)
