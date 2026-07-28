const dropzone = document.getElementById("dropzone");
const dropzoneEmpty = document.getElementById("dropzone-empty");
const fileInput = document.getElementById("file-input");
const previewImage = document.getElementById("preview-image");
const generateBtn = document.getElementById("generate-btn");
const statusLine = document.getElementById("status-line");
const modelViewer = document.getElementById("model-viewer");
const viewerEmpty = document.getElementById("viewer-empty");
const downloadBtn = document.getElementById("download-btn");
const pipelineBadge = document.getElementById("pipeline-badge");
const seedInput = document.getElementById("seed");
const randomizeSeedBtn = document.getElementById("randomize-seed");
const stepsInput = document.getElementById("steps");
const stepsValue = document.getElementById("steps-value");
const guidanceInput = document.getElementById("guidance");
const guidanceValue = document.getElementById("guidance-value");
const resolutionSelect = document.getElementById("resolution");

let selectedFile = null;
let pollTimer = null;

function setStatus(text, kind) {
  statusLine.hidden = !text;
  statusLine.textContent = text;
  statusLine.className = "status-line" + (kind ? ` ${kind}` : "");
}

function onFileSelected(file) {
  if (!file || !file.type.startsWith("image/")) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImage.src = url;
  previewImage.hidden = false;
  dropzoneEmpty.hidden = true;
  generateBtn.disabled = false;
}

dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => onFileSelected(e.target.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  })
);
dropzone.addEventListener("drop", (e) => onFileSelected(e.dataTransfer.files[0]));

randomizeSeedBtn.addEventListener("click", () => {
  seedInput.value = Math.floor(Math.random() * 2147483647);
});

stepsInput.addEventListener("input", () => (stepsValue.textContent = stepsInput.value));
guidanceInput.addEventListener("input", () => (guidanceValue.textContent = guidanceInput.value));

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.pipeline === "real") {
      pipelineBadge.textContent = "движок: настоящий TRELLIS.2 (GPU)";
      pipelineBadge.className = "badge mode-real";
    } else {
      pipelineBadge.textContent = "движок: mock-режим (без GPU)";
      pipelineBadge.className = "badge mode-mock";
    }
  } catch {
    pipelineBadge.textContent = "нет соединения с API";
  }
}

async function generate() {
  if (!selectedFile) return;
  generateBtn.disabled = true;
  downloadBtn.hidden = true;
  modelViewer.hidden = true;
  viewerEmpty.hidden = false;
  setStatus("Загружаем изображение…");

  const form = new FormData();
  form.append("image", selectedFile);
  form.append("resolution", resolutionSelect.value);
  form.append("seed", seedInput.value);
  form.append("steps", stepsInput.value);
  form.append("guidance", guidanceInput.value);

  try {
    const res = await fetch("/api/jobs", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const { job_id } = await res.json();
    setStatus("Генерация запущена, это может занять некоторое время…");
    pollJob(job_id);
  } catch (err) {
    setStatus(`Ошибка: ${err.message}`, "error");
    generateBtn.disabled = false;
  }
}

function pollJob(jobId) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (data.status === "running") {
        setStatus("Строим 3D-модель…");
      } else if (data.status === "done") {
        clearInterval(pollTimer);
        setStatus("Готово!", "success");
        showModel(data.download_url);
        generateBtn.disabled = false;
      } else if (data.status === "error") {
        clearInterval(pollTimer);
        setStatus(`Ошибка генерации: ${data.error}`, "error");
        generateBtn.disabled = false;
      }
    } catch (err) {
      clearInterval(pollTimer);
      setStatus(`Ошибка: ${err.message}`, "error");
      generateBtn.disabled = false;
    }
  }, 1500);
}

function showModel(url) {
  modelViewer.src = url;
  modelViewer.hidden = false;
  viewerEmpty.hidden = true;
  downloadBtn.href = url;
  downloadBtn.hidden = false;
}

generateBtn.addEventListener("click", generate);
checkHealth();
