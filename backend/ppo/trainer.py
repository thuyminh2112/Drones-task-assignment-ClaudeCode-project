from __future__ import annotations
import asyncio
import math
from typing import Awaitable, Callable, Optional

import numpy as np

from .ppo_agent import PPOAgent
from ..env.uav_env import UAVTaskEnv


class TrainingProgress:
    def __init__(
        self,
        episode: int,
        total_episodes: int,
        mean_reward: float,
        tasks_completed_rate: float,
    ):
        self.episode = episode
        self.total_episodes = total_episodes
        self.mean_reward = mean_reward
        self.tasks_completed_rate = tasks_completed_rate


class MultiAgentPPOTrainer:
    def __init__(self, env_config: dict, ppo_config: dict):
        self.env_config = env_config
        self.ppo_config = ppo_config
        self.env = UAVTaskEnv(env_config)
        self.agent: Optional[PPOAgent] = None
        self._is_cancelled = False

    def cancel(self) -> None:
        self._is_cancelled = True

    def _build_agent(self) -> PPOAgent:
        return PPOAgent(
            n_agents=self.env.n_agents,
            obs_dim=self.env.obs_dim,
            action_dim=self.env.action_dim,
            lr=self.ppo_config.get("lr", 3e-4),
            device=self.ppo_config.get("device", "cpu"),
        )

    # ------------------------------------------------------------------
    # Synchronous training (used inside executor)
    # ------------------------------------------------------------------

    def _train_sync(
        self,
        progress_cb_sync: Optional[Callable[[TrainingProgress], None]] = None,
    ) -> None:
        n_steps = self.ppo_config.get("n_steps", 512)
        n_epochs = self.ppo_config.get("n_epochs", 10)
        batch_size = self.ppo_config.get("batch_size", 64)
        total_timesteps = self.ppo_config.get("total_timesteps", 200_000)
        gamma = self.ppo_config.get("gamma", 0.99)
        gae_lambda = self.ppo_config.get("gae_lambda", 0.95)
        clip_eps = self.ppo_config.get("clip_eps", 0.2)
        vf_coef = self.ppo_config.get("vf_coef", 0.5)
        ent_coef = self.ppo_config.get("ent_coef", 0.01)
        max_grad_norm = self.ppo_config.get("max_grad_norm", 0.5)
        report_every = self.ppo_config.get("report_every", 10)

        self.agent = self._build_agent()
        total_updates = math.ceil(total_timesteps / (n_steps * self.env.n_agents))

        reward_window: list[float] = []
        completion_window: list[float] = []
        window_size = 20

        for update in range(1, total_updates + 1):
            if self._is_cancelled:
                break

            buffer, last_values, last_dones = self.agent.collect_rollout(
                self.env, n_steps
            )
            buffer.compute_gae(last_values, last_dones, gamma, gae_lambda)
            self.agent.update(buffer, n_epochs, batch_size, clip_eps, vf_coef, ent_coef, max_grad_norm)

            ep_reward = float(buffer.rewards.sum() / max(self.env.n_agents, 1))
            tasks_done = self.env._compute_stats()["task_done"]
            completion_rate = tasks_done / max(self.env.n_tasks, 1)

            reward_window.append(ep_reward)
            completion_window.append(completion_rate)
            if len(reward_window) > window_size:
                reward_window.pop(0)
                completion_window.pop(0)

            if progress_cb_sync and update % report_every == 0:
                progress = TrainingProgress(
                    episode=update,
                    total_episodes=total_updates,
                    mean_reward=float(np.mean(reward_window)),
                    tasks_completed_rate=float(np.mean(completion_window)),
                )
                progress_cb_sync(progress)

    # ------------------------------------------------------------------
    # Async wrapper for FastAPI
    # ------------------------------------------------------------------

    async def train_async(
        self,
        progress_callback: Optional[Callable[[TrainingProgress], Awaitable[None]]] = None,
    ) -> None:
        loop = asyncio.get_event_loop()

        def sync_cb(p: TrainingProgress) -> None:
            if progress_callback:
                asyncio.run_coroutine_threadsafe(progress_callback(p), loop)

        await loop.run_in_executor(None, lambda: self._train_sync(sync_cb))

    def get_agent(self) -> PPOAgent:
        if self.agent is None:
            raise RuntimeError("Training has not started yet")
        return self.agent
