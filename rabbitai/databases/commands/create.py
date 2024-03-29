import logging
from typing import Any, Dict, List, Optional

from flask_appbuilder.models.sqla import Model
from flask_appbuilder.security.sqla.models import User
from marshmallow import ValidationError

from rabbitai.commands.base import BaseCommand
from rabbitai.dao.exceptions import DAOCreateFailedError
from rabbitai.databases.commands.exceptions import (
    DatabaseConnectionFailedError,
    DatabaseCreateFailedError,
    DatabaseExistsValidationError,
    DatabaseInvalidError,
    DatabaseRequiredFieldValidationError,
)
from rabbitai.databases.commands.test_connection import TestConnectionDatabaseCommand
from rabbitai.databases.dao import DatabaseDAO
from rabbitai.extensions import db, event_logger, security_manager

logger = logging.getLogger(__name__)


class CreateDatabaseCommand(BaseCommand):
    def __init__(self, user: User, data: Dict[str, Any]):
        self._actor = user
        self._properties = data.copy()

    def run(self) -> Model:
        self.validate()
        try:
            database = DatabaseDAO.create(self._properties, commit=False)
            database.set_sqlalchemy_uri(database.sqlalchemy_uri)

            try:
                TestConnectionDatabaseCommand(self._actor, self._properties).run()
            except Exception as ex:  # pylint: disable=broad-except
                db.session.rollback()
                event_logger.log_with_context(
                    action=f"db_creation_failed.{ex.__class__.__name__}",
                    engine=database.db_engine_spec.__name__,
                )
                raise DatabaseConnectionFailedError()

            # adding a new database we always want to force refresh schema list
            schemas = database.get_all_schema_names(cache=False)
            for schema in schemas:
                security_manager.add_permission_view_menu(
                    "schema_access", security_manager.get_schema_perm(database, schema)
                )
            security_manager.add_permission_view_menu("database_access", database.perm)
            db.session.commit()
        except DAOCreateFailedError as ex:
            event_logger.log_with_context(
                action=f"db_creation_failed.{ex.__class__.__name__}",
                engine=database.db_engine_spec.__name__,
            )
            raise DatabaseCreateFailedError()
        return database

    def validate(self) -> None:
        exceptions: List[ValidationError] = list()
        sqlalchemy_uri: Optional[str] = self._properties.get("sqlalchemy_uri")
        database_name: Optional[str] = self._properties.get("database_name")
        if not sqlalchemy_uri:
            exceptions.append(DatabaseRequiredFieldValidationError("sqlalchemy_uri"))
        if not database_name:
            exceptions.append(DatabaseRequiredFieldValidationError("database_name"))
        else:
            # Check database_name uniqueness
            if not DatabaseDAO.validate_uniqueness(database_name):
                exceptions.append(DatabaseExistsValidationError())
        if exceptions:
            exception = DatabaseInvalidError()
            exception.add_list(exceptions)
            event_logger.log_with_context(
                action=f"db_connection_failed.{exception.__class__.__name__}"
            )
            raise exception
