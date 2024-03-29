# isort:skip_file
import copy
import json
import time

import pytest

import tests.test_app  # pylint: disable=unused-import
from rabbitai import db
from rabbitai.dashboards.dao import DashboardDAO
from rabbitai.models.dashboard import Dashboard
from tests.base_tests import RabbitaiTestCase
from tests.fixtures.world_bank_dashboard import load_world_bank_dashboard_with_slices


class TestDashboardDAO(RabbitaiTestCase):
    @pytest.mark.usefixtures("load_world_bank_dashboard_with_slices")
    def test_set_dash_metadata(self):
        dash = db.session.query(Dashboard).filter_by(slug="world_health").first()
        data = dash.data
        positions = data["position_json"]
        data.update({"positions": positions})
        original_data = copy.deepcopy(data)

        # add filter scopes
        filter_slice = dash.slices[0]
        immune_slices = dash.slices[2:]
        filter_scopes = {
            str(filter_slice.id): {
                "region": {
                    "scope": ["ROOT_ID"],
                    "immune": [slc.id for slc in immune_slices],
                }
            }
        }
        data.update({"filter_scopes": json.dumps(filter_scopes)})
        DashboardDAO.set_dash_metadata(dash, data)
        updated_metadata = json.loads(dash.json_metadata)
        self.assertEqual(updated_metadata["filter_scopes"], filter_scopes)

        # remove a slice and change slice ids (as copy slices)
        removed_slice = immune_slices.pop()
        removed_component = [
            key
            for (key, value) in positions.items()
            if isinstance(value, dict)
            and value.get("type") == "CHART"
            and value["meta"]["chartId"] == removed_slice.id
        ]
        positions.pop(removed_component[0], None)

        data.update({"positions": positions})
        DashboardDAO.set_dash_metadata(dash, data)
        updated_metadata = json.loads(dash.json_metadata)
        expected_filter_scopes = {
            str(filter_slice.id): {
                "region": {
                    "scope": ["ROOT_ID"],
                    "immune": [slc.id for slc in immune_slices],
                }
            }
        }
        self.assertEqual(updated_metadata["filter_scopes"], expected_filter_scopes)

        # reset dash to original data
        DashboardDAO.set_dash_metadata(dash, original_data)

    @pytest.mark.usefixtures("load_world_bank_dashboard_with_slices")
    def test_get_dashboard_changed_on(self):
        session = db.session()
        dashboard = session.query(Dashboard).filter_by(slug="world_health").first()

        changed_on = dashboard.changed_on.replace(microsecond=0)
        assert changed_on == DashboardDAO.get_dashboard_changed_on(dashboard)
        assert changed_on == DashboardDAO.get_dashboard_changed_on("world_health")

        old_changed_on = dashboard.changed_on

        # freezegun doesn't work for some reason, so we need to sleep here :(
        time.sleep(1)
        data = dashboard.data
        positions = data["position_json"]
        data.update({"positions": positions})
        original_data = copy.deepcopy(data)

        data.update({"foo": "bar"})
        DashboardDAO.set_dash_metadata(dashboard, data)
        session.merge(dashboard)
        session.commit()
        new_changed_on = DashboardDAO.get_dashboard_changed_on(dashboard)
        assert old_changed_on.replace(microsecond=0) < new_changed_on
        assert new_changed_on == DashboardDAO.get_dashboard_and_datasets_changed_on(
            dashboard
        )
        assert new_changed_on == DashboardDAO.get_dashboard_and_slices_changed_on(
            dashboard
        )

        DashboardDAO.set_dash_metadata(dashboard, original_data)
        session.merge(dashboard)
        session.commit()
