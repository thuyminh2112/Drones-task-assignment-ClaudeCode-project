from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import torch


@dataclass
class RolloutBuffer:
    n_steps: int
    n_agents: int
    obs_dim: int
    action_dim: int

    observations: np.ndarray = field(init=False)
    actions: np.ndarray = field(init=False)
    log_probs: np.ndarray = field(init=False)
    rewards: np.ndarray = field(init=False)
    values: np.ndarray = field(init=False)
    dones: np.ndarray = field(init=False)
    action_masks: np.ndarray = field(init=False)
    advantages: Optional[np.ndarray] = field(init=False, default=None)
    returns: Optional[np.ndarray] = field(init=False, default=None)

    _ptr: int = field(init=False, default=0)

    def __post_init__(self):
        T, N = self.n_steps, self.n_agents
        self.observations = np.zeros((T, N, self.obs_dim), dtype=np.float32)
        self.actions = np.zeros((T, N), dtype=np.int64)
        self.log_probs = np.zeros((T, N), dtype=np.float32)
        self.rewards = np.zeros((T, N), dtype=np.float32)
        self.values = np.zeros((T, N), dtype=np.float32)
        self.dones = np.zeros((T, N), dtype=np.float32)
        self.action_masks = np.ones((T, N, self.action_dim), dtype=bool)
        self._ptr = 0

    def add(
        self,
        obs: np.ndarray,            # (N, obs_dim)
        actions: np.ndarray,        # (N,)
        log_probs: np.ndarray,      # (N,)
        rewards: np.ndarray,        # (N,)
        values: np.ndarray,         # (N,)
        dones: np.ndarray,          # (N,)
        action_masks: np.ndarray,   # (N, action_dim)
    ) -> None:
        t = self._ptr
        self.observations[t] = obs
        self.actions[t] = actions
        self.log_probs[t] = log_probs
        self.rewards[t] = rewards
        self.values[t] = values
        self.dones[t] = dones
        self.action_masks[t] = action_masks
        self._ptr += 1

    def is_full(self) -> bool:
        return self._ptr >= self.n_steps

    def compute_gae(
        self,
        last_values: np.ndarray,  # (N,)
        last_dones: np.ndarray,   # (N,)
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
    ) -> None:
        T = self.n_steps
        advantages = np.zeros_like(self.rewards)
        last_gae = np.zeros(self.n_agents, dtype=np.float32)

        for t in reversed(range(T)):
            next_values = last_values if t == T - 1 else self.values[t + 1]
            next_non_terminal = 1.0 - (last_dones if t == T - 1 else self.dones[t + 1])
            delta = (
                self.rewards[t]
                + gamma * next_values * next_non_terminal
                - self.values[t]
            )
            last_gae = delta + gamma * gae_lambda * next_non_terminal * last_gae
            advantages[t] = last_gae

        self.advantages = advantages
        self.returns = advantages + self.values

    def get_flat_tensors(
        self, device: torch.device
    ) -> tuple[torch.Tensor, ...]:
        """Flatten (T, N, ...) → (T*N, ...) for minibatch training."""
        T, N = self.n_steps, self.n_agents
        obs = torch.tensor(self.observations.reshape(T * N, -1), device=device)
        actions = torch.tensor(self.actions.reshape(T * N), device=device)
        log_probs = torch.tensor(self.log_probs.reshape(T * N), device=device)
        advantages = torch.tensor(self.advantages.reshape(T * N), device=device)
        returns = torch.tensor(self.returns.reshape(T * N), device=device)
        masks = torch.tensor(
            self.action_masks.reshape(T * N, -1), device=device
        )
        return obs, actions, log_probs, advantages, returns, masks
