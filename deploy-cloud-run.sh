#!/usr/bin/env bash
# Un solo comando: lee .env, toma el proyecto de gcloud y publica en Cloud Run.
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-notas-vanilla}"
MONGODB_DB="${MONGODB_DB:-notas}"

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "Falta MONGODB_URI. Copiá .env.example a .env y completalo." >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Instalá Google Cloud SDK: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

if [[ -z "${PROJECT_ID:-}" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  PROJECT_ID="$(gcloud projects list --filter="projectNumber=6451687015" --format="value(projectId)" 2>/dev/null | head -1 || true)"
fi
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "No hay proyecto. Una vez: gcloud auth login && gcloud config set project TU_PROYECTO" >&2
  exit 1
fi

if [[ -z "${NOTES_TOKEN:-}" && "${CI:-}" != "true" ]]; then
  NOTES_TOKEN="$(openssl rand -hex 24)"
  printf '\nNOTES_TOKEN=%s\n' "$NOTES_TOKEN" >> .env
  echo "Guardé NOTES_TOKEN en .env. El front lo pide una vez por pestaña."
fi

echo "Proyecto: $PROJECT_ID  región: $REGION  servicio: $SERVICE"
gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet

# ^@^ evita que una coma de la URI corte las variables.
ENV_VARS="^@^MONGODB_URI=${MONGODB_URI}@MONGODB_DB=${MONGODB_DB}"
if [[ -n "${NOTES_TOKEN:-}" ]]; then
  ENV_VARS="${ENV_VARS}@NOTES_TOKEN=${NOTES_TOKEN}"
fi

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu-boost \
  --timeout 300 \
  --quiet \
  --set-env-vars "$ENV_VARS"

echo "URL:"
gcloud run services describe "$SERVICE" --region "$REGION" --format="value(status.url)"
