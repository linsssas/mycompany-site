# CPU image - runs the app in mock mode (FORGE3D_PIPELINE_MODE=mock).
# For the real TRELLIS.2 pipeline on a GPU host, see Dockerfile.gpu instead.
#
# Build context must be the trellis-clone/ project root (not backend/), e.g.:
#   docker build -f backend/Dockerfile -t forge3d-backend .
FROM python:3.11-slim

WORKDIR /srv/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY frontend /srv/frontend

ENV FORGE3D_PIPELINE_MODE=mock
ENV FORGE3D_OUTPUT_DIR=/srv/backend/outputs

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
