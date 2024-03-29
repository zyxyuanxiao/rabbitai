#!/usr/bin/env bash

/app/docker/docker-init.sh

# TODO: copy config overrides from ENV vars

# TODO: run celery in detached state

# start up the web server
gunicorn \
    --bind  "0.0.0.0:${RABBITAI_PORT}" \
    --access-logfile '-' \
    --error-logfile '-' \
    --workers 1 \
    --worker-class gthread \
    --threads 8 \
    --timeout 60 \
    --limit-request-line 0 \
    --limit-request-field_size 0 \
    "${FLASK_APP}"
