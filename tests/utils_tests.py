# isort:skip_file
import unittest
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import json
import os
import re
from typing import Any, Tuple, List, Optional
from unittest.mock import Mock, patch
from tests.fixtures.birth_names_dashboard import load_birth_names_dashboard_with_slices

import numpy as np
import pandas as pd
import pytest
from flask import Flask, g
import marshmallow
from sqlalchemy.exc import ArgumentError

import tests.test_app
from rabbitai import app, db, security_manager
from rabbitai.exceptions import CertificateException, RabbitaiException
from rabbitai.models.core import Database, Log
from rabbitai.models.dashboard import Dashboard
from rabbitai.models.slice import Slice
from rabbitai.utils.core import (
    base_json_conv,
    cast_to_num,
    convert_legacy_filters_into_adhoc,
    create_ssl_cert_file,
    DTTM_ALIAS,
    format_timedelta,
    GenericDataType,
    get_form_data_token,
    get_iterable,
    get_email_address_list,
    get_or_create_db,
    get_stacktrace,
    json_int_dttm_ser,
    json_iso_dttm_ser,
    JSONEncodedDict,
    memoized,
    merge_extra_filters,
    merge_extra_form_data,
    merge_request_params,
    normalize_dttm_col,
    parse_ssl_cert,
    parse_js_uri_path_item,
    extract_dataframe_dtypes,
    split,
    TimeRangeEndpoint,
    validate_json,
    zlib_compress,
    zlib_decompress,
)
from rabbitai.utils import schema
from rabbitai.utils.hashing import md5_sha_from_str
from rabbitai.views.utils import (
    build_extra_filters,
    get_form_data,
    get_time_range_endpoints,
)
from tests.base_tests import RabbitaiTestCase
from tests.fixtures.world_bank_dashboard import load_world_bank_dashboard_with_slices

from .fixtures.certificates import ssl_certificate


def mock_to_adhoc(filt, expressionType="SIMPLE", clause="where"):
    result = {"clause": clause.upper(), "expressionType": expressionType}

    if expressionType == "SIMPLE":
        result.update(
            {"comparator": filt["val"], "operator": filt["op"], "subject": filt["col"]}
        )
    elif expressionType == "SQL":
        result.update({"sqlExpression": filt[clause]})

    return result


class TestUtils(RabbitaiTestCase):
    def test_json_int_dttm_ser(self):
        dttm = datetime(2020, 1, 1)
        ts = 1577836800000.0
        assert json_int_dttm_ser(dttm) == ts
        assert json_int_dttm_ser(date(2020, 1, 1)) == ts
        assert json_int_dttm_ser(datetime(1970, 1, 1)) == 0
        assert json_int_dttm_ser(date(1970, 1, 1)) == 0
        assert json_int_dttm_ser(dttm + timedelta(milliseconds=1)) == (ts + 1)

        with self.assertRaises(TypeError):
            json_int_dttm_ser("this is not a date")

    def test_json_iso_dttm_ser(self):
        dttm = datetime(2020, 1, 1)
        dt = date(2020, 1, 1)
        t = time()
        assert json_iso_dttm_ser(dttm) == dttm.isoformat()
        assert json_iso_dttm_ser(dt) == dt.isoformat()
        assert json_iso_dttm_ser(t) == t.isoformat()

        with self.assertRaises(TypeError):
            json_iso_dttm_ser("this is not a date")

    def test_base_json_conv(self):
        assert isinstance(base_json_conv(np.bool_(1)), bool) is True
        assert isinstance(base_json_conv(np.int64(1)), int) is True
        assert isinstance(base_json_conv(np.array([1, 2, 3])), list) is True
        assert isinstance(base_json_conv(set([1])), list) is True
        assert isinstance(base_json_conv(Decimal("1.0")), float) is True
        assert isinstance(base_json_conv(uuid.uuid4()), str) is True
        assert isinstance(base_json_conv(timedelta(0)), str) is True

    def test_zlib_compression(self):
        json_str = '{"test": 1}'
        blob = zlib_compress(json_str)
        got_str = zlib_decompress(blob)
        self.assertEqual(json_str, got_str)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters(self):
        # does nothing if no extra filters
        form_data = {"A": 1, "B": 2, "c": "test"}
        expected = {**form_data, "adhoc_filters": [], "applied_time_extras": {}}
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)
        # empty extra_filters
        form_data = {"A": 1, "B": 2, "c": "test", "extra_filters": []}
        expected = {
            "A": 1,
            "B": 2,
            "c": "test",
            "adhoc_filters": [],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)
        # copy over extra filters into empty filters
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": "someval"},
                {"col": "B", "op": "==", "val": ["c1", "c2"]},
            ]
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)
        # adds extra filters to existing filters
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": "someval"},
                {"col": "B", "op": "==", "val": ["c1", "c2"]},
            ],
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["G1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "!=",
                    "subject": "D",
                }
            ],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["G1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "!=",
                    "subject": "D",
                },
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)
        # adds extra filters to existing filters and sets time options
        form_data = {
            "extra_filters": [
                {"col": "__time_range", "op": "in", "val": "1 year ago :"},
                {"col": "__time_col", "op": "in", "val": "birth_year"},
                {"col": "__time_grain", "op": "in", "val": "years"},
                {"col": "A", "op": "like", "val": "hello"},
                {"col": "__time_origin", "op": "in", "val": "now"},
                {"col": "__granularity", "op": "in", "val": "90 seconds"},
            ]
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "hello",
                    "expressionType": "SIMPLE",
                    "operator": "like",
                    "subject": "A",
                }
            ],
            "time_range": "1 year ago :",
            "granularity_sqla": "birth_year",
            "time_grain_sqla": "years",
            "granularity": "90 seconds",
            "druid_time_origin": "now",
            "applied_time_extras": {
                "__time_range": "1 year ago :",
                "__time_col": "birth_year",
                "__time_grain": "years",
                "__time_origin": "now",
                "__granularity": "90 seconds",
            },
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters_ignores_empty_filters(self):
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": ""},
                {"col": "B", "op": "==", "val": []},
            ]
        }
        expected = {"adhoc_filters": [], "applied_time_extras": {}}
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters_ignores_nones(self):
        form_data = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": None,
                }
            ],
            "extra_filters": [{"col": "B", "op": "==", "val": []}],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": None,
                }
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters_ignores_equal_filters(self):
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": "someval"},
                {"col": "B", "op": "==", "val": ["c1", "c2"]},
                {"col": "c", "op": "in", "val": ["c1", 1, None]},
            ],
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", 1, None],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "c",
                },
            ],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", 1, None],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "c",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters_merges_different_val_types(self):
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": ["g1", "g2"]},
                {"col": "B", "op": "==", "val": ["c1", "c2"]},
            ],
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": "someval"},
                {"col": "B", "op": "==", "val": ["c1", "c2"]},
            ],
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_merge_extra_filters_adds_unequal_lists(self):
        form_data = {
            "extra_filters": [
                {"col": "a", "op": "in", "val": ["g1", "g2", "g3"]},
                {"col": "B", "op": "==", "val": ["c1", "c2", "c3"]},
            ],
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
        }
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["g1", "g2", "g3"],
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                },
                {
                    "clause": "WHERE",
                    "comparator": ["c1", "c2", "c3"],
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "B",
                },
            ],
            "applied_time_extras": {},
        }
        merge_extra_filters(form_data)
        self.assertEqual(form_data, expected)

    def test_merge_request_params_when_url_params_undefined(self):
        form_data = {"since": "2000", "until": "now"}
        url_params = {"form_data": form_data, "dashboard_ids": "(1,2,3,4,5)"}
        merge_request_params(form_data, url_params)
        self.assertIn("url_params", form_data.keys())
        self.assertIn("dashboard_ids", form_data["url_params"])
        self.assertNotIn("form_data", form_data.keys())

    def test_merge_request_params_when_url_params_predefined(self):
        form_data = {
            "since": "2000",
            "until": "now",
            "url_params": {"abc": "123", "dashboard_ids": "(1,2,3)"},
        }
        url_params = {"form_data": form_data, "dashboard_ids": "(1,2,3,4,5)"}
        merge_request_params(form_data, url_params)
        self.assertIn("url_params", form_data.keys())
        self.assertIn("abc", form_data["url_params"])
        self.assertEqual(
            url_params["dashboard_ids"], form_data["url_params"]["dashboard_ids"]
        )

    def test_format_timedelta(self):
        self.assertEqual(format_timedelta(timedelta(0)), "0:00:00")
        self.assertEqual(format_timedelta(timedelta(days=1)), "1 day, 0:00:00")
        self.assertEqual(format_timedelta(timedelta(minutes=-6)), "-0:06:00")
        self.assertEqual(
            format_timedelta(timedelta(0) - timedelta(days=1, hours=5, minutes=6)),
            "-1 day, 5:06:00",
        )
        self.assertEqual(
            format_timedelta(timedelta(0) - timedelta(days=16, hours=4, minutes=3)),
            "-16 days, 4:03:00",
        )

    def test_json_encoded_obj(self):
        obj = {"a": 5, "b": ["a", "g", 5]}
        val = '{"a": 5, "b": ["a", "g", 5]}'
        jsonObj = JSONEncodedDict()
        resp = jsonObj.process_bind_param(obj, "dialect")
        self.assertIn('"a": 5', resp)
        self.assertIn('"b": ["a", "g", 5]', resp)
        self.assertEqual(jsonObj.process_result_value(val, "dialect"), obj)

    def test_validate_json(self):
        valid = '{"a": 5, "b": [1, 5, ["g", "h"]]}'
        self.assertIsNone(validate_json(valid))
        invalid = '{"a": 5, "b": [1, 5, ["g", "h]]}'
        with self.assertRaises(RabbitaiException):
            validate_json(invalid)

    def test_memoized_on_functions(self):
        watcher = {"val": 0}

        @memoized
        def test_function(a, b, c):
            watcher["val"] += 1
            return a * b * c

        result1 = test_function(1, 2, 3)
        result2 = test_function(1, 2, 3)
        self.assertEqual(result1, result2)
        self.assertEqual(watcher["val"], 1)

    def test_memoized_on_methods(self):
        class test_class:
            def __init__(self, num):
                self.num = num
                self.watcher = 0

            @memoized
            def test_method(self, a, b, c):
                self.watcher += 1
                return a * b * c * self.num

        instance = test_class(5)
        result1 = instance.test_method(1, 2, 3)
        result2 = instance.test_method(1, 2, 3)
        self.assertEqual(result1, result2)
        self.assertEqual(instance.watcher, 1)
        instance.num = 10
        self.assertEqual(result2, instance.test_method(1, 2, 3))

    def test_memoized_on_methods_with_watches(self):
        class test_class:
            def __init__(self, x, y):
                self.x = x
                self.y = y
                self.watcher = 0

            @memoized(watch=("x", "y"))
            def test_method(self, a, b, c):
                self.watcher += 1
                return a * b * c * self.x * self.y

        instance = test_class(3, 12)
        result1 = instance.test_method(1, 2, 3)
        result2 = instance.test_method(1, 2, 3)
        self.assertEqual(result1, result2)
        self.assertEqual(instance.watcher, 1)
        result3 = instance.test_method(2, 3, 4)
        self.assertEqual(instance.watcher, 2)
        result4 = instance.test_method(2, 3, 4)
        self.assertEqual(instance.watcher, 2)
        self.assertEqual(result3, result4)
        self.assertNotEqual(result3, result1)
        instance.x = 1
        result5 = instance.test_method(2, 3, 4)
        self.assertEqual(instance.watcher, 3)
        self.assertNotEqual(result5, result4)
        result6 = instance.test_method(2, 3, 4)
        self.assertEqual(instance.watcher, 3)
        self.assertEqual(result6, result5)
        instance.x = 10
        instance.y = 10
        result7 = instance.test_method(2, 3, 4)
        self.assertEqual(instance.watcher, 4)
        self.assertNotEqual(result7, result6)
        instance.x = 3
        instance.y = 12
        result8 = instance.test_method(1, 2, 3)
        self.assertEqual(instance.watcher, 4)
        self.assertEqual(result1, result8)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_where(self):
        form_data = {"where": "a = 1"}
        expected = {
            "adhoc_filters": [
                {"clause": "WHERE", "expressionType": "SQL", "sqlExpression": "a = 1"}
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_filters(self):
        form_data = {"filters": [{"col": "a", "op": "in", "val": "someval"}]}
        expected = {
            "adhoc_filters": [
                {
                    "clause": "WHERE",
                    "comparator": "someval",
                    "expressionType": "SIMPLE",
                    "operator": "in",
                    "subject": "a",
                }
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_having(self):
        form_data = {"having": "COUNT(1) = 1"}
        expected = {
            "adhoc_filters": [
                {
                    "clause": "HAVING",
                    "expressionType": "SQL",
                    "sqlExpression": "COUNT(1) = 1",
                }
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_having_filters(self):
        form_data = {"having_filters": [{"col": "COUNT(1)", "op": "==", "val": 1}]}
        expected = {
            "adhoc_filters": [
                {
                    "clause": "HAVING",
                    "comparator": 1,
                    "expressionType": "SIMPLE",
                    "operator": "==",
                    "subject": "COUNT(1)",
                }
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_present_and_empty(self):
        form_data = {"adhoc_filters": [], "where": "a = 1"}
        expected = {
            "adhoc_filters": [
                {"clause": "WHERE", "expressionType": "SQL", "sqlExpression": "a = 1"}
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    @patch("rabbitai.utils.core.to_adhoc", mock_to_adhoc)
    def test_convert_legacy_filters_into_adhoc_present_and_nonempty(self):
        form_data = {
            "adhoc_filters": [
                {"clause": "WHERE", "expressionType": "SQL", "sqlExpression": "a = 1"}
            ],
            "filters": [{"col": "a", "op": "in", "val": "someval"}],
            "having": "COUNT(1) = 1",
            "having_filters": [{"col": "COUNT(1)", "op": "==", "val": 1}],
        }
        expected = {
            "adhoc_filters": [
                {"clause": "WHERE", "expressionType": "SQL", "sqlExpression": "a = 1"}
            ]
        }
        convert_legacy_filters_into_adhoc(form_data)
        self.assertEqual(form_data, expected)

    def test_parse_js_uri_path_items_eval_undefined(self):
        self.assertIsNone(parse_js_uri_path_item("undefined", eval_undefined=True))
        self.assertIsNone(parse_js_uri_path_item("null", eval_undefined=True))
        self.assertEqual("undefined", parse_js_uri_path_item("undefined"))
        self.assertEqual("null", parse_js_uri_path_item("null"))

    def test_parse_js_uri_path_items_unquote(self):
        self.assertEqual("slashed/name", parse_js_uri_path_item("slashed%2fname"))
        self.assertEqual(
            "slashed%2fname", parse_js_uri_path_item("slashed%2fname", unquote=False)
        )

    def test_parse_js_uri_path_items_item_optional(self):
        self.assertIsNone(parse_js_uri_path_item(None))
        self.assertIsNotNone(parse_js_uri_path_item("item"))

    def test_get_stacktrace(self):
        with app.app_context():
            app.config["SHOW_STACKTRACE"] = True
            try:
                raise Exception("NONONO!")
            except Exception:
                stacktrace = get_stacktrace()
                self.assertIn("NONONO", stacktrace)

            app.config["SHOW_STACKTRACE"] = False
            try:
                raise Exception("NONONO!")
            except Exception:
                stacktrace = get_stacktrace()
                assert stacktrace is None

    def test_split(self):
        self.assertEqual(list(split("a b")), ["a", "b"])
        self.assertEqual(list(split("a,b", delimiter=",")), ["a", "b"])
        self.assertEqual(list(split("a,(b,a)", delimiter=",")), ["a", "(b,a)"])
        self.assertEqual(
            list(split('a,(b,a),"foo , bar"', delimiter=",")),
            ["a", "(b,a)", '"foo , bar"'],
        )
        self.assertEqual(
            list(split("a,'b,c'", delimiter=",", quote="'")), ["a", "'b,c'"]
        )
        self.assertEqual(list(split('a "b c"')), ["a", '"b c"'])
        self.assertEqual(list(split(r'a "b \" c"')), ["a", r'"b \" c"'])

    def test_get_or_create_db(self):
        get_or_create_db("test_db", "sqlite:///rabbitai.db")
        database = db.session.query(Database).filter_by(database_name="test_db").one()
        self.assertIsNotNone(database)
        self.assertEqual(database.sqlalchemy_uri, "sqlite:///rabbitai.db")
        self.assertIsNotNone(
            security_manager.find_permission_view_menu("database_access", database.perm)
        )
        # Test change URI
        get_or_create_db("test_db", "sqlite:///changed.db")
        database = db.session.query(Database).filter_by(database_name="test_db").one()
        self.assertEqual(database.sqlalchemy_uri, "sqlite:///changed.db")
        db.session.delete(database)
        db.session.commit()

    def test_get_or_create_db_invalid_uri(self):
        with self.assertRaises(ArgumentError):
            get_or_create_db("test_db", "yoursql:rabbitai.db/()")

    def test_get_time_range_endpoints(self):
        self.assertEqual(
            get_time_range_endpoints(form_data={}),
            (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.EXCLUSIVE),
        )

        self.assertEqual(
            get_time_range_endpoints(
                form_data={"time_range_endpoints": ["inclusive", "inclusive"]}
            ),
            (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.INCLUSIVE),
        )

        self.assertEqual(
            get_time_range_endpoints(form_data={"datasource": "1_druid"}),
            (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.EXCLUSIVE),
        )

        slc = Mock()
        slc.datasource.database.get_extra.return_value = {}

        self.assertEqual(
            get_time_range_endpoints(form_data={"datasource": "1__table"}, slc=slc),
            (TimeRangeEndpoint.UNKNOWN, TimeRangeEndpoint.INCLUSIVE),
        )

        slc.datasource.database.get_extra.return_value = {
            "time_range_endpoints": ["inclusive", "inclusive"]
        }

        self.assertEqual(
            get_time_range_endpoints(form_data={"datasource": "1__table"}, slc=slc),
            (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.INCLUSIVE),
        )

        self.assertIsNone(get_time_range_endpoints(form_data={}, slc=slc))

        with app.app_context():
            app.config["SIP_15_GRACE_PERIOD_END"] = date.today() + timedelta(days=1)

            self.assertEqual(
                get_time_range_endpoints(form_data={"datasource": "1__table"}, slc=slc),
                (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.INCLUSIVE),
            )

            app.config["SIP_15_GRACE_PERIOD_END"] = date.today()

            self.assertEqual(
                get_time_range_endpoints(form_data={"datasource": "1__table"}, slc=slc),
                (TimeRangeEndpoint.INCLUSIVE, TimeRangeEndpoint.EXCLUSIVE),
            )

    def test_get_iterable(self):
        self.assertListEqual(get_iterable(123), [123])
        self.assertListEqual(get_iterable([123]), [123])
        self.assertListEqual(get_iterable("foo"), ["foo"])

    @pytest.mark.usefixtures("load_world_bank_dashboard_with_slices")
    def test_build_extra_filters(self):
        world_health = db.session.query(Dashboard).filter_by(slug="world_health").one()
        layout = json.loads(world_health.position_json)
        filter_ = db.session.query(Slice).filter_by(slice_name="Region Filter").one()
        world = db.session.query(Slice).filter_by(slice_name="World's Population").one()
        box_plot = db.session.query(Slice).filter_by(slice_name="Box plot").one()
        treemap = db.session.query(Slice).filter_by(slice_name="Treemap").one()

        filter_scopes = {
            str(filter_.id): {
                "region": {"scope": ["ROOT_ID"], "immune": [treemap.id]},
                "country_name": {
                    "scope": ["ROOT_ID"],
                    "immune": [treemap.id, box_plot.id],
                },
            }
        }

        default_filters = {
            str(filter_.id): {
                "region": ["North America"],
                "country_name": ["United States"],
            }
        }

        # immune to all filters
        assert (
            build_extra_filters(layout, filter_scopes, default_filters, treemap.id)
            == []
        )

        # in scope
        assert build_extra_filters(
            layout, filter_scopes, default_filters, world.id
        ) == [
            {"col": "region", "op": "==", "val": "North America"},
            {"col": "country_name", "op": "in", "val": ["United States"]},
        ]

        assert build_extra_filters(
            layout, filter_scopes, default_filters, box_plot.id
        ) == [{"col": "region", "op": "==", "val": "North America"}]

    def test_merge_extra_filters_with_no_extras(self):
        form_data = {
            "time_range": "Last 10 days",
        }
        merge_extra_form_data(form_data)
        self.assertEqual(
            form_data, {"time_range": "Last 10 days", "adhoc_filters": [],},
        )

    def test_merge_extra_filters_with_extras(self):
        form_data = {
            "time_range": "Last 10 days",
            "extra_form_data": {
                "filters": [{"col": "foo", "op": "IN", "val": ["bar"]}],
                "adhoc_filters": [
                    {
                        "expressionType": "SQL",
                        "clause": "WHERE",
                        "sqlExpression": "1 = 0",
                    }
                ],
                "time_range": "Last 100 years",
                "time_grain_sqla": "PT1M",
                "relative_start": "now",
            },
        }
        merge_extra_form_data(form_data)
        adhoc_filters = form_data["adhoc_filters"]
        assert adhoc_filters[0] == {
            "clause": "WHERE",
            "expressionType": "SQL",
            "isExtra": True,
            "sqlExpression": "1 = 0",
        }
        converted_filter = adhoc_filters[1]
        del converted_filter["filterOptionName"]
        assert converted_filter == {
            "clause": "WHERE",
            "comparator": ["bar"],
            "expressionType": "SIMPLE",
            "isExtra": True,
            "operator": "IN",
            "subject": "foo",
        }
        assert form_data["time_range"] == "Last 100 years"
        assert form_data["time_grain_sqla"] == "PT1M"
        assert form_data["extras"]["relative_start"] == "now"

    def test_ssl_certificate_parse(self):
        parsed_certificate = parse_ssl_cert(ssl_certificate)
        self.assertEqual(parsed_certificate.serial_number, 12355228710836649848)
        self.assertRaises(CertificateException, parse_ssl_cert, "abc" + ssl_certificate)

    def test_ssl_certificate_file_creation(self):
        path = create_ssl_cert_file(ssl_certificate)
        expected_filename = md5_sha_from_str(ssl_certificate)
        self.assertIn(expected_filename, path)
        self.assertTrue(os.path.exists(path))

    def test_get_email_address_list(self):
        self.assertEqual(get_email_address_list("a@a"), ["a@a"])
        self.assertEqual(get_email_address_list(" a@a "), ["a@a"])
        self.assertEqual(get_email_address_list("a@a\n"), ["a@a"])
        self.assertEqual(get_email_address_list(",a@a;"), ["a@a"])
        self.assertEqual(
            get_email_address_list(",a@a; b@b c@c a-c@c; d@d, f@f"),
            ["a@a", "b@b", "c@c", "a-c@c", "d@d", "f@f"],
        )

    def test_get_form_data_default(self) -> None:
        with app.test_request_context():
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {"time_range_endpoints": get_time_range_endpoints(form_data={})},
            )

            self.assertEqual(slc, None)

    def test_get_form_data_request_args(self) -> None:
        with app.test_request_context(
            query_string={"form_data": json.dumps({"foo": "bar"})}
        ):
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {
                    "foo": "bar",
                    "time_range_endpoints": get_time_range_endpoints(form_data={}),
                },
            )

            self.assertEqual(slc, None)

    def test_get_form_data_request_form(self) -> None:
        with app.test_request_context(data={"form_data": json.dumps({"foo": "bar"})}):
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {
                    "foo": "bar",
                    "time_range_endpoints": get_time_range_endpoints(form_data={}),
                },
            )

            self.assertEqual(slc, None)

    def test_get_form_data_request_form_with_queries(self) -> None:
        # the CSV export uses for requests, even when sending requests to
        # /api/v1/chart/data
        with app.test_request_context(
            data={
                "form_data": json.dumps({"queries": [{"url_params": {"foo": "bar"}}]})
            }
        ):
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {
                    "url_params": {"foo": "bar"},
                    "time_range_endpoints": get_time_range_endpoints(form_data={}),
                },
            )

            self.assertEqual(slc, None)

    def test_get_form_data_request_args_and_form(self) -> None:
        with app.test_request_context(
            data={"form_data": json.dumps({"foo": "bar"})},
            query_string={"form_data": json.dumps({"baz": "bar"})},
        ):
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {
                    "baz": "bar",
                    "foo": "bar",
                    "time_range_endpoints": get_time_range_endpoints(form_data={}),
                },
            )

            self.assertEqual(slc, None)

    def test_get_form_data_globals(self) -> None:
        with app.test_request_context():
            g.form_data = {"foo": "bar"}
            form_data, slc = get_form_data()
            delattr(g, "form_data")

            self.assertEqual(
                form_data,
                {
                    "foo": "bar",
                    "time_range_endpoints": get_time_range_endpoints(form_data={}),
                },
            )

            self.assertEqual(slc, None)

    def test_get_form_data_corrupted_json(self) -> None:
        with app.test_request_context(
            data={"form_data": "{x: '2324'}"},
            query_string={"form_data": '{"baz": "bar"'},
        ):
            form_data, slc = get_form_data()

            self.assertEqual(
                form_data,
                {"time_range_endpoints": get_time_range_endpoints(form_data={})},
            )

            self.assertEqual(slc, None)

    @pytest.mark.usefixtures("load_birth_names_dashboard_with_slices")
    def test_log_this(self) -> None:
        # TODO: Add additional scenarios.
        self.login(username="admin")
        slc = self.get_slice("Girls", db.session)
        dashboard_id = 1

        resp = self.get_json_resp(
            f"/rabbitai/explore_json/{slc.datasource_type}/{slc.datasource_id}/"
            + f'?form_data={{"slice_id": {slc.id}}}&dashboard_id={dashboard_id}',
            {"form_data": json.dumps(slc.viz.form_data)},
        )

        record = (
            db.session.query(Log)
            .filter_by(action="explore_json", slice_id=slc.id)
            .order_by(Log.dttm.desc())
            .first()
        )

        self.assertEqual(record.dashboard_id, dashboard_id)
        self.assertEqual(json.loads(record.json)["dashboard_id"], str(dashboard_id))
        self.assertEqual(json.loads(record.json)["form_data"]["slice_id"], slc.id)

        self.assertEqual(
            json.loads(record.json)["form_data"]["viz_type"],
            slc.viz.form_data["viz_type"],
        )

    def test_schema_validate_json(self):
        valid = '{"a": 5, "b": [1, 5, ["g", "h"]]}'
        self.assertIsNone(schema.validate_json(valid))
        invalid = '{"a": 5, "b": [1, 5, ["g", "h]]}'
        self.assertRaises(marshmallow.ValidationError, schema.validate_json, invalid)

    def test_schema_one_of_case_insensitive(self):
        validator = schema.OneOfCaseInsensitive(choices=[1, 2, 3, "FoO", "BAR", "baz"])
        self.assertEqual(1, validator(1))
        self.assertEqual(2, validator(2))
        self.assertEqual("FoO", validator("FoO"))
        self.assertEqual("FOO", validator("FOO"))
        self.assertEqual("bar", validator("bar"))
        self.assertEqual("BaZ", validator("BaZ"))
        self.assertRaises(marshmallow.ValidationError, validator, "qwerty")
        self.assertRaises(marshmallow.ValidationError, validator, 4)

    def test_cast_to_num(self) -> None:
        assert cast_to_num("5") == 5
        assert cast_to_num("5.2") == 5.2
        assert cast_to_num(10) == 10
        assert cast_to_num(10.1) == 10.1
        assert cast_to_num(None) is None
        assert cast_to_num("this is not a string") is None

    def test_get_form_data_token(self):
        assert get_form_data_token({"token": "token_abcdefg1"}) == "token_abcdefg1"
        generated_token = get_form_data_token({})
        assert re.match(r"^token_[a-z0-9]{8}$", generated_token) is not None

    def test_extract_dataframe_dtypes(self):
        cols: Tuple[Tuple[str, GenericDataType, List[Any]], ...] = (
            ("dt", GenericDataType.TEMPORAL, [date(2021, 2, 4), date(2021, 2, 4)]),
            (
                "dttm",
                GenericDataType.TEMPORAL,
                [datetime(2021, 2, 4, 1, 1, 1), datetime(2021, 2, 4, 1, 1, 1)],
            ),
            ("str", GenericDataType.STRING, ["foo", "foo"]),
            ("int", GenericDataType.NUMERIC, [1, 1]),
            ("float", GenericDataType.NUMERIC, [0.5, 0.5]),
            ("mixed-int-float", GenericDataType.NUMERIC, [0.5, 1.0]),
            ("bool", GenericDataType.BOOLEAN, [True, False]),
            ("mixed-str-int", GenericDataType.STRING, ["abc", 1.0]),
            ("obj", GenericDataType.STRING, [{"a": 1}, {"a": 1}]),
            ("dt_null", GenericDataType.TEMPORAL, [None, date(2021, 2, 4)]),
            (
                "dttm_null",
                GenericDataType.TEMPORAL,
                [None, datetime(2021, 2, 4, 1, 1, 1)],
            ),
            ("str_null", GenericDataType.STRING, [None, "foo"]),
            ("int_null", GenericDataType.NUMERIC, [None, 1]),
            ("float_null", GenericDataType.NUMERIC, [None, 0.5]),
            ("bool_null", GenericDataType.BOOLEAN, [None, False]),
            ("obj_null", GenericDataType.STRING, [None, {"a": 1}]),
        )

        df = pd.DataFrame(data={col[0]: col[2] for col in cols})
        assert extract_dataframe_dtypes(df) == [col[1] for col in cols]

    def test_normalize_dttm_col(self):
        def normalize_col(
            df: pd.DataFrame,
            timestamp_format: Optional[str],
            offset: int,
            time_shift: Optional[timedelta],
        ) -> pd.DataFrame:
            df = df.copy()
            normalize_dttm_col(df, timestamp_format, offset, time_shift)
            return df

        ts = pd.Timestamp(2021, 2, 15, 19, 0, 0, 0)
        df = pd.DataFrame([{"__timestamp": ts, "a": 1}])

        # test regular (non-numeric) format
        assert normalize_col(df, None, 0, None)[DTTM_ALIAS][0] == ts
        assert normalize_col(df, "epoch_ms", 0, None)[DTTM_ALIAS][0] == ts
        assert normalize_col(df, "epoch_s", 0, None)[DTTM_ALIAS][0] == ts

        # test offset
        assert normalize_col(df, None, 1, None)[DTTM_ALIAS][0] == pd.Timestamp(
            2021, 2, 15, 20, 0, 0, 0
        )

        # test offset and timedelta
        assert normalize_col(df, None, 1, timedelta(minutes=30))[DTTM_ALIAS][
            0
        ] == pd.Timestamp(2021, 2, 15, 20, 30, 0, 0)

        # test numeric epoch_s format
        df = pd.DataFrame([{"__timestamp": ts.timestamp(), "a": 1}])
        assert normalize_col(df, "epoch_s", 0, None)[DTTM_ALIAS][0] == ts

        # test numeric epoch_ms format
        df = pd.DataFrame([{"__timestamp": ts.timestamp() * 1000, "a": 1}])
        assert normalize_col(df, "epoch_ms", 0, None)[DTTM_ALIAS][0] == ts
