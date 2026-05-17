from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

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
