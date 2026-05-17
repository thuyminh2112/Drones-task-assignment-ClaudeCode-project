from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


# ── Server → Client ──────────────────────────────────────────────────

class TrainingProgressMsg(BaseModel):
    type: Literal["training_progress"] = "training_progress"
    episode: int
    total_episodes: int
    mean_reward: float
    tasks_completed_rate: float


class TrainingDoneMsg(BaseModel):
    type: Literal["training_done"] = "training_done"
    final_reward: float
    total_episodes: int


class SimStepMsg(BaseModel):
    type: Literal["sim_step"] = "sim_step"
    step: int
    uavs: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    stats: Dict[str, Any]


class SimDoneMsg(BaseModel):
    type: Literal["sim_done"] = "sim_done"
    steps: int
    tasks_completed: int
    workload_done: int


class ErrorMsg(BaseModel):
    type: Literal["error"] = "error"
    message: str


class SessionCreatedMsg(BaseModel):
    type: Literal["session_created"] = "session_created"
    session_id: str
    env_config: Dict[str, Any]


# ── Client → Server ──────────────────────────────────────────────────

class ClientMsg(BaseModel):
    type: str
