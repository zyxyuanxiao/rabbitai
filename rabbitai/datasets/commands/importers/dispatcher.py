import logging
from typing import Any, Dict

from marshmallow.exceptions import ValidationError

from rabbitai.commands.base import BaseCommand
from rabbitai.commands.exceptions import CommandInvalidError
from rabbitai.commands.importers.exceptions import IncorrectVersionError
from rabbitai.datasets.commands.importers import v0, v1

logger = logging.getLogger(__name__)

# list of different import formats supported; v0 should be last because
# the files are not versioned
command_versions = [
    v1.ImportDatasetsCommand,
    v0.ImportDatasetsCommand,
]


class ImportDatasetsCommand(BaseCommand):
    """
    Import datasets.

    This command dispatches the import to different versions of the command
    until it finds one that matches.
    """

    # pylint: disable=unused-argument
    def __init__(self, contents: Dict[str, str], *args: Any, **kwargs: Any):
        self.contents = contents
        self.args = args
        self.kwargs = kwargs

    def run(self) -> None:
        # iterate over all commands until we find a version that can
        # handle the contents
        for version in command_versions:
            command = version(self.contents, *self.args, **self.kwargs)
            try:
                command.run()
                return
            except IncorrectVersionError:
                logger.debug("File not handled by command, skipping")
            except (CommandInvalidError, ValidationError) as exc:
                # found right version, but file is invalid
                logger.info("Command failed validation")
                raise exc
            except Exception as exc:
                # validation succeeded but something went wrong
                logger.exception("Error running import command")
                raise exc

        raise CommandInvalidError("Could not find a valid command to import file")

    def validate(self) -> None:
        pass
