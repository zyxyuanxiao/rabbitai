import json
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from urllib import parse

from sqlalchemy.engine.url import URL

from rabbitai.db_engine_specs.postgres import PostgresBaseEngineSpec
from rabbitai.utils import core as utils

if TYPE_CHECKING:
    from rabbitai.models.core import Database


class SnowflakeEngineSpec(PostgresBaseEngineSpec):
    engine = "snowflake"
    engine_name = "Snowflake"
    force_column_alias_quotes = True
    max_column_name_length = 256

    _time_grain_expressions = {
        None: "{col}",
        "PT1S": "DATE_TRUNC('SECOND', {col})",
        "PT1M": "DATE_TRUNC('MINUTE', {col})",
        "PT5M": "DATEADD(MINUTE, FLOOR(DATE_PART(MINUTE, {col}) / 5) * 5, \
                DATE_TRUNC('HOUR', {col}))",
        "PT10M": "DATEADD(MINUTE, FLOOR(DATE_PART(MINUTE, {col}) / 10) * 10, \
                 DATE_TRUNC('HOUR', {col}))",
        "PT15M": "DATEADD(MINUTE, FLOOR(DATE_PART(MINUTE, {col}) / 15) * 15, \
                 DATE_TRUNC('HOUR', {col}))",
        "PT0.5H": "DATEADD(MINUTE, FLOOR(DATE_PART(MINUTE, {col}) / 30) * 30, \
                  DATE_TRUNC('HOUR', {col}))",
        "PT1H": "DATE_TRUNC('HOUR', {col})",
        "P1D": "DATE_TRUNC('DAY', {col})",
        "P1W": "DATE_TRUNC('WEEK', {col})",
        "P1M": "DATE_TRUNC('MONTH', {col})",
        "P0.25Y": "DATE_TRUNC('QUARTER', {col})",
        "P1Y": "DATE_TRUNC('YEAR', {col})",
    }

    @classmethod
    def adjust_database_uri(
        cls, uri: URL, selected_schema: Optional[str] = None
    ) -> None:
        database = uri.database
        if "/" in uri.database:
            database = uri.database.split("/")[0]
        if selected_schema:
            selected_schema = parse.quote(selected_schema, safe="")
            uri.database = database + "/" + selected_schema

    @classmethod
    def epoch_to_dttm(cls) -> str:
        return "DATEADD(S, {col}, '1970-01-01')"

    @classmethod
    def epoch_ms_to_dttm(cls) -> str:
        return "DATEADD(MS, {col}, '1970-01-01')"

    @classmethod
    def convert_dttm(cls, target_type: str, dttm: datetime) -> Optional[str]:
        tt = target_type.upper()
        if tt == utils.TemporalType.DATE:
            return f"TO_DATE('{dttm.date().isoformat()}')"
        if tt == utils.TemporalType.DATETIME:
            return f"""CAST('{dttm.isoformat(timespec="microseconds")}' AS DATETIME)"""
        if tt == utils.TemporalType.TIMESTAMP:
            return f"""TO_TIMESTAMP('{dttm.isoformat(timespec="microseconds")}')"""
        return None

    @staticmethod
    def mutate_db_for_connection_test(database: "Database") -> None:
        """
        By default, snowflake doesn't validate if the user/role has access to the chosen
        database.

        :param database: instance to be mutated
        """
        extra = json.loads(database.extra or "{}")
        engine_params = extra.get("engine_params", {})
        connect_args = engine_params.get("connect_args", {})
        connect_args["validate_default_parameters"] = True
        engine_params["connect_args"] = connect_args
        extra["engine_params"] = engine_params
        database.extra = json.dumps(extra)
