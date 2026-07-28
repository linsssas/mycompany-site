from ..config import PIPELINE_MODE
from .base import GenerationParams, Trellis3DPipeline
from .mock import MockPipeline

_active_pipeline: Trellis3DPipeline | None = None


def get_pipeline() -> Trellis3DPipeline:
    global _active_pipeline
    if _active_pipeline is not None:
        return _active_pipeline

    if PIPELINE_MODE == "mock":
        _active_pipeline = MockPipeline()
    elif PIPELINE_MODE == "real":
        from .real import RealPipeline

        _active_pipeline = RealPipeline()
    else:  # auto
        from . import real

        if real.is_available():
            from .real import RealPipeline

            _active_pipeline = RealPipeline()
        else:
            _active_pipeline = MockPipeline()

    return _active_pipeline


__all__ = ["GenerationParams", "Trellis3DPipeline", "get_pipeline"]
