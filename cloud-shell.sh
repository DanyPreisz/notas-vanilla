#!/usr/bin/env bash
set -euo pipefail

gcloud config set project "$(gcloud projects list --filter='projectNumber=6451687015' --format='value(projectId)')"

if [[ ! -f package.json ]]; then
  git clone https://github.com/DanyPreisz/notas-vanilla.git
  cd notas-vanilla
fi

export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
echo "Token del front: ${JWT_SECRET}"

cat > /tmp/notas-env.yaml << EOF
MONGODB_URI: "mongodb+srv://dani:dany2233@cluster0.rqkadaa.mongodb.net/series?retryWrites=true&w=majority&authSource=admin"
MONGODB_DB: "notas"
JWT_SECRET: "${JWT_SECRET}"
EOF

gcloud run deploy notas-vanilla \
  --region europe-west1 \
  --source . \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu-boost \
  --timeout 300 \
  --env-vars-file /tmp/notas-env.yaml

rm -f /tmp/notas-env.yaml
gcloud run services describe notas-vanilla --region europe-west1 --format='value(status.url)'
