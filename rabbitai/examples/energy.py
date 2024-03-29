"""Loads datasets, dashboards and slices in a new rabbitai instance"""
import textwrap

import pandas as pd
from sqlalchemy import Float, String
from sqlalchemy.sql import column

from rabbitai import db
from rabbitai.connectors.sqla.models import SqlMetric
from rabbitai.models.slice import Slice
from rabbitai.utils import core as utils

from .helpers import get_example_data, merge_slice, misc_dash_slices, TBL


def load_energy(
    only_metadata: bool = False, force: bool = False, sample: bool = False
) -> None:
    """Loads an energy related dataset to use with sankey and graphs"""
    tbl_name = "energy_usage"
    database = utils.get_example_database()
    table_exists = database.has_table_by_name(tbl_name)

    if not only_metadata and (not table_exists or force):
        data = get_example_data("energy.json.gz")
        pdf = pd.read_json(data)
        pdf = pdf.head(100) if sample else pdf
        pdf.to_sql(
            tbl_name,
            database.get_sqla_engine(),
            if_exists="replace",
            chunksize=500,
            dtype={"source": String(255), "target": String(255), "value": Float()},
            index=False,
            method="multi",
        )

    print("Creating table [wb_health_population] reference")
    tbl = db.session.query(TBL).filter_by(table_name=tbl_name).first()
    if not tbl:
        tbl = TBL(table_name=tbl_name)
    tbl.description = "Energy consumption"
    tbl.database = database

    if not any(col.metric_name == "sum__value" for col in tbl.metrics):
        col = str(column("value").compile(db.engine))
        tbl.metrics.append(
            SqlMetric(metric_name="sum__value", expression=f"SUM({col})")
        )

    db.session.merge(tbl)
    db.session.commit()
    tbl.fetch_metadata()

    slc = Slice(
        slice_name="Energy Sankey",
        viz_type="sankey",
        datasource_type="table",
        datasource_id=tbl.id,
        params=textwrap.dedent(
            """\
        {
            "collapsed_fieldsets": "",
            "groupby": [
                "source",
                "target"
            ],
            "metric": "sum__value",
            "row_limit": "5000",
            "slice_name": "Energy Sankey",
            "viz_type": "sankey"
        }
        """
        ),
    )
    misc_dash_slices.add(slc.slice_name)
    merge_slice(slc)

    slc = Slice(
        slice_name="Energy Force Layout",
        viz_type="graph_chart",
        datasource_type="table",
        datasource_id=tbl.id,
        params=textwrap.dedent(
            """\
        {
            "source": "source",
            "target": "target",
            "edgeLength": 400,
            "repulsion": 1000,
            "layout": "force",
            "metric": "sum__value",
            "row_limit": "5000",
            "slice_name": "Force",
            "viz_type": "graph_chart"
        }
        """
        ),
    )
    misc_dash_slices.add(slc.slice_name)
    merge_slice(slc)

    slc = Slice(
        slice_name="Heatmap",
        viz_type="heatmap",
        datasource_type="table",
        datasource_id=tbl.id,
        params=textwrap.dedent(
            """\
        {
            "all_columns_x": "source",
            "all_columns_y": "target",
            "canvas_image_rendering": "pixelated",
            "collapsed_fieldsets": "",
            "linear_color_scheme": "blue_white_yellow",
            "metric": "sum__value",
            "normalize_across": "heatmap",
            "slice_name": "Heatmap",
            "viz_type": "heatmap",
            "xscale_interval": "1",
            "yscale_interval": "1"
        }
        """
        ),
    )
    misc_dash_slices.add(slc.slice_name)
    merge_slice(slc)
