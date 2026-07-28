import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

from PIL import Image

from .config import OUTPUT_DIR
from .pipelines import GenerationParams, get_pipeline


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


@dataclass
class Job:
    id: str
    status: JobStatus = JobStatus.QUEUED
    created_at: float = field(default_factory=time.time)
    error: Optional[str] = None
    glb_path: Optional[Path] = None
    pipeline_name: Optional[str] = None


_jobs: dict[str, Job] = {}


def create_job() -> Job:
    job = Job(id=uuid.uuid4().hex)
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def run_job(job_id: str, image: Image.Image, params: GenerationParams) -> None:
    job = _jobs[job_id]
    job.status = JobStatus.RUNNING
    try:
        pipeline = get_pipeline()
        job.pipeline_name = pipeline.name
        out_path = OUTPUT_DIR / f"{job_id}.glb"
        pipeline.generate(image, params, out_path)
        job.glb_path = out_path
        job.status = JobStatus.DONE
    except Exception as exc:  # noqa: BLE001 - surface any pipeline failure to the client
        job.status = JobStatus.ERROR
        job.error = str(exc)
