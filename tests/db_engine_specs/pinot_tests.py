from sqlalchemy import column

from rabbitai.db_engine_specs.pinot import PinotEngineSpec
from tests.db_engine_specs.base_tests import TestDbEngineSpec


class TestPinotDbEngineSpec(TestDbEngineSpec):
    """ Tests pertaining to our Pinot database support """

    def test_pinot_time_expression_sec_one_1d_grain(self):
        col = column("tstamp")
        expr = PinotEngineSpec.get_timestamp_expr(col, "epoch_s", "P1D")
        result = str(expr.compile())
        self.assertEqual(
            result,
            "DATETIMECONVERT(tstamp, '1:SECONDS:EPOCH', '1:SECONDS:EPOCH', '1:DAYS')",
        )

    def test_pinot_time_expression_simple_date_format_1d_grain(self):
        col = column("tstamp")
        expr = PinotEngineSpec.get_timestamp_expr(col, "%Y-%m-%d %H:%M:%S", "P1D")
        result = str(expr.compile())
        self.assertEqual(
            result,
            (
                "DATETIMECONVERT(tstamp, "
                + "'1:SECONDS:SIMPLE_DATE_FORMAT:yyyy-MM-dd HH:mm:ss', "
                + "'1:SECONDS:SIMPLE_DATE_FORMAT:yyyy-MM-dd HH:mm:ss', '1:DAYS')"
            ),
        )

    def test_pinot_time_expression_simple_date_format_1w_grain(self):
        col = column("tstamp")
        expr = PinotEngineSpec.get_timestamp_expr(col, "%Y-%m-%d %H:%M:%S", "P1W")
        result = str(expr.compile())
        self.assertEqual(
            result,
            (
                "ToDateTime(DATETRUNC('week', FromDateTime(tstamp, "
                + "'yyyy-MM-dd HH:mm:ss'), 'MILLISECONDS'), 'yyyy-MM-dd HH:mm:ss')"
            ),
        )

    def test_pinot_time_expression_sec_one_1m_grain(self):
        col = column("tstamp")
        expr = PinotEngineSpec.get_timestamp_expr(col, "epoch_s", "P1M")
        result = str(expr.compile())
        self.assertEqual(
            result, "DATETRUNC('month', tstamp, 'SECONDS')",
        )

    def test_invalid_get_time_expression_arguments(self):
        with self.assertRaises(NotImplementedError):
            PinotEngineSpec.get_timestamp_expr(column("tstamp"), None, "P1M")

        with self.assertRaises(NotImplementedError):
            PinotEngineSpec.get_timestamp_expr(
                column("tstamp"), "epoch_s", "invalid_grain"
            )
