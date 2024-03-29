import enum
from typing import Type, Union

import simplejson as json
from croniter import croniter
from flask import current_app as app, flash, g, Markup
from flask_appbuilder import expose
from flask_appbuilder.hooks import before_request
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access
from flask_babel import lazy_gettext as _
from werkzeug.exceptions import NotFound
from wtforms import BooleanField, Form, StringField

from rabbitai import db, security_manager
from rabbitai.constants import RouteMethod
from rabbitai.exceptions import RabbitaiException
from rabbitai.models.dashboard import Dashboard
from rabbitai.models.schedules import (
    DashboardEmailSchedule,
    ScheduleType,
    SliceEmailSchedule,
)
from rabbitai.models.slice import Slice
from rabbitai.tasks.schedules import schedule_email_report
from rabbitai.typing import FlaskResponse
from rabbitai.utils.core import get_email_address_list, json_iso_dttm_ser
from rabbitai.views.core import json_success

from .base import DeleteMixin, RabbitaiModelView


class EmailScheduleView(RabbitaiModelView, DeleteMixin):
    """邮件调度视图。"""

    include_route_methods = RouteMethod.CRUD_SET
    _extra_data = {"test_email": False, "test_email_recipients": None}

    @staticmethod
    def is_enabled() -> bool:
        return app.config["ENABLE_SCHEDULED_EMAIL_REPORTS"]

    @before_request
    def ensure_enabled(self) -> None:
        if not self.is_enabled():
            raise NotFound()

    @property
    def schedule_type(self) -> str:
        raise NotImplementedError()

    @property
    def schedule_type_model(self) -> Type[Union[Dashboard, Slice]]:
        raise NotImplementedError()

    page_size = 20

    add_exclude_columns = [
        "user",
        "created_on",
        "changed_on",
        "created_by",
        "changed_by",
    ]

    edit_exclude_columns = add_exclude_columns

    description_columns = {
        "deliver_as_group": "If enabled, send a single email to all "
        "recipients (in email/To: field)",
        "crontab": "Unix style crontab schedule to deliver emails. "
        "Changes to schedules reflect in one hour.",
        "delivery_type": "Indicates how the rendered content is delivered",
    }

    add_form_extra_fields = {
        "test_email": BooleanField(
            "Send Test Email",
            default=False,
            description="If enabled, we send a test mail on create / update",
        ),
        "test_email_recipients": StringField(
            "Test Email Recipients",
            default=None,
            description="List of recipients to send test email to. "
            "If empty, we send it to the original recipients",
        ),
        "test_slack_channel": StringField(
            "Test Slack Channel",
            default=None,
            description="A slack channel to send a test message to.",
        ),
    }

    edit_form_extra_fields = add_form_extra_fields

    def process_form(self, form: Form, is_created: bool) -> None:
        if form.test_email_recipients.data:
            test_email_recipients = form.test_email_recipients.data.strip()
        else:
            test_email_recipients = None

        test_slack_channel = (
            form.test_slack_channel.data.strip()
            if form.test_slack_channel.data
            else None
        )

        self._extra_data["test_email"] = form.test_email.data
        self._extra_data["test_email_recipients"] = test_email_recipients
        self._extra_data["test_slack_channel"] = test_slack_channel

    def pre_add(self, item: "EmailScheduleView") -> None:
        try:
            recipients = get_email_address_list(item.recipients)
            item.recipients = ", ".join(recipients)
        except Exception:
            raise RabbitaiException("Invalid email list")

        item.user = item.user or g.user
        if not croniter.is_valid(item.crontab):
            raise RabbitaiException("Invalid crontab format")

    def pre_update(self, item: "EmailScheduleView") -> None:
        self.pre_add(item)

    def post_add(self, item: "EmailScheduleView") -> None:
        # Schedule a test mail if the user requested for it.
        if self._extra_data["test_email"]:
            recipients = self._extra_data["test_email_recipients"] or item.recipients
            slack_channel = self._extra_data["test_slack_channel"] or item.slack_channel
            args = (self.schedule_type, item.id)
            kwargs = dict(recipients=recipients, slack_channel=slack_channel)
            schedule_email_report.apply_async(args=args, kwargs=kwargs)

        # Notify the user that schedule changes will be activate only in the
        # next hour
        if item.active:
            flash("Schedule changes will get applied in one hour", "warning")

    def post_update(self, item: "EmailScheduleView") -> None:
        self.post_add(item)

    @has_access
    @expose("/fetch/<int:item_id>/", methods=["GET"])
    def fetch_schedules(self, item_id: int) -> FlaskResponse:

        query = db.session.query(self.datamodel.obj)
        query = query.join(self.schedule_type_model).filter(
            self.schedule_type_model.id == item_id
        )

        schedules = []
        for schedule in query.all():
            info = {"schedule": schedule.id}

            for col in self.list_columns + self.add_exclude_columns:
                info[col] = getattr(schedule, col)

                if isinstance(info[col], enum.Enum):
                    info[col] = info[col].name
                elif isinstance(info[col], security_manager.user_model):
                    info[col] = info[col].username

            info["user"] = schedule.user.username
            info[self.schedule_type] = getattr(schedule, self.schedule_type).id
            schedules.append(info)

        return json_success(json.dumps(schedules, default=json_iso_dttm_ser))


class DashboardEmailScheduleView(EmailScheduleView):
    """仪表盘邮件调度视图。"""

    schedule_type = ScheduleType.dashboard
    schedule_type_model = Dashboard

    add_title = _("Schedule Email Reports for Dashboards")
    edit_title = add_title
    list_title = _("Manage Email Reports for Dashboards")

    datamodel = SQLAInterface(DashboardEmailSchedule)
    order_columns = ["user", "dashboard", "created_on"]

    list_columns = [
        "dashboard",
        "active",
        "crontab",
        "user",
        "deliver_as_group",
        "delivery_type",
    ]

    add_columns = [
        "dashboard",
        "active",
        "crontab",
        "recipients",
        "slack_channel",
        "deliver_as_group",
        "delivery_type",
        "test_email",
        "test_email_recipients",
        "test_slack_channel",
    ]

    edit_columns = add_columns

    search_columns = [
        "dashboard",
        "active",
        "user",
        "deliver_as_group",
        "delivery_type",
    ]

    label_columns = {
        "dashboard": _("Dashboard"),
        "created_on": _("Created On"),
        "changed_on": _("Changed On"),
        "user": _("User"),
        "active": _("Active"),
        "crontab": _("Crontab"),
        "recipients": _("Recipients"),
        "slack_channel": _("Slack Channel"),
        "deliver_as_group": _("Deliver As Group"),
        "delivery_type": _("Delivery Type"),
    }

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

    def pre_add(self, item: "DashboardEmailScheduleView") -> None:
        if item.dashboard is None:
            raise RabbitaiException("Dashboard is mandatory")
        super(DashboardEmailScheduleView, self).pre_add(item)


class SliceEmailScheduleView(EmailScheduleView):
    """切片邮件调度视图"""
    schedule_type = ScheduleType.slice
    schedule_type_model = Slice
    add_title = _("Schedule Email Reports for Charts")
    edit_title = add_title
    list_title = _("Manage Email Reports for Charts")

    datamodel = SQLAInterface(SliceEmailSchedule)
    order_columns = ["user", "slice", "created_on"]
    list_columns = [
        "slice",
        "active",
        "crontab",
        "user",
        "deliver_as_group",
        "delivery_type",
        "email_format",
    ]

    add_columns = [
        "slice",
        "active",
        "crontab",
        "recipients",
        "slack_channel",
        "deliver_as_group",
        "delivery_type",
        "email_format",
        "test_email",
        "test_email_recipients",
        "test_slack_channel",
    ]

    edit_columns = add_columns

    search_columns = [
        "slice",
        "active",
        "user",
        "deliver_as_group",
        "delivery_type",
        "email_format",
    ]

    label_columns = {
        "slice": _("Chart"),
        "created_on": _("Created On"),
        "changed_on": _("Changed On"),
        "user": _("User"),
        "active": _("Active"),
        "crontab": _("Crontab"),
        "recipients": _("Recipients"),
        "slack_channel": _("Slack Channel"),
        "deliver_as_group": _("Deliver As Group"),
        "delivery_type": _("Delivery Type"),
        "email_format": _("Email Format"),
    }

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

    def pre_add(self, item: "SliceEmailScheduleView") -> None:
        if item.slice is None:
            raise RabbitaiException("Slice is mandatory")
        super(SliceEmailScheduleView, self).pre_add(item)
