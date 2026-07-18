import sys
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .api.websocket import websocket_endpoint

app = FastAPI(title="UAV Task Assignment")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/{session_id}")
async def ws_route(websocket: WebSocket, session_id: str) -> None:
    await websocket_endpoint(websocket, session_id)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


def _frontend_dist_dir() -> Path:
    """Locate the built frontend, whether running from source or a PyInstaller bundle."""
    bundle_root = getattr(sys, "_MEIPASS", None)
    if bundle_root:
        return Path(bundle_root) / "frontend_dist"
    return Path(__file__).resolve().parent.parent / "frontend" / "dist"


# Serve the built frontend (if present) at "/" — mounted last so it acts as a
# fallback and never shadows the /api, /ws, or /health routes above. Absent
# in plain dev mode (Vite's own dev server serves the frontend instead).
_dist_dir = _frontend_dist_dir()
if _dist_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")
