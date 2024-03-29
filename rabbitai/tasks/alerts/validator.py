import enum
import json
from operator import eq, ge, gt, le, lt, ne
from typing import Callable, Optional

import numpy as np

from rabbitai.exceptions import RabbitaiException
from rabbitai.models.alerts import Alert

OPERATOR_FUNCTIONS = {">=": ge, ">": gt, "<=": le, "<": lt, "==": eq, "!=": ne}


class AlertValidatorType(str, enum.Enum):
    not_null = "not null"
    operator = "operator"

    @classmethod
    def valid_type(cls, validator_type: str) -> bool:
        return any(val_type.value == validator_type for val_type in cls)


def check_validator(validator_type: str, config: str) -> None:
    if not AlertValidatorType.valid_type(validator_type):
        raise RabbitaiException(
            f"Error: {validator_type} is not a valid validator type."
        )

    config_dict = json.loads(config)

    if validator_type == AlertValidatorType.operator.value:

        if not (config_dict.get("op") and config_dict.get("threshold") is not None):
            raise RabbitaiException(
                "Error: Operator Validator needs specified operator and threshold "
                'values. Add "op" and "threshold" to config.'
            )

        if not config_dict["op"] in OPERATOR_FUNCTIONS.keys():
            raise RabbitaiException(
                f'Error: {config_dict["op"]} is an invalid operator type. Change '
                f'the "op" value in the config to one of '
                f'["<", "<=", ">", ">=", "==", "!="]'
            )

        if not isinstance(config_dict["threshold"], (int, float)):
            raise RabbitaiException(
                f'Error: {config_dict["threshold"]} is an invalid threshold value.'
                f' Change the "threshold" value in the config.'
            )


def not_null_validator(
    alert: Alert, validator_config: str  # pylint: disable=unused-argument
) -> bool:
    """Returns True if a recent observation is not NULL"""

    observation = alert.get_last_observation()
    # TODO: Validate malformed observations/observations with errors separately
    if (
        not observation
        or observation.error_msg
        or observation.value in (0, None, np.nan)
    ):
        return False
    return True


def operator_validator(alert: Alert, validator_config: str) -> bool:
    """
    Returns True if a recent observation is greater than or equal to
    the value given in the validator config
    """
    observation = alert.get_last_observation()
    if not observation or observation.value in (None, np.nan):
        return False

    operator = json.loads(validator_config)["op"]
    threshold = json.loads(validator_config)["threshold"]
    return OPERATOR_FUNCTIONS[operator](observation.value, threshold)


def get_validator_function(
    validator_type: str,
) -> Optional[Callable[[Alert, str], bool]]:
    """Returns a validation function based on validator_type"""

    alert_validators = {
        AlertValidatorType.not_null.value: not_null_validator,
        AlertValidatorType.operator.value: operator_validator,
    }
    if alert_validators.get(validator_type.lower()):
        return alert_validators[validator_type.lower()]

    return None
