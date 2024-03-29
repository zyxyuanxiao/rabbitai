import datetime
from unittest import mock

import pytest

from rabbitai.db_engine_specs import get_engine_specs
from rabbitai.db_engine_specs.base import (
    BaseEngineSpec,
    BasicParametersMixin,
    builtin_time_grains,
    LimitMethod,
)
from rabbitai.db_engine_specs.mysql import MySQLEngineSpec
from rabbitai.db_engine_specs.sqlite import SqliteEngineSpec
from rabbitai.errors import ErrorLevel, RabbitaiError, RabbitaiErrorType
from rabbitai.sql_parse import ParsedQuery
from rabbitai.utils.core import get_example_database
from tests.db_engine_specs.base_tests import TestDbEngineSpec
from tests.test_app import app

from ..fixtures.energy_dashboard import load_energy_table_with_slice
from ..fixtures.pyodbcRow import Row


class TestDbEngineSpecs(TestDbEngineSpec):
    def test_extract_limit_from_query(self, engine_spec_class=BaseEngineSpec):
        q0 = "select * from table"
        q1 = "select * from mytable limit 10"
        q2 = "select * from (select * from my_subquery limit 10) where col=1 limit 20"
        q3 = "select * from (select * from my_subquery limit 10);"
        q4 = "select * from (select * from my_subquery limit 10) where col=1 limit 20;"
        q5 = "select * from mytable limit 20, 10"
        q6 = "select * from mytable limit 10 offset 20"
        q7 = "select * from mytable limit"
        q8 = "select * from mytable limit 10.0"
        q9 = "select * from mytable limit x"
        q10 = "select * from mytable limit 20, x"
        q11 = "select * from mytable limit x offset 20"

        self.assertEqual(engine_spec_class.get_limit_from_sql(q0), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q1), 10)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q2), 20)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q3), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q4), 20)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q5), 10)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q6), 10)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q7), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q8), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q9), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q10), None)
        self.assertEqual(engine_spec_class.get_limit_from_sql(q11), None)

    def test_wrapped_semi_tabs(self):
        self.sql_limit_regex(
            "SELECT * FROM a  \t \n   ; \t  \n  ", "SELECT * FROM a\nLIMIT 1000"
        )

    def test_simple_limit_query(self):
        self.sql_limit_regex("SELECT * FROM a", "SELECT * FROM a\nLIMIT 1000")

    def test_modify_limit_query(self):
        self.sql_limit_regex("SELECT * FROM a LIMIT 9999", "SELECT * FROM a LIMIT 1000")

    def test_limit_query_with_limit_subquery(self):  # pylint: disable=invalid-name
        self.sql_limit_regex(
            "SELECT * FROM (SELECT * FROM a LIMIT 10) LIMIT 9999",
            "SELECT * FROM (SELECT * FROM a LIMIT 10) LIMIT 1000",
        )

    def test_limit_query_without_force(self):
        self.sql_limit_regex(
            "SELECT * FROM a LIMIT 10", "SELECT * FROM a LIMIT 10", limit=11,
        )

    def test_limit_query_with_force(self):
        self.sql_limit_regex(
            "SELECT * FROM a LIMIT 10",
            "SELECT * FROM a LIMIT 11",
            limit=11,
            force=True,
        )

    def test_limit_with_expr(self):
        self.sql_limit_regex(
            """
            SELECT
                'LIMIT 777' AS a
                , b
            FROM
            table
            LIMIT 99990""",
            """SELECT
                'LIMIT 777' AS a
                , b
            FROM
            table
            LIMIT 1000""",
        )

    def test_limit_expr_and_semicolon(self):
        self.sql_limit_regex(
            """
                SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT         99990            ;""",
            """SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT         1000""",
        )

    def test_get_datatype(self):
        self.assertEqual("VARCHAR", BaseEngineSpec.get_datatype("VARCHAR"))

    def test_limit_with_implicit_offset(self):
        self.sql_limit_regex(
            """
                SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT 99990, 999999""",
            """SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT 99990, 1000""",
        )

    def test_limit_with_explicit_offset(self):
        self.sql_limit_regex(
            """
                SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT 99990
                OFFSET 999999""",
            """SELECT
                    'LIMIT 777' AS a
                    , b
                FROM
                table
                LIMIT 1000
                OFFSET 999999""",
        )

    def test_limit_with_non_token_limit(self):
        self.sql_limit_regex(
            """SELECT 'LIMIT 777'""", """SELECT 'LIMIT 777'\nLIMIT 1000"""
        )

    def test_limit_with_fetch_many(self):
        class DummyEngineSpec(BaseEngineSpec):
            limit_method = LimitMethod.FETCH_MANY

        self.sql_limit_regex(
            "SELECT * FROM table", "SELECT * FROM table", DummyEngineSpec
        )

    def test_engine_time_grain_validity(self):
        time_grains = set(builtin_time_grains.keys())
        # loop over all subclasses of BaseEngineSpec
        for engine in get_engine_specs().values():
            if engine is not BaseEngineSpec:
                # make sure time grain functions have been defined
                self.assertGreater(len(engine.get_time_grain_expressions()), 0)
                # make sure all defined time grains are supported
                defined_grains = {grain.duration for grain in engine.get_time_grains()}
                intersection = time_grains.intersection(defined_grains)
                self.assertSetEqual(defined_grains, intersection, engine)

    def test_get_time_grain_expressions(self):
        time_grains = MySQLEngineSpec.get_time_grain_expressions()
        self.assertEqual(
            list(time_grains.keys()),
            [
                None,
                "PT1S",
                "PT1M",
                "PT1H",
                "P1D",
                "P1W",
                "P1M",
                "P0.25Y",
                "P1Y",
                "1969-12-29T00:00:00Z/P1W",
            ],
        )

    def test_get_table_names(self):
        inspector = mock.Mock()
        inspector.get_table_names = mock.Mock(return_value=["schema.table", "table_2"])
        inspector.get_foreign_table_names = mock.Mock(return_value=["table_3"])

        """ Make sure base engine spec removes schema name from table name
        ie. when try_remove_schema_from_table_name == True. """
        base_result_expected = ["table", "table_2"]
        base_result = BaseEngineSpec.get_table_names(
            database=mock.ANY, schema="schema", inspector=inspector
        )
        self.assertListEqual(base_result_expected, base_result)

    @pytest.mark.usefixtures("load_energy_table_with_slice")
    def test_column_datatype_to_string(self):
        example_db = get_example_database()
        sqla_table = example_db.get_table("energy_usage")
        dialect = example_db.get_dialect()

        # TODO: fix column type conversion for presto.
        if example_db.backend == "presto":
            return

        col_names = [
            example_db.db_engine_spec.column_datatype_to_string(c.type, dialect)
            for c in sqla_table.columns
        ]
        if example_db.backend == "postgresql":
            expected = ["VARCHAR(255)", "VARCHAR(255)", "DOUBLE PRECISION"]
        elif example_db.backend == "hive":
            expected = ["STRING", "STRING", "FLOAT"]
        else:
            expected = ["VARCHAR(255)", "VARCHAR(255)", "FLOAT"]
        self.assertEqual(col_names, expected)

    def test_convert_dttm(self):
        dttm = self.get_dttm()
        self.assertIsNone(BaseEngineSpec.convert_dttm("", dttm))

    def test_pyodbc_rows_to_tuples(self):
        # Test for case when pyodbc.Row is returned (odbc driver)
        data = [
            Row((1, 1, datetime.datetime(2017, 10, 19, 23, 39, 16, 660000))),
            Row((2, 2, datetime.datetime(2018, 10, 19, 23, 39, 16, 660000))),
        ]
        expected = [
            (1, 1, datetime.datetime(2017, 10, 19, 23, 39, 16, 660000)),
            (2, 2, datetime.datetime(2018, 10, 19, 23, 39, 16, 660000)),
        ]
        result = BaseEngineSpec.pyodbc_rows_to_tuples(data)
        self.assertListEqual(result, expected)

    def test_pyodbc_rows_to_tuples_passthrough(self):
        # Test for case when tuples are returned
        data = [
            (1, 1, datetime.datetime(2017, 10, 19, 23, 39, 16, 660000)),
            (2, 2, datetime.datetime(2018, 10, 19, 23, 39, 16, 660000)),
        ]
        result = BaseEngineSpec.pyodbc_rows_to_tuples(data)
        self.assertListEqual(result, data)


def test_is_readonly():
    def is_readonly(sql: str) -> bool:
        return BaseEngineSpec.is_readonly_query(ParsedQuery(sql))

    assert is_readonly("SHOW LOCKS test EXTENDED")
    assert not is_readonly("SET hivevar:desc='Legislators'")
    assert not is_readonly("UPDATE t1 SET col1 = NULL")
    assert is_readonly("EXPLAIN SELECT 1")
    assert is_readonly("SELECT 1")
    assert is_readonly("WITH (SELECT 1) bla SELECT * from bla")
    assert is_readonly("SHOW CATALOGS")
    assert is_readonly("SHOW TABLES")


def test_time_grain_denylist():
    config = app.config.copy()
    app.config["TIME_GRAIN_DENYLIST"] = ["PT1M"]

    with app.app_context():
        time_grain_functions = SqliteEngineSpec.get_time_grain_expressions()
        assert not "PT1M" in time_grain_functions

    app.config = config


def test_time_grain_addons():
    config = app.config.copy()
    app.config["TIME_GRAIN_ADDONS"] = {"PTXM": "x seconds"}
    app.config["TIME_GRAIN_ADDON_EXPRESSIONS"] = {"sqlite": {"PTXM": "ABC({col})"}}

    with app.app_context():
        time_grains = SqliteEngineSpec.get_time_grains()
        time_grain_addon = time_grains[-1]
        assert "PTXM" == time_grain_addon.duration
        assert "x seconds" == time_grain_addon.label

    app.config = config


def test_get_time_grain_with_config():
    """ Should concatenate from configs and then sort in the proper order """
    config = app.config.copy()

    app.config["TIME_GRAIN_ADDON_EXPRESSIONS"] = {
        "mysql": {
            "PT2H": "foo",
            "PT4H": "foo",
            "PT6H": "foo",
            "PT8H": "foo",
            "PT10H": "foo",
            "PT12H": "foo",
            "PT1S": "foo",
        }
    }

    with app.app_context():
        time_grains = MySQLEngineSpec.get_time_grain_expressions()
        assert set(time_grains.keys()) == {
            None,
            "PT1S",
            "PT1M",
            "PT1H",
            "PT2H",
            "PT4H",
            "PT6H",
            "PT8H",
            "PT10H",
            "PT12H",
            "P1D",
            "P1W",
            "P1M",
            "P0.25Y",
            "P1Y",
            "1969-12-29T00:00:00Z/P1W",
        }

    app.config = config


def test_get_time_grain_with_unkown_values():
    """Should concatenate from configs and then sort in the proper order
    putting unknown patterns at the end"""
    config = app.config.copy()

    app.config["TIME_GRAIN_ADDON_EXPRESSIONS"] = {
        "mysql": {"PT2H": "foo", "weird": "foo", "PT12H": "foo",}
    }

    with app.app_context():
        time_grains = MySQLEngineSpec.get_time_grain_expressions()
        assert list(time_grains)[-1] == "weird"

    app.config = config


@mock.patch("rabbitai.db_engine_specs.base.is_hostname_valid")
@mock.patch("rabbitai.db_engine_specs.base.is_port_open")
def test_validate(is_port_open, is_hostname_valid):
    is_hostname_valid.return_value = True
    is_port_open.return_value = True

    parameters = {
        "host": "localhost",
        "port": 5432,
        "username": "username",
        "password": "password",
        "database": "dbname",
        "query": {"sslmode": "verify-full"},
    }
    errors = BasicParametersMixin.validate_parameters(parameters)
    assert errors == []


def test_validate_parameters_missing():
    parameters = {
        "host": "",
        "port": None,
        "username": "",
        "password": "",
        "database": "",
        "query": {},
    }
    errors = BasicParametersMixin.validate_parameters(parameters)
    assert errors == [
        RabbitaiError(
            message=(
                "One or more parameters are missing: " "database, host, port, username"
            ),
            error_type=RabbitaiErrorType.CONNECTION_MISSING_PARAMETERS_ERROR,
            level=ErrorLevel.WARNING,
            extra={"missing": ["database", "host", "port", "username"]},
        ),
    ]


@mock.patch("rabbitai.db_engine_specs.base.is_hostname_valid")
def test_validate_parameters_invalid_host(is_hostname_valid):
    is_hostname_valid.return_value = False

    parameters = {
        "host": "localhost",
        "port": None,
        "username": "username",
        "password": "password",
        "database": "dbname",
        "query": {"sslmode": "verify-full"},
    }
    errors = BasicParametersMixin.validate_parameters(parameters)
    assert errors == [
        RabbitaiError(
            message="One or more parameters are missing: port",
            error_type=RabbitaiErrorType.CONNECTION_MISSING_PARAMETERS_ERROR,
            level=ErrorLevel.WARNING,
            extra={"missing": ["port"]},
        ),
        RabbitaiError(
            message="The hostname provided can't be resolved.",
            error_type=RabbitaiErrorType.CONNECTION_INVALID_HOSTNAME_ERROR,
            level=ErrorLevel.ERROR,
            extra={"invalid": ["host"]},
        ),
    ]


@mock.patch("rabbitai.db_engine_specs.base.is_hostname_valid")
@mock.patch("rabbitai.db_engine_specs.base.is_port_open")
def test_validate_parameters_port_closed(is_port_open, is_hostname_valid):
    is_hostname_valid.return_value = True
    is_port_open.return_value = False

    parameters = {
        "host": "localhost",
        "port": 5432,
        "username": "username",
        "password": "password",
        "database": "dbname",
        "query": {"sslmode": "verify-full"},
    }
    errors = BasicParametersMixin.validate_parameters(parameters)
    assert errors == [
        RabbitaiError(
            message="The port is closed.",
            error_type=RabbitaiErrorType.CONNECTION_PORT_CLOSED_ERROR,
            level=ErrorLevel.ERROR,
            extra={
                "invalid": ["port"],
                "issue_codes": [
                    {"code": 1008, "message": "Issue 1008 - The port is closed."}
                ],
            },
        )
    ]
