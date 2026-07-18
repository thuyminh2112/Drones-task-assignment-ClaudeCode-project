"""Desktop entry point: starts the FastAPI/uvicorn server and opens the
app in the system's default browser. This is what gets bundled into the
Windows .exe by PyInstaller (see desktop/build.spec)."""
from __future__ import annotations

import sys
import threading
import time
import webbrowser
from pathlib import Path

# Make the `backend` package importable whether this runs as a plain script
# or as a PyInstaller-frozen executable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn

from backend.main import app

HOST = "127.0.0.1"
PORT = 8000


def _open_browser_when_ready() -> None:
    time.sleep(1.5)
    webbrowser.open(f"http://{HOST}:{PORT}")


if __name__ == "__main__":
    threading.Thread(target=_open_browser_when_ready, daemon=True).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
