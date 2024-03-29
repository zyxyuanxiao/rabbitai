import json
from contextlib import closing
from typing import Any, Dict, Optional

from flask_appbuilder.security.sqla.models import User
from flask_babel import gettext as __
from sqlalchemy.engine.url import make_url

from rabbitai.commands.base import BaseCommand
from rabbitai.databases.commands.exceptions import (
    DatabaseOfflineError,
    DatabaseTestConnectionFailedError,
    InvalidEngineError,
    InvalidParametersError,
)
from rabbitai.databases.dao import DatabaseDAO
from rabbitai.db_engine_specs import get_engine_specs
from rabbitai.db_engine_specs.base import BasicParametersMixin
from rabbitai.errors import ErrorLevel, RabbitaiError, RabbitaiErrorType
from rabbitai.models.core import Database


class ValidateDatabaseParametersCommand(BaseCommand):
    def __init__(self, user: User, parameters: Dict[str, Any]):
        self._actor = user
        self._properties = parameters.copy()
        self._model: Optional[Database] = None

    def run(self) -> None:
        engine = self._properties["engine"]
        engine_specs = get_engine_specs()
        if engine not in engine_specs:
            raise InvalidEngineError(
                RabbitaiError(
                    message=__(
                        'Engine "%(engine)s" is not a valid engine.', engine=engine,
                    ),
                    error_type=RabbitaiErrorType.GENERIC_DB_ENGINE_ERROR,
                    level=ErrorLevel.ERROR,
                    extra={"allowed": list(engine_specs), "provided": engine},
                ),
            )
        engine_spec = engine_specs[engine]
        if not issubclass(engine_spec, BasicParametersMixin):
            raise InvalidEngineError(
                RabbitaiError(
                    message=__(
                        'Engine "%(engine)s" cannot be configured through parameters.',
                        engine=engine,
                    ),
                    error_type=RabbitaiErrorType.GENERIC_DB_ENGINE_ERROR,
                    level=ErrorLevel.ERROR,
                    extra={
                        "allowed": [
                            name
                            for name, engine_spec in engine_specs.items()
                            if issubclass(engine_spec, BasicParametersMixin)
                        ],
                        "provided": engine,
                    },
                ),
            )

        # perform initial validation
        errors = engine_spec.validate_parameters(self._properties["parameters"])
        if errors:
            raise InvalidParametersError(errors)

        serialized_encrypted_extra = self._properties.get("encrypted_extra", "{}")
        try:
            encrypted_extra = json.loads(serialized_encrypted_extra)
        except json.decoder.JSONDecodeError:
            encrypted_extra = {}

        # try to connect
        sqlalchemy_uri = engine_spec.build_sqlalchemy_uri(
            self._properties["parameters"],  # type: ignore
            encrypted_extra,
        )
        if self._model and sqlalchemy_uri == self._model.safe_sqlalchemy_uri():
            sqlalchemy_uri = self._model.sqlalchemy_uri_decrypted
        database = DatabaseDAO.build_db_for_connection_test(
            server_cert=self._properties.get("server_cert", ""),
            extra=self._properties.get("extra", "{}"),
            impersonate_user=self._properties.get("impersonate_user", False),
            encrypted_extra=serialized_encrypted_extra,
        )
        database.set_sqlalchemy_uri(sqlalchemy_uri)
        database.db_engine_spec.mutate_db_for_connection_test(database)
        username = self._actor.username if self._actor is not None else None
        engine = database.get_sqla_engine(user_name=username)
        try:
            with closing(engine.raw_connection()) as conn:
                alive = engine.dialect.do_ping(conn)
        except Exception as ex:  # pylint: disable=broad-except
            url = make_url(sqlalchemy_uri)
            context = {
                "hostname": url.host,
                "password": url.password,
                "port": url.port,
                "username": url.username,
                "database": url.database,
            }
            errors = database.db_engine_spec.extract_errors(ex, context)
            raise DatabaseTestConnectionFailedError(errors)

        if not alive:
            raise DatabaseOfflineError(
                RabbitaiError(
                    message=__("Database is offline."),
                    error_type=RabbitaiErrorType.GENERIC_DB_ENGINE_ERROR,
                    level=ErrorLevel.ERROR,
                ),
            )

    def validate(self) -> None:
        database_name = self._properties.get("database_name")
        if database_name is not None:
            self._model = DatabaseDAO.get_database_by_name(database_name)
