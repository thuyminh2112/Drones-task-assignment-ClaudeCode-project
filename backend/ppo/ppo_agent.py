from __future__ import annotations
from typing import Dict

import numpy as np
import torch
import torch.optim as optim

from .actor_critic import ActorCritic
from .rollout_buffer import RolloutBuffer
from ..env.uav_env import UAVTaskEnv


class PPOAgent:
    def __init__(
        self,
        n_agents: int,
        obs_dim: int,
        action_dim: int,
        lr: float = 3e-4,
        device: str = "cpu",
    ):
        self.n_agents = n_agents
        self.obs_dim = obs_dim
        self.action_dim = action_dim
        self.device = torch.device(device)

        self.network = ActorCritic(obs_dim, action_dim).to(self.device)
        self.optimizer = optim.Adam(
            self.network.parameters(), lr=lr, eps=1e-5
        )

    # ------------------------------------------------------------------
    # Rollout collection
    # ------------------------------------------------------------------

    def collect_rollout(
        self,
        env: UAVTaskEnv,
        n_steps: int,
    ) -> tuple[RolloutBuffer, np.ndarray, np.ndarray]:
        """Collect n_steps transitions. Returns buffer + last_values + last_dones."""
        buffer = RolloutBuffer(
            n_steps=n_steps,
            n_agents=self.n_agents,
            obs_dim=self.obs_dim,
            action_dim=self.action_dim,
        )

        obs_dict = env.reset()
        obs = self._stack_obs(obs_dict)        # (N, obs_dim)
        masks = self._stack_masks(env.get_action_masks())  # (N, action_dim)
        dones = np.zeros(self.n_agents, dtype=np.float32)

        for _ in range(n_steps):
            with torch.no_grad():
                obs_t = torch.tensor(obs, device=self.device)
                masks_t = torch.tensor(masks, device=self.device)
                actions_t, log_probs_t, _, values_t = (
                    self.network.get_action_and_value(obs_t, action_mask=masks_t)
                )

            actions_np = actions_t.cpu().numpy()
            log_probs_np = log_probs_t.cpu().numpy()
            values_np = values_t.cpu().numpy()

            # Only docked UAVs get new actions; others keep current trajectory
            actions_dict: Dict[int, int] = {}
            for i, uav in enumerate(env.uavs):
                if uav.status == "docked":
                    actions_dict[i] = int(actions_np[i])

            next_obs_dict, rewards_dict, dones_dict, _, _ = env.step(actions_dict)

            rewards_np = np.array(
                [rewards_dict.get(i, 0.0) for i in range(self.n_agents)],
                dtype=np.float32,
            )
            dones_np = np.array(
                [float(dones_dict.get(i, False)) for i in range(self.n_agents)],
                dtype=np.float32,
            )

            buffer.add(obs, actions_np, log_probs_np, rewards_np, values_np, dones_np, masks)

            if all(dones_dict.values()):
                obs_dict = env.reset()
                next_obs_dict = obs_dict

            obs = self._stack_obs(next_obs_dict)
            masks = self._stack_masks(env.get_action_masks())
            dones = dones_np

        # Bootstrap value for last state
        with torch.no_grad():
            obs_t = torch.tensor(obs, device=self.device)
            masks_t = torch.tensor(masks, device=self.device)
            _, last_values_t = self.network(obs_t, masks_t)
        last_values = last_values_t.cpu().numpy()

        return buffer, last_values, dones

    # ------------------------------------------------------------------
    # PPO update
    # ------------------------------------------------------------------

    def update(
        self,
        buffer: RolloutBuffer,
        n_epochs: int = 10,
        batch_size: int = 64,
        clip_eps: float = 0.2,
        vf_coef: float = 0.5,
        ent_coef: float = 0.01,
        max_grad_norm: float = 0.5,
    ) -> dict:
        obs, actions, old_log_probs, advantages, returns, masks = (
            buffer.get_flat_tensors(self.device)
        )

        # Normalize advantages
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        total_samples = obs.shape[0]
        indices = np.arange(total_samples)

        stats = {"policy_loss": 0.0, "value_loss": 0.0, "entropy": 0.0, "approx_kl": 0.0}
        n_updates = 0

        for _ in range(n_epochs):
            np.random.shuffle(indices)
            for start in range(0, total_samples, batch_size):
                end = start + batch_size
                mb_idx = torch.tensor(indices[start:end], device=self.device)

                mb_obs = obs[mb_idx]
                mb_actions = actions[mb_idx]
                mb_old_log_probs = old_log_probs[mb_idx]
                mb_advantages = advantages[mb_idx]
                mb_returns = returns[mb_idx]
                mb_masks = masks[mb_idx]

                _, new_log_probs, entropy, new_values = (
                    self.network.get_action_and_value(mb_obs, mb_actions, mb_masks)
                )

                log_ratio = new_log_probs - mb_old_log_probs
                ratio = log_ratio.exp()

                # Clipped policy loss
                pg_loss1 = -mb_advantages * ratio
                pg_loss2 = -mb_advantages * ratio.clamp(1 - clip_eps, 1 + clip_eps)
                policy_loss = torch.max(pg_loss1, pg_loss2).mean()

                value_loss = 0.5 * ((new_values - mb_returns) ** 2).mean()
                entropy_loss = -entropy.mean()

                loss = policy_loss + vf_coef * value_loss + ent_coef * entropy_loss

                self.optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(
                    self.network.parameters(), max_grad_norm
                )
                self.optimizer.step()

                with torch.no_grad():
                    approx_kl = ((ratio - 1) - log_ratio).mean().item()

                stats["policy_loss"] += policy_loss.item()
                stats["value_loss"] += value_loss.item()
                stats["entropy"] += (-entropy_loss).item()
                stats["approx_kl"] += approx_kl
                n_updates += 1

        if n_updates > 0:
            for k in stats:
                stats[k] /= n_updates
        return stats

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    @torch.no_grad()
    def get_action(
        self,
        obs: np.ndarray,          # (N, obs_dim)
        action_mask: np.ndarray,  # (N, action_dim)
    ) -> np.ndarray:
        obs_t = torch.tensor(obs, device=self.device)
        mask_t = torch.tensor(action_mask, device=self.device)
        dist, _ = self.network(obs_t, mask_t)
        return dist.sample().cpu().numpy()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _stack_obs(self, obs_dict: Dict[int, np.ndarray]) -> np.ndarray:
        return np.stack([obs_dict[i] for i in range(self.n_agents)])

    def _stack_masks(self, mask_dict: Dict[int, np.ndarray]) -> np.ndarray:
        return np.stack([mask_dict[i] for i in range(self.n_agents)])

    def save(self, path: str) -> None:
        torch.save(self.network.state_dict(), path)

    def load(self, path: str) -> None:
        self.network.load_state_dict(
            torch.load(path, map_location=self.device)
        )
