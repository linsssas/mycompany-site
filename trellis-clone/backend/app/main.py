import io

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .config import (
    ALLOWED_RESOLUTIONS,
    BASE_DIR,
    DEFAULT_GUIDANCE,
    DEFAULT_RESOLUTION,
    DEFAULT_STEPS,
    MAX_UPLOAD_BYTES,
)
from .jobs import JobStatus, create_job, get_job, run_job
from .pipelines import GenerationParams, get_pipeline

app = FastAPI(title="Forge3D API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    pipeline = get_pipeline()
    return {"status": "ok", "pipeline": pipeline.name}


@app.post("/api/jobs")
async def submit_job(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    resolution: int = Form(DEFAULT_RESOLUTION),
    seed: int = Form(0),
    steps: int = Form(DEFAULT_STEPS),
    guidance: float = Form(DEFAULT_GUIDANCE),
):
    if resolution not in ALLOWED_RESOLUTIONS:
        raise HTTPException(400, f"resolution must be one of {ALLOWED_RESOLUTIONS}")

    raw = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "image too large")

    try:
        pil_image = Image.open(io.BytesIO(raw))
        pil_image.load()
    except Exception as exc:
        raise HTTPException(400, f"invalid image: {exc}") from exc

    job = create_job()
    params = GenerationParams(resolution=resolution, seed=seed, steps=steps, guidance=guidance)
    background_tasks.add_task(run_job, job.id, pil_image, params)

    return {"job_id": job.id, "status": job.status}


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "job not found")
    return {
        "job_id": job.id,
        "status": job.status,
        "error": job.error,
        "pipeline": job.pipeline_name,
        "download_url": f"/api/jobs/{job_id}/download" if job.status == JobStatus.DONE else None,
    }


@app.get("/api/jobs/{job_id}/download")
def job_download(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "job not found")
    if job.status != JobStatus.DONE or job.glb_path is None:
        raise HTTPException(409, f"job is not finished (status={job.status})")
    return FileResponse(job.glb_path, media_type="model/gltf-binary", filename=f"{job_id}.glb")


# Serve the static frontend (built with no build step - plain HTML/JS/CSS).
FRONTEND_DIR = BASE_DIR.parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
