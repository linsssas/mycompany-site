"""Forge3D Desktop - drop a photo, get a 3D model.

Calls the public microsoft/TRELLIS.2 Hugging Face Space over the network
(see trellis_client.py) - no local GPU needed, but generation depends on
that Space being reachable and its public queue.

Run:
    pip install -r requirements.txt
    python app.py
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from trellis_client import GenerationOptions, TrellisClientError, describe_api, generate_glb

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD

    _HAS_DND = True
except ImportError:
    _HAS_DND = False

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")


def open_in_file_manager(path: Path) -> None:
    system = platform.system()
    try:
        if system == "Windows":
            os.startfile(path)  # type: ignore[attr-defined]
        elif system == "Darwin":
            subprocess.run(["open", str(path)], check=False)
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
    except Exception:
        pass


class Forge3DDesktopApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Forge3D Desktop — фото → 3D")
        self.root.geometry("460x560")
        self.root.minsize(420, 520)

        self.image_path: Path | None = None
        self.out_path: Path | None = None

        self._build_ui()

    # --- UI ---------------------------------------------------------------
    def _build_ui(self) -> None:
        pad = {"padx": 16, "pady": 8}

        header = tk.Label(self.root, text="Forge3D Desktop", font=("Segoe UI", 16, "bold"))
        header.pack(anchor="w", **pad)

        subtitle = tk.Label(
            self.root,
            text="Перетащите фото сюда — модель сгенерируется через\n"
            "публичный Hugging Face Space microsoft/TRELLIS.2.",
            justify="left",
            fg="#555",
        )
        subtitle.pack(anchor="w", padx=16)

        self.dropzone = tk.Label(
            self.root,
            text="⤴  Перетащите изображение\nили нажмите, чтобы выбрать файл",
            width=40,
            height=8,
            bg="#f2f2f7",
            relief="groove",
            cursor="hand2",
        )
        self.dropzone.pack(fill="x", **pad)
        self.dropzone.bind("<Button-1>", lambda _e: self.browse_file())

        if _HAS_DND:
            self.dropzone.drop_target_register(DND_FILES)
            self.dropzone.dnd_bind("<<Drop>>", self._on_drop)
        else:
            subtitle.config(text=subtitle["text"] + "\n(drag&drop недоступен — используйте выбор файла)")

        options_frame = tk.Frame(self.root)
        options_frame.pack(fill="x", **pad)

        tk.Label(options_frame, text="Разрешение:").grid(row=0, column=0, sticky="w")
        self.resolution_var = tk.StringVar(value="1024")
        ttk.Combobox(
            options_frame,
            textvariable=self.resolution_var,
            values=["512", "1024", "1536"],
            width=8,
            state="readonly",
        ).grid(row=0, column=1, sticky="w", padx=8)

        tk.Label(options_frame, text="Seed (пусто = случайный):").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.seed_var = tk.StringVar(value="")
        tk.Entry(options_frame, textvariable=self.seed_var, width=12).grid(
            row=1, column=1, sticky="w", padx=8, pady=(6, 0)
        )

        self.generate_btn = tk.Button(
            self.root, text="Сгенерировать 3D", command=self.on_generate, state="disabled", height=2
        )
        self.generate_btn.pack(fill="x", **pad)

        self.status_var = tk.StringVar(value="Ждём изображение…")
        tk.Label(self.root, textvariable=self.status_var, wraplength=420, justify="left", fg="#333").pack(
            anchor="w", padx=16
        )

        self.progress = ttk.Progressbar(self.root, mode="indeterminate")
        self.progress.pack(fill="x", padx=16, pady=(4, 8))

        self.result_frame = tk.Frame(self.root)
        self.result_frame.pack(fill="x", padx=16)
        self.open_folder_btn = tk.Button(
            self.result_frame, text="Показать в папке", command=self._open_result_folder, state="disabled"
        )
        self.open_folder_btn.pack(side="left")

        debug_btn = tk.Button(self.root, text="Диагностика API Space", command=self.on_debug_api)
        debug_btn.pack(anchor="e", padx=16, pady=(8, 0))

    # --- file selection -----------------------------------------------------
    def _on_drop(self, event) -> None:
        raw = event.data
        # tkinterdnd2 wraps paths with spaces in {}; may deliver multiple paths.
        path_str = raw.strip("{}").split("} {")[0]
        self._set_image(Path(path_str))

    def browse_file(self) -> None:
        path_str = filedialog.askopenfilename(
            title="Выберите изображение",
            filetypes=[("Изображения", "*.png *.jpg *.jpeg *.webp *.bmp")],
        )
        if path_str:
            self._set_image(Path(path_str))

    def _set_image(self, path: Path) -> None:
        if path.suffix.lower() not in IMAGE_EXTS:
            messagebox.showerror("Не изображение", f"Файл {path.name} не похож на изображение.")
            return
        self.image_path = path
        self.dropzone.config(text=f"✓ {path.name}")
        self.generate_btn.config(state="normal")
        self.status_var.set("Готово к генерации.")

    # --- generation -----------------------------------------------------
    def on_generate(self) -> None:
        if not self.image_path:
            return
        seed_text = self.seed_var.get().strip()
        seed = int(seed_text) if seed_text.isdigit() else None
        options = GenerationOptions(resolution=self.resolution_var.get(), seed=seed)

        self.generate_btn.config(state="disabled")
        self.open_folder_btn.config(state="disabled")
        self.progress.start(12)
        self.status_var.set("Запускаем генерацию…")

        thread = threading.Thread(target=self._run_generation, args=(options,), daemon=True)
        thread.start()

    def _run_generation(self, options: GenerationOptions) -> None:
        assert self.image_path is not None
        out_path = self.image_path.with_name(self.image_path.stem + "_3d.glb")

        def status_cb(msg: str) -> None:
            self.root.after(0, self.status_var.set, msg)

        try:
            generate_glb(self.image_path, out_path, options, status_cb=status_cb, hf_token=os.environ.get("HF_TOKEN"))
        except TrellisClientError as exc:
            self.root.after(0, self._on_error, str(exc))
            return
        except Exception as exc:  # noqa: BLE001 - surface any unexpected failure
            self.root.after(0, self._on_error, f"Непредвиденная ошибка: {exc}")
            return

        self.root.after(0, self._on_success, out_path)

    def _on_success(self, out_path: Path) -> None:
        self.progress.stop()
        self.out_path = out_path
        self.status_var.set(f"Готово! Сохранено в {out_path}")
        self.generate_btn.config(state="normal")
        self.open_folder_btn.config(state="normal")

    def _on_error(self, message: str) -> None:
        self.progress.stop()
        self.status_var.set("Ошибка. Подробности ниже.")
        self.generate_btn.config(state="normal")
        messagebox.showerror("Ошибка генерации", message)

    def _open_result_folder(self) -> None:
        if self.out_path:
            open_in_file_manager(self.out_path.parent)

    def on_debug_api(self) -> None:
        def worker() -> None:
            try:
                info = describe_api(hf_token=os.environ.get("HF_TOKEN"))
            except TrellisClientError as exc:
                self.root.after(0, messagebox.showerror, "Диагностика", str(exc))
                return
            self.root.after(0, self._show_debug_window, info)

        threading.Thread(target=worker, daemon=True).start()
        self.status_var.set("Запрашиваем список API-эндпоинтов у Space…")

    def _show_debug_window(self, info: str) -> None:
        win = tk.Toplevel(self.root)
        win.title("API microsoft/TRELLIS.2")
        win.geometry("640x480")
        text = tk.Text(win, wrap="word")
        text.insert("1.0", info)
        text.config(state="disabled")
        text.pack(fill="both", expand=True)
        self.status_var.set("Готово к генерации." if self.image_path else "Ждём изображение…")


def main() -> None:
    root = TkinterDnD.Tk() if _HAS_DND else tk.Tk()
    Forge3DDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
