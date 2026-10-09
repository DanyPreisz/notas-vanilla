#!/usr/bin/env bash
set -euo pipefail
: "${MONGODB_URI:?Defini MONGODB_URI}"
: "${PROJECT_ID:?Defini PROJECT_ID}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-notas-vanilla}"

gcloud config set project "$PROJECT_ID"

ENV_VARS="MONGODB_URI=${MONGODB_URI},MONGODB_DB=${MONGODB_DB:-notas}"
if [ -n "${NOTES_TOKEN:-}" ]; then
  ENV_VARS="${ENV_VARS},NOTES_TOKEN=${NOTES_TOKEN}"
fi

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu-boost \
  --timeout 300 \
  --set-env-vars "$ENV_VARS"

gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)'
