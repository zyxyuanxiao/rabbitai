"""Models for scheduled execution of jobs"""
import enum
from typing import Optional, Type

from flask_appbuilder import Model
from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import relationship, RelationshipProperty

from rabbitai import security_manager
from rabbitai.models.alerts import Alert
from rabbitai.models.helpers import AuditMixinNullable, ImportExportMixin

metadata = Model.metadata  # pylint: disable=no-member


class ScheduleType(str, enum.Enum):
    slice = "slice"
    dashboard = "dashboard"
    alert = "alert"


class EmailDeliveryType(str, enum.Enum):
    attachment = "Attachment"
    inline = "Inline"


class SliceEmailReportFormat(str, enum.Enum):
    visualization = "Visualization"
    data = "Raw data"


class EmailSchedule:
    """Schedules for emailing slices / dashboards"""

    __tablename__ = "email_schedules"

    id = Column(Integer, primary_key=True)
    active = Column(Boolean, default=True, index=True)
    crontab = Column(String(50))

    @declared_attr
    def user_id(self) -> int:
        return Column(Integer, ForeignKey("ab_user.id"))

    @declared_attr
    def user(self) -> RelationshipProperty:
        return relationship(
            security_manager.user_model,
            backref=self.__tablename__,
            foreign_keys=[self.user_id],
        )

    recipients = Column(Text)
    slack_channel = Column(Text)
    deliver_as_group = Column(Boolean, default=False)
    delivery_type = Column(Enum(EmailDeliveryType))


class DashboardEmailSchedule(
    Model, AuditMixinNullable, ImportExportMixin, EmailSchedule
):
    __tablename__ = "dashboard_email_schedules"
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"))
    dashboard = relationship(
        "Dashboard", backref="email_schedules", foreign_keys=[dashboard_id]
    )


class SliceEmailSchedule(Model, AuditMixinNullable, ImportExportMixin, EmailSchedule):
    __tablename__ = "slice_email_schedules"
    slice_id = Column(Integer, ForeignKey("slices.id"))
    slice = relationship("Slice", backref="email_schedules", foreign_keys=[slice_id])
    email_format = Column(Enum(SliceEmailReportFormat))


def get_scheduler_model(report_type: str) -> Optional[Type[EmailSchedule]]:
    if report_type == ScheduleType.dashboard:
        return DashboardEmailSchedule
    if report_type == ScheduleType.slice:
        return SliceEmailSchedule
    if report_type == ScheduleType.alert:
        return Alert
    return None
