#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "vendor/TRELLIS.2/trellis2" ]; then
  echo "First run: provisioning the real TRELLIS.2 pipeline (this can take a while)..."
  ./scripts/setup_real_model.sh
  conda run -n trellis2 pip install --no-cache-dir -r requirements.txt
else
  echo "TRELLIS.2 already provisioned, skipping setup."
fi

exec conda run --no-capture-output -n trellis2 \
  uvicorn app.main:app --host 0.0.0.0 --port 8000
