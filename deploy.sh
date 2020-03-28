#!/usr/bin/env bash

set -euo pipefail

yarn build
docker build -t gcr.io/oneoff-project/optcalc:latest .
docker push gcr.io/oneoff-project/optcalc:latest
gcloud run deploy optcalc --image gcr.io/oneoff-project/optcalc:latest --allow-unauthenticated --platform managed --region us-central1
