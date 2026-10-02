"""Real TRELLIS.2 pipeline wrapper.

Mirrors the exact flow used by microsoft/TRELLIS.2's own app.py
(see https://github.com/microsoft/TRELLIS.2/blob/main/app.py):

    pipeline = Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')
    pipeline.cuda()
    image = pipeline.preprocess_image(image)
    outputs, latents = pipeline.run(image, seed=..., preprocess_image=False,
                                     sparse_structure_sampler_params={...},
                                     shape_slat_sampler_params={...},
                                     tex_slat_sampler_params={...},
                                     pipeline_type=..., return_latent=True)
    mesh = pipeline.decode_latent(shape_slat, tex_slat, res)[0]
    glb = o_voxel.postprocess.to_glb(vertices=..., faces=..., attr_volume=...,
                                      coords=..., attr_layout=..., grid_size=res,
                                      aabb=[[-.5]*3, [.5]*3], decimation_target=...,
                                      texture_size=..., remesh=True)
    glb.export(path, extension_webp=True)

This module only imports the vendored TRELLIS.2 code lazily, inside
`is_available()` / `load()`, so the rest of the backend can run on machines
that don't have a GPU or the vendored repo checked out at all. Provision it
with backend/scripts/setup_real_model.sh on a Linux box with an NVIDIA GPU
(>=24GB VRAM).
"""

from pathlib import Path

from PIL import Image

from ..config import VENDOR_DIR
from .base import GenerationParams, Trellis3DPipeline

_PIPELINE_TYPE_BY_RESOLUTION = {
    512: "512",
    1024: "1024_cascade",
    1536: "1536_cascade",
}

_pipeline_singleton = None


def is_available() -> bool:
    try:
        import torch
    except ImportError:
        return False

    if not torch.cuda.is_available():
        return False

    if not (VENDOR_DIR / "trellis2").exists():
        return False

    return True


def _load_singleton():
    global _pipeline_singleton
    if _pipeline_singleton is not None:
        return _pipeline_singleton

    import sys

    sys.path.insert(0, str(VENDOR_DIR))

    # These modules only exist once backend/scripts/setup_real_model.sh has
    # cloned microsoft/TRELLIS.2 into VENDOR_DIR and its checkpoints have
    # been downloaded from huggingface.co/microsoft/TRELLIS.2-4B.
    from trellis2.pipelines import Trellis2ImageTo3DPipeline  # type: ignore

    _pipeline_singleton = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
    _pipeline_singleton.cuda()
    return _pipeline_singleton


class RealPipeline(Trellis3DPipeline):
    name = "real"

    def generate(self, image: Image.Image, params: GenerationParams, out_glb_path: Path) -> None:
        import torch
        import o_voxel  # type: ignore

        pipeline = _load_singleton()
        pipeline_type = _PIPELINE_TYPE_BY_RESOLUTION[params.resolution]

        sampler_params = {
            "steps": params.steps,
            "guidance_strength": params.guidance,
            "guidance_rescale": 0.0,
            "rescale_t": 1.0,
        }

        outputs, latents = pipeline.run(
            image,
            seed=params.seed,
            preprocess_image=True,
            sparse_structure_sampler_params=sampler_params,
            shape_slat_sampler_params=sampler_params,
            tex_slat_sampler_params=sampler_params,
            pipeline_type=pipeline_type,
            return_latent=True,
        )
        mesh = outputs[0]
        mesh.simplify(16777216)  # nvdiffrast limit, matches upstream app.py

        shape_slat, tex_slat, res = latents
        decoded = pipeline.decode_latent(shape_slat, tex_slat, res)[0]
        glb = o_voxel.postprocess.to_glb(
            vertices=decoded.vertices,
            faces=decoded.faces,
            attr_volume=decoded.attrs,
            coords=decoded.coords,
            attr_layout=pipeline.pbr_attr_layout,
            grid_size=res,
            aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
            decimation_target=1_000_000,
            texture_size=1024,
            remesh=True,
            remesh_band=1,
            remesh_project=0,
            use_tqdm=False,
        )
        glb.export(str(out_glb_path), extension_webp=True)
        torch.cuda.empty_cache()
