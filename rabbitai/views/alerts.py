from croniter import croniter
from flask import abort, current_app as app, flash, Markup
from flask_appbuilder import CompactCRUDMixin, permission_name
from flask_appbuilder.api import expose
from flask_appbuilder.hooks import before_request
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access
from flask_babel import lazy_gettext as _
from werkzeug.exceptions import NotFound

from rabbitai import is_feature_enabled
from rabbitai.constants import RouteMethod
from rabbitai.models.alerts import Alert, AlertLog, SQLObservation
from rabbitai.tasks.alerts.validator import check_validator
from rabbitai.typing import FlaskResponse
from rabbitai.utils import core as utils
from rabbitai.utils.core import get_email_address_str, markdown

from ..exceptions import RabbitaiException
from .base import BaseRabbitaiView, RabbitaiModelView

# TODO: access control rules for this module


class EnsureEnabledMixin:
    """混入是否启用更改提醒功能依据应用配置ENABLE_ALERTS的值确定是否启用，并提供每次请求要调用的方法以进行判断。"""

    @staticmethod
    def is_enabled() -> bool:
        return bool(app.config["ENABLE_ALERTS"])

    @before_request
    def ensure_enabled(self) -> None:
        if not self.is_enabled():
            raise NotFound()


class AlertLogModelView(CompactCRUDMixin, EnsureEnabledMixin, RabbitaiModelView):
    """提醒日志模型视图，提供 AlertLog 模型操作和访问的相关属性和方法。"""

    datamodel = SQLAInterface(AlertLog)
    include_route_methods = {RouteMethod.LIST} | {"show"}
    base_order = ("dttm_start", "desc")
    list_columns = (
        "scheduled_dttm",
        "dttm_start",
        "duration",
        "state",
    )


class AlertObservationModelView(CompactCRUDMixin, EnsureEnabledMixin, RabbitaiModelView):
    """提醒观察模型视图。"""

    datamodel = SQLAInterface(SQLObservation)
    include_route_methods = {RouteMethod.LIST} | {"show"}
    base_order = ("dttm", "desc")
    list_title = _("List Observations")
    show_title = _("Show Observation")
    list_columns = (
        "dttm",
        "value",
        "error_msg",
    )
    label_columns = {
        "error_msg": _("Error Message"),
    }


class BaseAlertReportView(BaseRabbitaiView):
    """更改报告视图。"""

    route_base = "/report"
    class_permission_name = "ReportSchedule"

    @expose("/list/")
    @has_access
    @permission_name("read")
    def list(self) -> FlaskResponse:
        if not (
            is_feature_enabled("ENABLE_REACT_CRUD_VIEWS")
            and is_feature_enabled("ALERT_REPORTS")
        ):
            return abort(404)
        return super().render_app_template()

    @expose("/<pk>/log/", methods=["GET"])
    @has_access
    @permission_name("read")
    def log(self, pk: int) -> FlaskResponse:
        if not (
            is_feature_enabled("ENABLE_REACT_CRUD_VIEWS")
            and is_feature_enabled("ALERT_REPORTS")
        ):
            return abort(404)

        return super().render_app_template()


class AlertView(BaseAlertReportView):
    """更改提醒视图。"""
    route_base = "/alert"
    class_permission_name = "ReportSchedule"


class ReportView(BaseAlertReportView):
    """报告视图。"""
    route_base = "/report"
    class_permission_name = "ReportSchedule"


class AlertModelView(EnsureEnabledMixin, RabbitaiModelView):
    """更改提醒模型视图。"""

    datamodel = SQLAInterface(Alert)
    route_base = "/alerts"
    include_route_methods = RouteMethod.CRUD_SET | {"log"}

    list_columns = (
        "label",
        "owners",
        "database",
        "sql",
        "pretty_config",
        "crontab",
        "last_eval_dttm",
        "last_state",
        "active",
        "owners",
    )
    show_columns = (
        "label",
        "database",
        "sql",
        "validator_type",
        "validator_config",
        "active",
        "crontab",
        "owners",
        "slice",
        "recipients",
        "slack_channel",
        "log_retention",
        "grace_period",
        "last_eval_dttm",
        "last_state",
    )
    order_columns = ["label", "last_eval_dttm", "last_state", "active"]
    add_columns = (
        "label",
        "database",
        "sql",
        "validator_type",
        "validator_config",
        "active",
        "crontab",
        # TODO: implement different types of alerts
        # "alert_type",
        "owners",
        "recipients",
        "slack_channel",
        "slice",
        # TODO: implement dashboard screenshots with alerts
        # "dashboard",
        "log_retention",
        "grace_period",
    )
    label_columns = {
        "log_retention": _("Log Retentions (days)"),
    }
    description_columns = {
        "crontab": markdown(
            "A CRON-like expression. "
            "[Crontab Guru](https://crontab.guru/) is "
            "a helpful resource that can help you craft a CRON expression.",
            True,
        ),
        "recipients": _("A semicolon ';' delimited list of email addresses"),
        "log_retention": _("How long to keep the logs around for this alert"),
        "grace_period": _(
            "Once an alert is triggered, how long, in seconds, before "
            "Rabbitai nags you again."
        ),
        "sql": _(
            "A SQL statement that defines whether the alert should get triggered or "
            "not. The query is expected to return either NULL or a number value."
        ),
        "validator_type": utils.markdown(
            "Determines when to trigger alert based off value from alert query. "
            "Alerts will be triggered with these validator types:"
            "<ul><li>Not Null - When the return value is Not NULL, Empty, or 0</li>"
            "<li>Operator - When `sql_return_value comparison_operator threshold`"
            " is True e.g. `50 <= 75`<br>Supports the comparison operators <, <=, "
            ">, >=, ==, and !=</li></ul>",
            True,
        ),
        "validator_config": utils.markdown(
            "JSON string containing values the validator will compare against. "
            "Each validator needs the following values:"
            "<ul><li>Not Null - Nothing. You can leave the config as it is.</li>"
            '<li>Operator<ul><li>`"op": "operator"` with an operator from ["<", '
            '"<=", ">", ">=", "==", "!="] e.g. `"op": ">="`</li>'
            '<li>`"threshold": threshold_value` e.g. `"threshold": 50`'
            '</li></ul>Example config:<br>{<br> "op":">=",<br>"threshold": 60<br>}'
            "</li></ul>",
            True,
        ),
    }

    edit_columns = add_columns
    related_views = [
        AlertObservationModelView,
        AlertLogModelView,
    ]

    @expose("/list/")
    @has_access
    def list(self) -> FlaskResponse:
        flash(
            Markup(
                _(
                    "This feature is deprecated and will be removed on 2.0. "
                    "Take a look at the replacement feature "
                    "<a href="
                    "'https://rabbitai.apache.org/docs/installation/alerts-reports'>"
                    "Alerts & Reports documentation</a>"
                )
            ),
            "warning",
        )
        return super().list()

    def pre_add(self, item: "AlertModelView") -> None:
        item.recipients = get_email_address_str(item.recipients)

        if not croniter.is_valid(item.crontab):
            raise RabbitaiException("Invalid crontab format")

        item.validator_type = item.validator_type.lower()
        check_validator(item.validator_type, item.validator_config)

    def pre_update(self, item: "AlertModelView") -> None:
        item.validator_type = item.validator_type.lower()
        check_validator(item.validator_type, item.validator_config)

    def post_update(self, item: "AlertModelView") -> None:
        self.post_add(item)
