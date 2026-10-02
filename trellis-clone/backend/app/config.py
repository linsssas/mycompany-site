import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VENDOR_DIR = BASE_DIR / "vendor" / "TRELLIS.2"
OUTPUT_DIR = Path(os.environ.get("FORGE3D_OUTPUT_DIR", BASE_DIR / "outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# "auto"  -> use the real TRELLIS.2 pipeline if a CUDA GPU + checkpoints are present,
#            otherwise fall back to the mock pipeline
# "real"  -> force the real pipeline (fails loudly if unavailable)
# "mock"  -> force the mock pipeline (useful for UI/dev work without a GPU)
PIPELINE_MODE = os.environ.get("FORGE3D_PIPELINE_MODE", "auto")

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB
ALLOWED_RESOLUTIONS = (512, 1024, 1536)
DEFAULT_RESOLUTION = 512
DEFAULT_STEPS = 25
DEFAULT_GUIDANCE = 7.5
