import logging
from typing import Any, Dict, List, Optional

from flask_appbuilder.models.sqla import Model
from flask_appbuilder.security.sqla.models import User
from marshmallow import ValidationError

from rabbitai.commands.base import BaseCommand
from rabbitai.commands.utils import populate_owners, populate_roles
from rabbitai.dao.exceptions import DAOCreateFailedError
from rabbitai.dashboards.commands.exceptions import (
    DashboardCreateFailedError,
    DashboardInvalidError,
    DashboardSlugExistsValidationError,
)
from rabbitai.dashboards.dao import DashboardDAO

logger = logging.getLogger(__name__)


class CreateDashboardCommand(BaseCommand):
    def __init__(self, user: User, data: Dict[str, Any]):
        self._actor = user
        self._properties = data.copy()

    def run(self) -> Model:
        self.validate()
        try:
            dashboard = DashboardDAO.create(self._properties, commit=False)
            dashboard = DashboardDAO.update_charts_owners(dashboard, commit=True)
        except DAOCreateFailedError as ex:
            logger.exception(ex.exception)
            raise DashboardCreateFailedError()
        return dashboard

    def validate(self) -> None:
        exceptions: List[ValidationError] = list()
        owner_ids: Optional[List[int]] = self._properties.get("owners")
        role_ids: Optional[List[int]] = self._properties.get("roles")
        slug: str = self._properties.get("slug", "")

        # Validate slug uniqueness
        if not DashboardDAO.validate_slug_uniqueness(slug):
            exceptions.append(DashboardSlugExistsValidationError())

        try:
            owners = populate_owners(self._actor, owner_ids)
            self._properties["owners"] = owners
        except ValidationError as ex:
            exceptions.append(ex)
        if exceptions:
            exception = DashboardInvalidError()
            exception.add_list(exceptions)
            raise exception

        try:
            roles = populate_roles(role_ids)
            self._properties["roles"] = roles
        except ValidationError as ex:
            exceptions.append(ex)
        if exceptions:
            exception = DashboardInvalidError()
            exception.add_list(exceptions)
            raise exception