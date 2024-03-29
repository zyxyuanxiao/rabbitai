from flask_babel import _
from marshmallow.validate import ValidationError

from rabbitai.commands.exceptions import (
    CommandException,
    CommandInvalidError,
    CreateFailedError,
    DeleteFailedError,
    ForbiddenError,
    ImportFailedError,
    UpdateFailedError,
)


class TimeRangeUnclearError(ValidationError):
    """
    Time range is in valid error.
    """

    def __init__(self, human_readable: str) -> None:
        super().__init__(
            _(
                "Time string is unclear."
                " Please specify [%(human_readable)s ago]"
                " or [%(human_readable)s later].",
                human_readable=human_readable,
            ),
            field_name="time_range",
        )


class TimeRangeParseFailError(ValidationError):
    def __init__(self, human_readable: str) -> None:
        super().__init__(
            _(
                "Cannot parse time string [%(human_readable)s]",
                human_readable=human_readable,
            ),
            field_name="time_range",
        )


class DatabaseNotFoundValidationError(ValidationError):
    """
    Marshmallow validation error for database does not exist
    """

    def __init__(self) -> None:
        super().__init__(_("Database does not exist"), field_name="database")


class DashboardsNotFoundValidationError(ValidationError):
    """
    Marshmallow validation error for dashboards don't exist
    """

    def __init__(self) -> None:
        super().__init__(_("Dashboards do not exist"), field_name="dashboards")


class DatasourceTypeUpdateRequiredValidationError(ValidationError):
    """
    Marshmallow validation error for dashboards don't exist
    """

    def __init__(self) -> None:
        super().__init__(
            _("Datasource type is required when datasource_id is given"),
            field_names=["datasource_type"],
        )


class ChartNotFoundError(CommandException):
    message = "Chart not found."


class ChartInvalidError(CommandInvalidError):
    message = _("Chart parameters are invalid.")


class ChartCreateFailedError(CreateFailedError):
    message = _("Chart could not be created.")


class ChartUpdateFailedError(UpdateFailedError):
    message = _("Chart could not be updated.")


class ChartDeleteFailedError(DeleteFailedError):
    message = _("Chart could not be deleted.")


class ChartDeleteFailedReportsExistError(ChartDeleteFailedError):
    message = _("There are associated alerts or reports")


class ChartForbiddenError(ForbiddenError):
    message = _("Changing this chart is forbidden")


class ChartBulkDeleteFailedError(DeleteFailedError):
    message = _("Charts could not be deleted.")


class ChartDataQueryFailedError(CommandException):
    pass


class ChartDataCacheLoadError(CommandException):
    pass


class ChartBulkDeleteFailedReportsExistError(ChartBulkDeleteFailedError):
    message = _("There are associated alerts or reports")


class ChartImportError(ImportFailedError):
    message = _("Import chart failed for an unknown reason")
