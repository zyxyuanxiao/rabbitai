import datetime

import pandas as pd
from sqlalchemy import BigInteger, Date, String
from sqlalchemy.sql import column

from rabbitai import db
from rabbitai.connectors.sqla.models import SqlMetric
from rabbitai.models.slice import Slice
from rabbitai.utils import core as utils

from .helpers import (
    get_example_data,
    get_slice_json,
    merge_slice,
    misc_dash_slices,
    TBL,
)


def load_country_map_data(only_metadata: bool = False, force: bool = False) -> None:
    """Loading data for map with country map"""
    tbl_name = "birth_france_by_region"
    database = utils.get_example_database()
    table_exists = database.has_table_by_name(tbl_name)

    if not only_metadata and (not table_exists or force):
        csv_bytes = get_example_data(
            "birth_france_data_for_country_map.csv", is_gzip=False, make_bytes=True
        )
        data = pd.read_csv(csv_bytes, encoding="utf-8")
        data["dttm"] = datetime.datetime.now().date()
        data.to_sql(  # pylint: disable=no-member
            tbl_name,
            database.get_sqla_engine(),
            if_exists="replace",
            chunksize=500,
            dtype={
                "DEPT_ID": String(10),
                "2003": BigInteger,
                "2004": BigInteger,
                "2005": BigInteger,
                "2006": BigInteger,
                "2007": BigInteger,
                "2008": BigInteger,
                "2009": BigInteger,
                "2010": BigInteger,
                "2011": BigInteger,
                "2012": BigInteger,
                "2013": BigInteger,
                "2014": BigInteger,
                "dttm": Date(),
            },
            index=False,
        )
        print("Done loading table!")
        print("-" * 80)

    print("Creating table reference")
    obj = db.session.query(TBL).filter_by(table_name=tbl_name).first()
    if not obj:
        obj = TBL(table_name=tbl_name)
    obj.main_dttm_col = "dttm"
    obj.database = database
    if not any(col.metric_name == "avg__2004" for col in obj.metrics):
        col = str(column("2004").compile(db.engine))
        obj.metrics.append(SqlMetric(metric_name="avg__2004", expression=f"AVG({col})"))
    db.session.merge(obj)
    db.session.commit()
    obj.fetch_metadata()
    tbl = obj

    slice_data = {
        "granularity_sqla": "",
        "since": "",
        "until": "",
        "viz_type": "country_map",
        "entity": "DEPT_ID",
        "metric": {
            "expressionType": "SIMPLE",
            "column": {"type": "INT", "column_name": "2004"},
            "aggregate": "AVG",
            "label": "Boys",
            "optionName": "metric_112342",
        },
        "row_limit": 500000,
        "select_country": "france",
    }

    print("Creating a slice")
    slc = Slice(
        slice_name="Birth in France by department in 2016",
        viz_type="country_map",
        datasource_type="table",
        datasource_id=tbl.id,
        params=get_slice_json(slice_data),
    )
    misc_dash_slices.add(slc.slice_name)
    merge_slice(slc)
