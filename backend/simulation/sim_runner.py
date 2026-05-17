from __future__ import annotations
from typing import Dict, Tuple

import numpy as np

from ..env.uav_env import UAVTaskEnv
from ..ppo.ppo_agent import PPOAgent


class SimRunner:
    """
    Drives the simulation using a trained PPO policy.
    On each step, docked UAVs get new actions from the policy;
    flying UAVs continue automatically.
    """

    def __init__(self, env: UAVTaskEnv, agent: PPOAgent):
        self.env = env
        self.agent = agent
        self._obs: np.ndarray | None = None
        self._masks: np.ndarray | None = None

    def reset(self) -> dict:
        obs_dict = self.env.reset()
        self._obs = self._stack(obs_dict)
        self._masks = self._stack(self.env.get_action_masks())
        return self.env.render()

    def step(self) -> Tuple[dict, bool]:
        actions_array = self.agent.get_action(self._obs, self._masks)

        # Only feed actions to docked UAVs
        actions_dict: Dict[int, int] = {}
        for uav in self.env.uavs:
            if uav.status == "docked":
                actions_dict[uav.id] = int(actions_array[uav.id])

        obs_dict, _, dones_dict, truncated_dict, _ = self.env.step(actions_dict)

        self._obs = self._stack(obs_dict)
        self._masks = self._stack(self.env.get_action_masks())

        state = self.env.render()
        done = all(dones_dict.values()) or all(truncated_dict.values())
        return state, done

    def _stack(self, d: Dict[int, np.ndarray]) -> np.ndarray:
        return np.stack([d[i] for i in range(self.env.n_agents)])
