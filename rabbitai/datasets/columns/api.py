import logging

from flask import g, Response
from flask_appbuilder.api import expose, permission_name, protect, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface

from rabbitai.connectors.sqla.models import TableColumn
from rabbitai.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from rabbitai.datasets.columns.commands.delete import DeleteDatasetColumnCommand
from rabbitai.datasets.columns.commands.exceptions import (
    DatasetColumnDeleteFailedError,
    DatasetColumnForbiddenError,
    DatasetColumnNotFoundError,
)
from rabbitai.views.base_api import BaseRabbitaiModelRestApi, statsd_metrics

logger = logging.getLogger(__name__)


class DatasetColumnsRestApi(BaseRabbitaiModelRestApi):
    datamodel = SQLAInterface(TableColumn)

    include_route_methods = {"delete"}
    class_permission_name = "Dataset"
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    resource_name = "dataset"
    allow_browser_login = True

    openapi_spec_tag = "Datasets"

    @expose("/<int:pk>/column/<int:column_id>", methods=["DELETE"])
    @protect()
    @safe
    @statsd_metrics
    @permission_name("delete")
    def delete(  # pylint: disable=arguments-differ
        self, pk: int, column_id: int
    ) -> Response:
        """Deletes a Dataset column
        ---
        delete:
          description: >-
            Delete a Dataset column
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
            description: The dataset pk for this column
          - in: path
            schema:
              type: integer
            name: column_id
            description: The column id for this dataset
          responses:
            200:
              description: Column deleted
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            401:
              $ref: '#/components/responses/401'
            403:
              $ref: '#/components/responses/403'
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            DeleteDatasetColumnCommand(g.user, pk, column_id).run()
            return self.response(200, message="OK")
        except DatasetColumnNotFoundError:
            return self.response_404()
        except DatasetColumnForbiddenError:
            return self.response_403()
        except DatasetColumnDeleteFailedError as ex:
            logger.error(
                "Error deleting dataset column %s: %s",
                self.__class__.__name__,
                str(ex),
                exc_info=True,
            )
            return self.response_422(message=str(ex))
