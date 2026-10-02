"""Mock image-to-3D pipeline.

This does NOT reproduce TRELLIS.2's diffusion-based reconstruction — that
requires the real 4B-parameter model on an NVIDIA GPU with >=24GB VRAM (see
backend/scripts/setup_real_model.sh). This mock exists so the full
upload -> job -> 3D-viewer flow can be exercised on any machine, including
one with no GPU at all: it deterministically turns the uploaded image into a
textured/colored displaced-sphere mesh, using the seed/steps/guidance knobs
to vary the result the same way the real pipeline's knobs would.
"""

import math

import numpy as np
import trimesh
from PIL import Image

from .base import GenerationParams, Trellis3DPipeline

_SUBDIVISIONS_BY_RESOLUTION = {512: 3, 1024: 4, 1536: 5}


def _spherical_uv(vertices: np.ndarray) -> np.ndarray:
    norm = vertices / np.linalg.norm(vertices, axis=1, keepdims=True)
    u = 0.5 + np.arctan2(norm[:, 0], norm[:, 2]) / (2 * math.pi)
    v = 0.5 - np.arcsin(np.clip(norm[:, 1], -1, 1)) / math.pi
    return np.stack([u, v], axis=1), norm


def _sample_image(image: Image.Image, uv: np.ndarray) -> np.ndarray:
    w, h = image.size
    xs = np.clip((uv[:, 0] * w).astype(int), 0, w - 1)
    ys = np.clip((uv[:, 1] * h).astype(int), 0, h - 1)
    arr = np.asarray(image)
    return arr[ys, xs].astype(np.float32) / 255.0


class MockPipeline(Trellis3DPipeline):
    name = "mock"

    def generate(self, image: Image.Image, params: GenerationParams, out_glb_path) -> None:
        image = image.convert("RGB")

        subdivisions = _SUBDIVISIONS_BY_RESOLUTION.get(params.resolution, 3)
        sphere = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
        vertices = sphere.vertices.copy()

        uv, normals = _spherical_uv(vertices)
        colors = _sample_image(image, uv)
        luminance = colors @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

        rng = np.random.default_rng(params.seed)
        noise = rng.normal(scale=0.02, size=luminance.shape[0]).astype(np.float32)

        guidance_strength = np.clip(params.guidance / 15.0, 0.05, 1.0)
        displacement = (luminance - luminance.mean()) * 0.35 * guidance_strength + noise
        vertices = vertices + normals * displacement[:, None]

        mesh = trimesh.Trimesh(vertices=vertices, faces=sphere.faces, process=False)
        vertex_colors = np.concatenate(
            [colors, np.ones((colors.shape[0], 1), dtype=np.float32)], axis=1
        )
        mesh.visual = trimesh.visual.color.ColorVisuals(
            mesh=mesh, vertex_colors=(vertex_colors * 255).astype(np.uint8)
        )
        mesh.export(out_glb_path, file_type="glb")
