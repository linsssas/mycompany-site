# Forge3D

Собственное приложение image-to-3D в духе [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2):
загружаете изображение объекта — получаете 3D-модель (GLB) с текстурой, которую можно
покрутить в браузере и скачать.

Это не форк и не зеркало чужого Space — своя реализация (свой бэкенд, свой UI, свой бренд),
которая **умеет работать в двух режимах**:

## Есть и десктоп-версия

`desktop-app/` — настольное окно (Python/tkinter): перетаскиваете фото, оно генерирует
настоящую 3D-модель через публичный HF Space `microsoft/TRELLIS.2` по сети, без GPU на вашей
машине. См. `desktop-app/README.md`.

## Режимы работы (веб-версия, backend + frontend)

| Режим | Что делает | Требования |
|---|---|---|
| **mock** (по умолчанию) | Строит 3D-модель процедурно: цвет и рельеф меша берутся из загруженного изображения (сферическая проекция + смещение по яркости), seed/steps/guidance влияют на результат так же, как в реальном пайплайне. Полностью честная демонстрация UI/API-потока. | Ничего, кроме Python. Работает и без GPU. |
| **real** | Настоящий [microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2) — 4B-параметрическая диффузионная модель (O-Voxel + структурные латенты), даёт результат такого же качества, как оригинальный HF Space. | Linux, NVIDIA GPU ≥24GB VRAM (A100/H100), CUDA 12.4, conda. |

Почему два режима: настоящий TRELLIS.2 — это модель на 4 млрд параметров, которой для
инференса нужен GPU с 24+ ГБ видеопамяти (см. [требования апстрима](https://github.com/microsoft/TRELLIS.2)).
В песочнице/CI без GPU её не запустить и не проверить — поэтому есть mock-режим,
который честно так и называется в интерфейсе (бейдж "движок: mock-режим"), и не выдаёт
процедурную заглушку за настоящую генерацию.

Backend сам определяет, какой режим доступен (`FORGE3D_PIPELINE_MODE=auto`, значение по
умолчанию): если виден CUDA GPU и склонирован `backend/vendor/TRELLIS.2`, используется
`real`, иначе — `mock`. Можно принудительно задать режим переменной окружения
`FORGE3D_PIPELINE_MODE=mock|real`.

## Структура проекта

```
trellis-clone/
  backend/
    app/
      main.py           # FastAPI: /api/jobs, /api/jobs/{id}, /api/jobs/{id}/download
      jobs.py           # простая in-memory очередь заданий
      pipelines/
        mock.py         # процедурный image->3D (trimesh), работает без GPU
        real.py         # обёртка над настоящим TRELLIS2ImageTo3DPipeline
    scripts/
      setup_real_model.sh  # клонирует microsoft/TRELLIS.2, ставит зависимости, тянет чекпоинт
    Dockerfile          # CPU-образ, mock-режим
    Dockerfile.gpu       # GPU-образ, реальный TRELLIS.2 (провижининг при первом старте контейнера)
    entrypoint.sh
  frontend/
    index.html / style.css / app.js   # без сборки, чистый HTML/JS, <model-viewer> для рендера GLB
  docker-compose.yml
```

## Быстрый старт (mock-режим, без GPU)

```bash
cd trellis-clone/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Открыть http://localhost:8000 — там форма загрузки изображения, настройки (разрешение,
seed, шаги диффузии, guidance) и 3D-просмотрщик.

Через Docker:

```bash
cd trellis-clone
docker compose up backend
```

## Включение настоящего TRELLIS.2 (нужен GPU)

На Linux-машине с NVIDIA GPU (≥24GB VRAM):

```bash
cd trellis-clone/backend
./scripts/setup_real_model.sh   # клонирует microsoft/TRELLIS.2, ставит conda-окружение trellis2,
                                 # компилирует flash-attn/nvdiffrast/nvdiffrec/CuMesh/O-Voxel/FlexGEMM,
                                 # скачивает чекпоинт microsoft/TRELLIS.2-4B с Hugging Face
conda activate trellis2
pip install -r requirements.txt
FORGE3D_PIPELINE_MODE=real uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Или через Docker на GPU-хосте с NVIDIA Container Toolkit:

```bash
cd trellis-clone
docker compose --profile gpu up backend-gpu
```

Провижининг (клонирование + сборка + скачивание чекпоинта) выполняется один раз при первом
старте контейнера и кешируется в volume `forge3d-vendor` / `forge3d-hf-cache`.

### Где взять GPU, если своего нет

Готового GPU в этой песочнице/CI нет и не будет — реальный пайплайн нужно поднимать на
отдельной GPU-машине. Варианты: Azure NC A100 / ND-серия, Lambda Labs, RunPod, Modal,
Google Cloud A100/H100, либо собственный сервер с подходящей картой. `setup_real_model.sh`
и `Dockerfile.gpu` рассчитаны на такие хосты.

## API

- `POST /api/jobs` — multipart form: `image` (файл), `resolution` (512/1024/1536),
  `seed`, `steps`, `guidance`. Возвращает `{job_id, status}`.
- `GET /api/jobs/{job_id}` — статус (`queued|running|done|error`) и `download_url`, когда готово.
- `GET /api/jobs/{job_id}/download` — сам GLB-файл.
- `GET /api/health` — `{status, pipeline}`, где `pipeline` — `mock` или `real`.

## Лицензия и происхождение кода

Собственный код (backend/frontend в этом каталоге) — ваш, делайте с ним что хотите.
`real.py` — это тонкая обёртка над публичным API официального репозитория
[microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2) (MIT), который клонируется
отдельно скриптом `setup_real_model.sh` и не включён в этот репозиторий. Веса модели
(`microsoft/TRELLIS.2-4B`) распространяются Microsoft через Hugging Face на их собственных
условиях — ознакомьтесь с лицензией модели перед коммерческим использованием.
