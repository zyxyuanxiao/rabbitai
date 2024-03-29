from unittest import mock

from rabbitai.db_engine_specs.sqlite import SqliteEngineSpec
from tests.db_engine_specs.base_tests import TestDbEngineSpec


class TestSQliteDbEngineSpec(TestDbEngineSpec):
    def test_convert_dttm(self):
        dttm = self.get_dttm()

        self.assertEqual(
            SqliteEngineSpec.convert_dttm("TEXT", dttm), "'2019-01-02 03:04:05.678900'"
        )

    def test_convert_dttm_lower(self):
        dttm = self.get_dttm()

        self.assertEqual(
            SqliteEngineSpec.convert_dttm("text", dttm), "'2019-01-02 03:04:05.678900'"
        )

    def test_convert_dttm_invalid_type(self):
        dttm = self.get_dttm()

        self.assertEqual(SqliteEngineSpec.convert_dttm("other", dttm), None)

    def test_get_all_datasource_names_table(self):
        database = mock.MagicMock()
        database.get_all_schema_names.return_value = ["schema1"]
        table_names = ["table1", "table2"]
        get_tables = mock.MagicMock(return_value=table_names)
        database.get_all_table_names_in_schema = get_tables
        result = SqliteEngineSpec.get_all_datasource_names(database, "table")
        assert result == table_names
        get_tables.assert_called_once_with(
            schema="schema1",
            force=True,
            cache=database.table_cache_enabled,
            cache_timeout=database.table_cache_timeout,
        )

    def test_get_all_datasource_names_view(self):
        database = mock.MagicMock()
        database.get_all_schema_names.return_value = ["schema1"]
        views_names = ["view1", "view2"]
        get_views = mock.MagicMock(return_value=views_names)
        database.get_all_view_names_in_schema = get_views
        result = SqliteEngineSpec.get_all_datasource_names(database, "view")
        assert result == views_names
        get_views.assert_called_once_with(
            schema="schema1",
            force=True,
            cache=database.table_cache_enabled,
            cache_timeout=database.table_cache_timeout,
        )

    def test_get_all_datasource_names_invalid_type(self):
        database = mock.MagicMock()
        database.get_all_schema_names.return_value = ["schema1"]
        invalid_type = "asdf"
        with self.assertRaises(Exception):
            SqliteEngineSpec.get_all_datasource_names(database, invalid_type)
