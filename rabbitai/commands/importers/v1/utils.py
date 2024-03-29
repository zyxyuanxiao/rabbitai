import logging
from pathlib import Path
from typing import Any, Dict
from zipfile import ZipFile

import yaml
from marshmallow import fields, Schema, validate
from marshmallow.exceptions import ValidationError

from rabbitai.commands.importers.exceptions import IncorrectVersionError

METADATA_FILE_NAME = "metadata.yaml"
IMPORT_VERSION = "1.0.0"

logger = logging.getLogger(__name__)


def remove_root(file_path: str) -> str:
    """Remove the first directory of a path"""

    full_path = Path(file_path)
    relative_path = Path(*full_path.parts[1:])
    return str(relative_path)


class MetadataSchema(Schema):
    version = fields.String(required=True, validate=validate.Equal(IMPORT_VERSION))
    type = fields.String(required=False)
    timestamp = fields.DateTime()


def load_yaml(file_name: str, content: str) -> Dict[str, Any]:
    """Try to load a YAML file"""
    try:
        return yaml.safe_load(content)
    except yaml.parser.ParserError:
        logger.exception("Invalid YAML in %s", file_name)
        raise ValidationError({file_name: "Not a valid YAML file"})


def load_metadata(contents: Dict[str, str]) -> Dict[str, str]:
    """Apply validation and load a metadata file"""

    if METADATA_FILE_NAME not in contents:
        # if the contents have no METADATA_FILE_NAME this is probably
        # a original export without versioning that should not be
        # handled by this command
        raise IncorrectVersionError(f"Missing {METADATA_FILE_NAME}")

    metadata = load_yaml(METADATA_FILE_NAME, contents[METADATA_FILE_NAME])
    try:
        MetadataSchema().load(metadata)
    except ValidationError as exc:
        # if the version doesn't match raise an exception so that the
        # dispatcher can try a different command version
        if "version" in exc.messages:
            raise IncorrectVersionError(exc.messages["version"][0])

        # otherwise we raise the validation error
        exc.messages = {METADATA_FILE_NAME: exc.messages}
        raise exc

    return metadata


def is_valid_config(file_name: str) -> bool:
    path = Path(file_name)

    # ignore system files that might've been added to the bundle
    if path.name.startswith(".") or path.name.startswith("_"):
        return False

    # ensure extension is YAML
    if path.suffix.lower() not in {".yaml", ".yml"}:
        return False

    return True


def get_contents_from_bundle(bundle: ZipFile) -> Dict[str, str]:
    return {
        remove_root(file_name): bundle.read(file_name).decode()
        for file_name in bundle.namelist()
        if is_valid_config(file_name)
    }
