import json
import logging
from datetime import datetime
from io import BytesIO
from typing import Any
from zipfile import ZipFile

from flask import g, request, Response, send_file
from flask_appbuilder.api import expose, protect, rison, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_babel import ngettext

from rabbitai.commands.exceptions import CommandInvalidError
from rabbitai.commands.importers.v1.utils import get_contents_from_bundle
from rabbitai.constants import MODEL_API_RW_METHOD_PERMISSION_MAP, RouteMethod
from rabbitai.databases.filters import DatabaseFilter
from rabbitai.extensions import event_logger
from rabbitai.models.sql_lab import SavedQuery
from rabbitai.queries.saved_queries.commands.bulk_delete import (
    BulkDeleteSavedQueryCommand,
)
from rabbitai.queries.saved_queries.commands.exceptions import (
    SavedQueryBulkDeleteFailedError,
    SavedQueryNotFoundError,
)
from rabbitai.queries.saved_queries.commands.export import ExportSavedQueriesCommand
from rabbitai.queries.saved_queries.commands.importers.dispatcher import (
    ImportSavedQueriesCommand,
)
from rabbitai.queries.saved_queries.filters import (
    SavedQueryAllTextFilter,
    SavedQueryFavoriteFilter,
    SavedQueryFilter,
)
from rabbitai.queries.saved_queries.schemas import (
    get_delete_ids_schema,
    get_export_ids_schema,
    openapi_spec_methods_override,
)
from rabbitai.views.base_api import BaseRabbitaiModelRestApi, statsd_metrics

logger = logging.getLogger(__name__)


class SavedQueryRestApi(BaseRabbitaiModelRestApi):
    datamodel = SQLAInterface(SavedQuery)

    include_route_methods = RouteMethod.REST_MODEL_VIEW_CRUD_SET | {
        RouteMethod.EXPORT,
        RouteMethod.RELATED,
        RouteMethod.DISTINCT,
        RouteMethod.IMPORT,
        "bulk_delete",  # not using RouteMethod since locally defined
    }
    class_permission_name = "SavedQuery"
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    resource_name = "saved_query"
    allow_browser_login = True

    base_filters = [["id", SavedQueryFilter, lambda: []]]

    show_columns = [
        "created_by.first_name",
        "created_by.id",
        "created_by.last_name",
        "database.database_name",
        "database.id",
        "description",
        "id",
        "label",
        "schema",
        "sql",
        "sql_tables",
    ]
    list_columns = [
        "changed_on_delta_humanized",
        "created_on",
        "created_by.first_name",
        "created_by.id",
        "created_by.last_name",
        "database.database_name",
        "database.id",
        "db_id",
        "description",
        "id",
        "label",
        "schema",
        "sql",
        "sql_tables",
        "rows",
        "last_run_delta_humanized",
        "extra",
    ]
    add_columns = ["db_id", "description", "label", "schema", "sql"]
    edit_columns = add_columns
    order_columns = [
        "schema",
        "label",
        "description",
        "sql",
        "rows",
        "created_by.first_name",
        "database.database_name",
        "created_on",
        "changed_on_delta_humanized",
        "last_run_delta_humanized",
    ]

    search_columns = ["id", "database", "label", "schema", "created_by"]
    search_filters = {
        "id": [SavedQueryFavoriteFilter],
        "label": [SavedQueryAllTextFilter],
    }

    apispec_parameter_schemas = {
        "get_delete_ids_schema": get_delete_ids_schema,
        "get_export_ids_schema": get_export_ids_schema,
    }
    openapi_spec_tag = "Queries"
    openapi_spec_methods = openapi_spec_methods_override

    related_field_filters = {
        "database": "database_name",
    }
    filter_rel_fields = {"database": [["id", DatabaseFilter, lambda: []]]}
    allowed_rel_fields = {"database"}
    allowed_distinct_fields = {"schema"}

    def pre_add(self, item: SavedQuery) -> None:
        item.user = g.user

    def pre_update(self, item: SavedQuery) -> None:
        self.pre_add(item)

    @expose("/", methods=["DELETE"])
    @protect()
    @safe
    @statsd_metrics
    @rison(get_delete_ids_schema)
    def bulk_delete(self, **kwargs: Any) -> Response:
        """Delete bulk Saved Queries
        ---
        delete:
          description: >-
            Deletes multiple saved queries in a bulk operation.
          parameters:
          - in: query
            name: q
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/get_delete_ids_schema'
          responses:
            200:
              description: Saved queries bulk delete
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            401:
              $ref: '#/components/responses/401'
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """
        item_ids = kwargs["rison"]
        try:
            BulkDeleteSavedQueryCommand(g.user, item_ids).run()
            return self.response(
                200,
                message=ngettext(
                    "Deleted %(num)d saved query",
                    "Deleted %(num)d saved queries",
                    num=len(item_ids),
                ),
            )
        except SavedQueryNotFoundError:
            return self.response_404()
        except SavedQueryBulkDeleteFailedError as ex:
            return self.response_422(message=str(ex))

    @expose("/export/", methods=["GET"])
    @protect()
    @safe
    @statsd_metrics
    @rison(get_export_ids_schema)
    def export(self, **kwargs: Any) -> Response:
        """Export saved queries
        ---
        get:
          description: >-
            Exports multiple saved queries and downloads them as YAML files
          parameters:
          - in: query
            name: q
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/get_export_ids_schema'
          responses:
            200:
              description: A zip file with saved query(ies) and database(s) as YAML
              content:
                application/zip:
                  schema:
                    type: string
                    format: binary
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        requested_ids = kwargs["rison"]
        timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
        root = f"saved_query_export_{timestamp}"
        filename = f"{root}.zip"

        buf = BytesIO()
        with ZipFile(buf, "w") as bundle:
            try:
                for file_name, file_content in ExportSavedQueriesCommand(
                    requested_ids
                ).run():
                    with bundle.open(f"{root}/{file_name}", "w") as fp:
                        fp.write(file_content.encode())
            except SavedQueryNotFoundError:
                return self.response_404()
        buf.seek(0)

        return send_file(
            buf,
            mimetype="application/zip",
            as_attachment=True,
            attachment_filename=filename,
        )

    @expose("/import/", methods=["POST"])
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.import_",
        log_to_statsd=False,
    )
    def import_(self) -> Response:
        """Import Saved Queries with associated databases
        ---
        post:
          requestBody:
            required: true
            content:
              multipart/form-data:
                schema:
                  type: object
                  properties:
                    formData:
                      description: upload file (ZIP)
                      type: string
                      format: binary
                    passwords:
                      description: JSON map of passwords for each file
                      type: string
                    overwrite:
                      description: overwrite existing saved queries?
                      type: boolean
          responses:
            200:
              description: Saved Query import result
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """
        upload = request.files.get("formData")
        if not upload:
            return self.response_400()
        with ZipFile(upload) as bundle:
            contents = get_contents_from_bundle(bundle)

        passwords = (
            json.loads(request.form["passwords"])
            if "passwords" in request.form
            else None
        )
        overwrite = request.form.get("overwrite") == "true"

        command = ImportSavedQueriesCommand(
            contents, passwords=passwords, overwrite=overwrite
        )
        try:
            command.run()
            return self.response(200, message="OK")
        except CommandInvalidError as exc:
            logger.warning("Import Saved Query failed")
            return self.response_422(message=exc.normalized_messages())
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Import Saved Query failed")
            return self.response_500(message=str(exc))
