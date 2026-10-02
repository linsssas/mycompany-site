"""Thin wrapper around the public microsoft/TRELLIS.2 Hugging Face Space.

Calls the Space's Gradio API exactly the way its own app.py wires up the UI
(see https://github.com/microsoft/TRELLIS.2/blob/main/app.py): a first call
generates the 3D structure ("/image_to_3d"), returning an opaque state
object plus a preview; a second call turns that state into an actual GLB
file ("/extract_glb").

This module makes real network calls to a Space Microsoft operates and does
not control - it can be slow, queued, rate-limited, or occasionally change
its API surface. If a call fails with "endpoint not found", use
`describe_api()` to print the Space's current endpoint list and adjust the
`api_name` values below to match.
"""

from __future__ import annotations

import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from PIL import Image

SPACE_ID = "microsoft/TRELLIS.2"
MAX_SEED = 2_147_483_647

# Defaults mirror the sliders' default values in the Space's own app.py.
_SS_PARAMS = dict(guidance_strength=7.5, guidance_rescale=0.7, sampling_steps=12, rescale_t=5.0)
_SHAPE_PARAMS = dict(guidance_strength=7.5, guidance_rescale=0.5, sampling_steps=12, rescale_t=3.0)
_TEX_PARAMS = dict(guidance_strength=1.0, guidance_rescale=0.0, sampling_steps=12, rescale_t=3.0)

StatusCallback = Callable[[str], None]


class TrellisClientError(RuntimeError):
    pass


@dataclass
class GenerationOptions:
    resolution: str = "1024"  # "512" | "1024" | "1536"
    seed: Optional[int] = None
    decimation_target: int = 500_000
    texture_size: int = 2048


def _noop(_msg: str) -> None:
    pass


def _get_client(hf_token: Optional[str]):
    try:
        from gradio_client import Client
    except ImportError as exc:
        raise TrellisClientError(
            "gradio_client не установлен. Выполните: pip install -r requirements.txt"
        ) from exc

    try:
        return Client(SPACE_ID, hf_token=hf_token)
    except Exception as exc:
        raise TrellisClientError(
            f"Не удалось подключиться к Hugging Face Space {SPACE_ID}: {exc}\n"
            "Проверьте интернет-соединение и что huggingface.co доступен."
        ) from exc


def describe_api(hf_token: Optional[str] = None) -> str:
    """Returns the Space's current list of callable API endpoints - useful
    for troubleshooting if api_name values below stop matching."""
    client = _get_client(hf_token)
    return str(client.view_api(print_info=False, return_format="dict"))


def generate_glb(
    image_path: Path,
    out_path: Path,
    options: GenerationOptions = GenerationOptions(),
    status_cb: StatusCallback = _noop,
    hf_token: Optional[str] = None,
) -> Path:
    """Uploads the image at image_path to the public TRELLIS.2 Space and
    writes the resulting GLB to out_path. Raises TrellisClientError on any
    failure, with the underlying Gradio error message included."""

    image = Image.open(image_path).convert("RGBA")
    seed = options.seed if options.seed is not None else random.randint(0, MAX_SEED)

    status_cb(f"Подключение к {SPACE_ID}…")
    client = _get_client(hf_token)

    status_cb("Этап 1/2: генерация 3D-структуры (может занять несколько минут в общей очереди)…")
    try:
        state, _preview_html = client.predict(
            image,
            seed,
            options.resolution,
            _SS_PARAMS["guidance_strength"],
            _SS_PARAMS["guidance_rescale"],
            _SS_PARAMS["sampling_steps"],
            _SS_PARAMS["rescale_t"],
            _SHAPE_PARAMS["guidance_strength"],
            _SHAPE_PARAMS["guidance_rescale"],
            _SHAPE_PARAMS["sampling_steps"],
            _SHAPE_PARAMS["rescale_t"],
            _TEX_PARAMS["guidance_strength"],
            _TEX_PARAMS["guidance_rescale"],
            _TEX_PARAMS["sampling_steps"],
            _TEX_PARAMS["rescale_t"],
            api_name="/image_to_3d",
        )
    except Exception as exc:
        raise TrellisClientError(
            f"Ошибка на этапе генерации 3D-структуры: {exc}\n\n"
            "Если ошибка похожа на 'endpoint не найден' - у Space, возможно, "
            "изменились имена эндпоинтов. Запустите describe_api() и поправьте "
            "api_name в trellis_client.py."
        ) from exc

    status_cb("Этап 2/2: экспорт в GLB…")
    try:
        glb_path, _download_path = client.predict(
            state,
            options.decimation_target,
            options.texture_size,
            api_name="/extract_glb",
        )
    except Exception as exc:
        raise TrellisClientError(f"Ошибка на этапе экспорта GLB: {exc}") from exc

    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(glb_path, out_path)
    status_cb("Готово!")
    return out_path
