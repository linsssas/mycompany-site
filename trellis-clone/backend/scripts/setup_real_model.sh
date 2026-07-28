#!/usr/bin/env bash
# Provisions the real microsoft/TRELLIS.2 pipeline for GPU deployment.
#
# Requirements (per https://github.com/microsoft/TRELLIS.2):
#   - Linux host
#   - NVIDIA GPU with >= 24GB VRAM (validated on A100 / H100)
#   - CUDA Toolkit 12.4
#   - Conda
#
# Run this on the GPU host/container that will actually serve requests -
# it will NOT work in a CPU-only sandbox.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$BACKEND_DIR/vendor/TRELLIS.2"

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "error: no NVIDIA GPU detected (nvidia-smi not found). Aborting." >&2
  exit 1
fi

mkdir -p "$BACKEND_DIR/vendor"

if [ ! -d "$VENDOR_DIR" ]; then
  echo "Cloning microsoft/TRELLIS.2 into $VENDOR_DIR ..."
  git clone --recursive https://github.com/microsoft/TRELLIS.2 "$VENDOR_DIR"
else
  echo "Vendor directory already present at $VENDOR_DIR, skipping clone."
fi

cd "$VENDOR_DIR"

echo "Running upstream setup.sh (creates conda env 'trellis2', installs flash-attn,"
echo "nvdiffrast, nvdiffrec, CuMesh, O-Voxel, FlexGEMM) ..."
. ./setup.sh --new-env --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm

echo
echo "Downloading TRELLIS.2-4B checkpoint from Hugging Face (microsoft/TRELLIS.2-4B) ..."
conda run -n trellis2 python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download("microsoft/TRELLIS.2-4B")
PY

cat <<'EOF'

Done. To run the backend against the real model:

  conda activate trellis2
  pip install -r ../requirements.txt
  FORGE3D_PIPELINE_MODE=real uvicorn app.main:app --host 0.0.0.0 --port 8000

(FORGE3D_PIPELINE_MODE=auto, the default, will also pick the real pipeline
automatically now that vendor/TRELLIS.2/trellis2 exists and a CUDA GPU is
visible.)
EOF
