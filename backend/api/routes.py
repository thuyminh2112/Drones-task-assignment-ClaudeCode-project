from __future__ import annotations
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from ..schemas.config import SimConfig
from .websocket import create_session, delete_session, get_session

router = APIRouter(prefix="/api")


@router.post("/session/start")
async def start_session(config: SimConfig) -> Dict[str, Any]:
    session_id = create_session(config)
    env_cfg = config.to_env_config()
    return {
        "session_id": session_id,
        "env_config": env_cfg,
        "n_uavs": env_cfg["n_uavs"],
        "n_tasks": env_cfg["n_tasks"],
        "capacities": env_cfg["capacities"],
        "workloads": env_cfg["workloads"],
    }


@router.get("/session/{session_id}/status")
async def session_status(session_id: str) -> Dict[str, Any]:
    sess = get_session(session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "phase": sess.phase}


@router.post("/session/{session_id}/stop")
async def stop_session(session_id: str) -> Dict[str, Any]:
    sess = get_session(session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    delete_session(session_id)
    return {"ok": True}
