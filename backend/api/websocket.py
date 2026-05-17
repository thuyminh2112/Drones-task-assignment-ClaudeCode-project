from __future__ import annotations
import asyncio
import json
import uuid
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from ..ppo.trainer import MultiAgentPPOTrainer, TrainingProgress
from ..simulation.sim_runner import SimRunner
from ..env.uav_env import UAVTaskEnv
from ..schemas.config import SimConfig
from ..schemas.messages import (
    TrainingProgressMsg, TrainingDoneMsg,
    SimStepMsg, SimDoneMsg, ErrorMsg, SessionCreatedMsg,
)


class Session:
    def __init__(self, session_id: str, config: SimConfig):
        self.session_id = session_id
        self.config = config
        self.ws: Optional[WebSocket] = None
        self.phase: str = "idle"      # idle | training | simulating | paused | done
        self.trainer: Optional[MultiAgentPPOTrainer] = None
        self.runner: Optional[SimRunner] = None
        self.training_task: Optional[asyncio.Task] = None
        self.sim_task: Optional[asyncio.Task] = None
        self._paused = False
        self._final_reward: float = 0.0
        self._total_episodes: int = 0


# Global session store (in-memory; fine for single-server deployment)
_sessions: Dict[str, Session] = {}


def create_session(config: SimConfig) -> str:
    sid = str(uuid.uuid4())[:8]
    _sessions[sid] = Session(sid, config)
    return sid


def get_session(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)


def delete_session(session_id: str) -> None:
    sess = _sessions.pop(session_id, None)
    if sess:
        if sess.training_task and not sess.training_task.done():
            sess.training_task.cancel()
        if sess.sim_task and not sess.sim_task.done():
            sess.sim_task.cancel()
        if sess.trainer:
            sess.trainer.cancel()


# ─── WebSocket handler ────────────────────────────────────────────────

async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    sess = get_session(session_id)
    if sess is None:
        await websocket.accept()
        await websocket.send_text(ErrorMsg(message="Session not found").model_dump_json())
        await websocket.close()
        return

    await websocket.accept()
    sess.ws = websocket

    # Send initial env config so frontend knows task positions etc.
    init_msg = SessionCreatedMsg(
        session_id=session_id,
        env_config=sess.config.to_env_config(),
    )
    await websocket.send_text(init_msg.model_dump_json())

    # Kick off training
    sess.training_task = asyncio.create_task(_run_training(sess))

    try:
        async for raw in websocket.iter_text():
            await _handle_client_message(sess, raw)
    except WebSocketDisconnect:
        pass
    finally:
        delete_session(session_id)


async def _run_training(sess: Session) -> None:
    sess.phase = "training"

    env_config = sess.config.to_env_config()
    ppo_config = sess.config.to_ppo_config()
    sess.trainer = MultiAgentPPOTrainer(env_config, ppo_config)

    last_progress: TrainingProgress | None = None

    async def progress_cb(p: TrainingProgress) -> None:
        nonlocal last_progress
        last_progress = p
        sess._total_episodes = p.total_episodes
        msg = TrainingProgressMsg(
            episode=p.episode,
            total_episodes=p.total_episodes,
            mean_reward=round(p.mean_reward, 3),
            tasks_completed_rate=round(p.tasks_completed_rate, 3),
        )
        await _send(sess, msg.model_dump_json())

    try:
        await sess.trainer.train_async(progress_cb)
        final_reward = last_progress.mean_reward if last_progress else 0.0
        sess._final_reward = final_reward

        sess.phase = "idle"   # set before sending so start_sim arrives after phase is ready
        done_msg = TrainingDoneMsg(
            final_reward=round(final_reward, 3),
            total_episodes=sess._total_episodes,
        )
        await _send(sess, done_msg.model_dump_json())
    except asyncio.CancelledError:
        pass
    except Exception as e:
        await _send(sess, ErrorMsg(message=f"Training error: {e}").model_dump_json())


async def _run_simulation(sess: Session) -> None:
    sess.phase = "simulating"
    agent = sess.trainer.get_agent()
    env = UAVTaskEnv(sess.config.to_env_config())
    sess.runner = SimRunner(env, agent)
    state = sess.runner.reset()
    step_delay = sess.config.sim_speed_ms / 1000.0

    try:
        while True:
            if sess._paused:
                await asyncio.sleep(0.1)
                continue

            state, done = sess.runner.step()
            msg = SimStepMsg(
                step=state["step"],
                uavs=state["uavs"],
                tasks=state["tasks"],
                stats=state["stats"],
            )
            await _send(sess, msg.model_dump_json())

            if done:
                s = state["stats"]
                done_msg = SimDoneMsg(
                    steps=state["step"],
                    tasks_completed=s["tasks_completed"],
                    workload_done=s["total_workload_done"],
                )
                await _send(sess, done_msg.model_dump_json())
                sess.phase = "done"
                break

            await asyncio.sleep(step_delay)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        await _send(sess, ErrorMsg(message=f"Simulation error: {e}").model_dump_json())


async def _handle_client_message(sess: Session, raw: str) -> None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return

    msg_type = data.get("type", "")

    if msg_type == "start_sim":
        if sess.trainer and sess.phase == "idle":
            sess.sim_task = asyncio.create_task(_run_simulation(sess))

    elif msg_type == "pause_sim":
        sess._paused = True
        sess.phase = "paused"

    elif msg_type == "resume_sim":
        sess._paused = False
        sess.phase = "simulating"

    elif msg_type == "reset":
        if sess.sim_task and not sess.sim_task.done():
            sess.sim_task.cancel()
        sess.phase = "idle"
        # Re-run simulation with same trained policy
        if sess.trainer and sess.trainer.agent:
            sess.sim_task = asyncio.create_task(_run_simulation(sess))


async def _send(sess: Session, text: str) -> None:
    if sess.ws:
        try:
            await sess.ws.send_text(text)
        except Exception:
            pass
