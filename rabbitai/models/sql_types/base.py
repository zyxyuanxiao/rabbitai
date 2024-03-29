from datetime import datetime
from typing import Any, Callable, Type, TYPE_CHECKING

from flask_babel import gettext as __
from sqlalchemy import types
from sqlalchemy.engine.interfaces import Dialect

if TYPE_CHECKING:
    from rabbitai.db_engine_specs.base import BaseEngineSpec


def literal_dttm_type_factory(
    sqla_type: Type[types.TypeEngine],
    db_engine_spec: Type["BaseEngineSpec"],
    col_type: str,
) -> Type[types.TypeEngine]:
    """
    Create a custom SQLAlchemy type that supports datetime literal binds.

    :param sqla_type: Base type to extend
    :param db_engine_spec: Database engine spec which supports `convert_dttm` method
    :param col_type: native column type as defined in table metadata
    :return: SQLAlchemy type that supports using datetima as literal bind
    """
    # pylint: disable=too-few-public-methods
    class TemporalWrapperType(sqla_type):  # type: ignore
        # pylint: disable=unused-argument
        def literal_processor(self, dialect: Dialect) -> Callable[[Any], Any]:
            def process(value: Any) -> Any:
                if isinstance(value, datetime):
                    ts_expression = db_engine_spec.convert_dttm(col_type, value)
                    if ts_expression is None:
                        raise NotImplementedError(
                            __(
                                "Temporal expression not supported for type: "
                                "%(col_type)s",
                                col_type=col_type,
                            )
                        )
                    return ts_expression
                return super().process(value)

            return process

    return TemporalWrapperType
