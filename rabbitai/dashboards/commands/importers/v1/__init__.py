from typing import Any, Dict, List, Set, Tuple

from marshmallow import Schema
from sqlalchemy.orm import Session
from sqlalchemy.sql import select

from rabbitai.charts.commands.importers.v1.utils import import_chart
from rabbitai.charts.schemas import ImportV1ChartSchema
from rabbitai.commands.importers.v1 import ImportModelsCommand
from rabbitai.dashboards.commands.exceptions import DashboardImportError
from rabbitai.dashboards.commands.importers.v1.utils import (
    find_chart_uuids,
    import_dashboard,
    update_id_refs,
)
from rabbitai.dashboards.dao import DashboardDAO
from rabbitai.dashboards.schemas import ImportV1DashboardSchema
from rabbitai.databases.commands.importers.v1.utils import import_database
from rabbitai.databases.schemas import ImportV1DatabaseSchema
from rabbitai.datasets.commands.importers.v1.utils import import_dataset
from rabbitai.datasets.schemas import ImportV1DatasetSchema
from rabbitai.models.dashboard import dashboard_slices


class ImportDashboardsCommand(ImportModelsCommand):

    """Import dashboards"""

    dao = DashboardDAO
    model_name = "dashboard"
    prefix = "dashboards/"
    schemas: Dict[str, Schema] = {
        "charts/": ImportV1ChartSchema(),
        "dashboards/": ImportV1DashboardSchema(),
        "datasets/": ImportV1DatasetSchema(),
        "databases/": ImportV1DatabaseSchema(),
    }
    import_error = DashboardImportError

    # TODO (betodealmeida): refactor to use code from other commands
    # pylint: disable=too-many-branches, too-many-locals
    @staticmethod
    def _import(
        session: Session, configs: Dict[str, Any], overwrite: bool = False
    ) -> None:
        # discover charts associated with dashboards
        chart_uuids: Set[str] = set()
        for file_name, config in configs.items():
            if file_name.startswith("dashboards/"):
                chart_uuids.update(find_chart_uuids(config["position"]))

        # discover datasets associated with charts
        dataset_uuids: Set[str] = set()
        for file_name, config in configs.items():
            if file_name.startswith("charts/") and config["uuid"] in chart_uuids:
                dataset_uuids.add(config["dataset_uuid"])

        # discover databases associated with datasets
        database_uuids: Set[str] = set()
        for file_name, config in configs.items():
            if file_name.startswith("datasets/") and config["uuid"] in dataset_uuids:
                database_uuids.add(config["database_uuid"])

        # import related databases
        database_ids: Dict[str, int] = {}
        for file_name, config in configs.items():
            if file_name.startswith("databases/") and config["uuid"] in database_uuids:
                database = import_database(session, config, overwrite=False)
                database_ids[str(database.uuid)] = database.id

        # import datasets with the correct parent ref
        dataset_info: Dict[str, Dict[str, Any]] = {}
        for file_name, config in configs.items():
            if (
                file_name.startswith("datasets/")
                and config["database_uuid"] in database_ids
            ):
                config["database_id"] = database_ids[config["database_uuid"]]
                dataset = import_dataset(session, config, overwrite=False)
                dataset_info[str(dataset.uuid)] = {
                    "datasource_id": dataset.id,
                    "datasource_type": "view" if dataset.is_sqllab_view else "table",
                    "datasource_name": dataset.table_name,
                }

        # import charts with the correct parent ref
        chart_ids: Dict[str, int] = {}
        for file_name, config in configs.items():
            if (
                file_name.startswith("charts/")
                and config["dataset_uuid"] in dataset_info
            ):
                # update datasource id, type, and name
                config.update(dataset_info[config["dataset_uuid"]])
                chart = import_chart(session, config, overwrite=False)
                chart_ids[str(chart.uuid)] = chart.id

        # store the existing relationship between dashboards and charts
        existing_relationships = session.execute(
            select([dashboard_slices.c.dashboard_id, dashboard_slices.c.slice_id])
        ).fetchall()

        # import dashboards
        dashboard_chart_ids: List[Tuple[int, int]] = []
        for file_name, config in configs.items():
            if file_name.startswith("dashboards/"):
                config = update_id_refs(config, chart_ids)
                dashboard = import_dashboard(session, config, overwrite=overwrite)
                for uuid in find_chart_uuids(config["position"]):
                    if uuid not in chart_ids:
                        break
                    chart_id = chart_ids[uuid]
                    if (dashboard.id, chart_id) not in existing_relationships:
                        dashboard_chart_ids.append((dashboard.id, chart_id))

        # set ref in the dashboard_slices table
        values = [
            {"dashboard_id": dashboard_id, "slice_id": chart_id}
            for (dashboard_id, chart_id) in dashboard_chart_ids
        ]
        # pylint: disable=no-value-for-parameter (sqlalchemy/issues/4656)
        session.execute(dashboard_slices.insert(), values)
