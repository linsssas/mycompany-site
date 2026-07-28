from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass
class GenerationParams:
    resolution: int = 512
    seed: int = 0
    steps: int = 25
    guidance: float = 7.5


class Trellis3DPipeline(ABC):
    """Common interface both the real TRELLIS.2 pipeline and the mock
    pipeline implement, so the API layer never has to know which one
    is actually running.
    """

    name: str = "base"

    @abstractmethod
    def generate(self, image: Image.Image, params: GenerationParams, out_glb_path: Path) -> None:
        """Run image-to-3D generation and write a .glb file to out_glb_path."""
        raise NotImplementedError
