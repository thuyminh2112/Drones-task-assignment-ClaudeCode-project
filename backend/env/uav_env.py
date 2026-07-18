from __future__ import annotations
import math
import random
from typing import Dict, List, Optional, Tuple

import numpy as np

from .entities import DockState, TaskState, UAVState
from .rewards import compute_step_rewards, compute_terminal_rewards


class UAVTaskEnv:
    """
    Multi-agent UAV task-assignment environment.

    Agents are UAVs. Each step, docked UAVs receive an action (which task to fly
    to, or M = return-to-dock). Flying UAVs continue to their target automatically.
    """

    def __init__(self, config: dict):
        self.n_agents: int = config["n_uavs"]
        self.n_tasks: int = config["n_tasks"]
        self.area_w: float = config["area_w"]
        self.area_h: float = config["area_h"]
        self.dock_x: float = config.get("dock_x", 0.0)
        self.dock_y: float = config.get("dock_y", 0.0)
        self.capacities: List[int] = config["capacities"]   # length n_agents
        self.workloads: List[int] = config["workloads"]     # length n_tasks
        self.max_steps: int = config.get("max_steps", 300)
        self.uav_speed: float = config.get("uav_speed", 5.0)  # units per step

        self.obs_dim: int = 7 + 4 * self.n_tasks + 4 * (self.n_agents - 1)  # +1 for agent ID
        self.action_dim: int = self.n_tasks + 1   # tasks + return-to-dock

        self.dock = DockState(position=np.array([self.dock_x, self.dock_y], dtype=float))
        self.uavs: List[UAVState] = []
        self.tasks: List[TaskState] = []
        self._step_count: int = 0
        self._pending_actions: Dict[int, int] = {}  # actions for docked UAVs

    # ------------------------------------------------------------------
    # Gymnasium-style interface
    # ------------------------------------------------------------------

    def reset(self) -> Dict[int, np.ndarray]:
        self._step_count = 0
        self._pending_actions = {}

        self.uavs = [
            UAVState(
                id=i,
                position=self.dock.position.copy(),
                capacity=self.capacities[i],
                max_capacity=self.capacities[i],
                status="docked",
                path_history=[[self.dock_x, self.dock_y]],
            )
            for i in range(self.n_agents)
        ]

        # Scatter tasks randomly, avoid placing exactly at dock
        rng = random.Random()
        self.tasks = []
        for j in range(self.n_tasks):
            while True:
                tx = rng.uniform(5.0, self.area_w - 5.0)
                ty = rng.uniform(5.0, self.area_h - 5.0)
                if math.hypot(tx - self.dock_x, ty - self.dock_y) > 10.0:
                    break
            self.tasks.append(
                TaskState(
                    id=j,
                    position=np.array([tx, ty], dtype=float),
                    workload=self.workloads[j],
                    workload_remaining=self.workloads[j],
                    status="pending",
                )
            )

        return {i: self._compute_obs(i) for i in range(self.n_agents)}

    def step(
        self, actions: Dict[int, int]
    ) -> Tuple[
        Dict[int, np.ndarray],
        Dict[int, float],
        Dict[int, bool],
        Dict[int, bool],
        Dict[int, dict],
    ]:
        deliveries: Dict[int, int] = {}
        tasks_just_completed: List[int] = []
        wasted_trips: List[int] = []
        newly_assigned: Dict[int, List[int]] = {}  # task_id -> uav_ids that just launched to it this step

        # Apply actions only to docked UAVs
        for uav in self.uavs:
            if uav.status == "docked" and uav.id in actions:
                action = actions[uav.id]
                if action < self.n_tasks:
                    task = self.tasks[action]
                    if task.status == "done":
                        wasted_trips.append(uav.id)
                        # Stay docked, action ignored — will idle
                    else:
                        uav.target_task_id = action
                        uav.status = "flying_to_task"
                        task.assigned_uav_ids.append(uav.id)
                        newly_assigned.setdefault(action, []).append(uav.id)
                        if task.status == "pending":
                            task.status = "in_progress"
                # action == n_tasks → stay docked (return-to-dock / idle)

        # Multiple UAVs launching to the same task in the same decision — only
        # a genuine deconfliction failure if that task didn't need more than
        # one of them (contrast with legitimate cooperation on oversized tasks).
        redundant_launches: List[int] = []
        for task_id, uav_ids in newly_assigned.items():
            if len(uav_ids) <= 1:
                continue
            task = self.tasks[task_id]
            if any(self.uavs[uid].max_capacity >= task.workload for uid in uav_ids):
                redundant_launches.extend(uav_ids)

        # Move flying UAVs
        for uav in self.uavs:
            if uav.status == "flying_to_task":
                target = self.tasks[uav.target_task_id].position
                self._move_toward(uav, target)

                if np.linalg.norm(uav.position - target) < 0.5:
                    uav.position = target.copy()
                    self._resolve_task_arrival(uav, deliveries, tasks_just_completed)

            elif uav.status == "flying_home":
                self._move_toward(uav, self.dock.position)
                if np.linalg.norm(uav.position - self.dock.position) < 0.5:
                    uav.position = self.dock.position.copy()
                    uav.status = "docked"

        self._step_count += 1

        rewards = compute_step_rewards(
            self.uavs, self.tasks, deliveries,
            tasks_just_completed, wasted_trips, redundant_launches,
            self._step_count, self.max_steps,
        )

        done = self._is_done()
        if done:
            terminal = compute_terminal_rewards(
                self.uavs, self.tasks, self._step_count, self.max_steps
            )
            for uid in rewards:
                rewards[uid] += terminal[uid]

        truncated = self._step_count >= self.max_steps

        obs = {i: self._compute_obs(i) for i in range(self.n_agents)}
        dones = {i: done or truncated for i in range(self.n_agents)}
        truncateds = {i: truncated for i in range(self.n_agents)}
        infos: Dict[int, dict] = {i: {} for i in range(self.n_agents)}

        return obs, rewards, dones, truncateds, infos

    def get_action_masks(self) -> Dict[int, np.ndarray]:
        """Boolean mask per agent: True = action is valid."""
        pending_tasks_exist = any(t.status != "done" for t in self.tasks)
        masks = {}
        for uav in self.uavs:
            mask = np.ones(self.action_dim, dtype=bool)
            for j, task in enumerate(self.tasks):
                if task.status == "done":
                    mask[j] = False
            if uav.capacity == 0:
                # Exhausted UAVs can only idle
                mask[:self.n_tasks] = False
            elif uav.status == "docked" and pending_tasks_exist:
                # Force docked UAVs with capacity to pick a task — no idling when work exists
                mask[self.n_tasks] = False
            masks[uav.id] = mask
        return masks

    def render(self) -> dict:
        """Return JSON-serializable snapshot of the full simulation state."""
        return {
            "step": self._step_count,
            "dock": {"x": float(self.dock.position[0]), "y": float(self.dock.position[1])},
            "uavs": [
                {
                    "id": u.id,
                    "x": float(u.position[0]),
                    "y": float(u.position[1]),
                    "capacity": u.capacity,
                    "max_capacity": u.max_capacity,
                    "status": u.status,
                    "target_task_id": u.target_task_id,
                    "path": [p[:] for p in u.path_history[-20:]],
                }
                for u in self.uavs
            ],
            "tasks": [
                {
                    "id": t.id,
                    "x": float(t.position[0]),
                    "y": float(t.position[1]),
                    "workload": t.workload,
                    "workload_remaining": t.workload_remaining,
                    "status": t.status,
                    "assigned_uav_ids": t.assigned_uav_ids[:],
                }
                for t in self.tasks
            ],
            "stats": self._compute_stats(),
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _move_toward(self, uav: UAVState, target: np.ndarray) -> None:
        delta = target - uav.position
        dist = np.linalg.norm(delta)
        if dist <= self.uav_speed:
            uav.position = target.copy()
        else:
            uav.position = uav.position + (delta / dist) * self.uav_speed
        uav.path_history.append([float(uav.position[0]), float(uav.position[1])])

    def _resolve_task_arrival(
        self,
        uav: UAVState,
        deliveries: Dict[int, int],
        tasks_just_completed: List[int],
    ) -> None:
        task = self.tasks[uav.target_task_id]
        if task.status == "done":
            # Task already done by another UAV — wasted trip handled at step level
            uav.status = "flying_home"
            uav.target_task_id = None
            return

        contribution = min(uav.capacity, task.workload_remaining)
        uav.capacity -= contribution
        task.workload_remaining -= contribution
        deliveries[uav.id] = contribution

        if task.workload_remaining <= 0:
            task.status = "done"
            task.workload_remaining = 0
            tasks_just_completed.append(task.id)

        uav.status = "flying_home"
        uav.target_task_id = None

    def _is_done(self) -> bool:
        all_tasks_done = all(t.status == "done" for t in self.tasks)
        all_uavs_idle = all(
            u.status == "docked" and u.capacity == 0 for u in self.uavs
        )
        return all_tasks_done or all_uavs_idle

    def _compute_obs(self, agent_id: int) -> np.ndarray:
        uav = self.uavs[agent_id]
        obs = []

        # Agent identity (1 dim) — breaks symmetry with parameter sharing
        obs.append(agent_id / max(self.n_agents - 1, 1))

        # Own state (6 dims)
        obs.extend([
            uav.position[0] / max(self.area_w, 1),
            uav.position[1] / max(self.area_h, 1),
            uav.capacity / max(uav.max_capacity, 1),
            1.0 if uav.status == "docked" else 0.0,
            1.0 if uav.status == "flying_to_task" else 0.0,
            1.0 if uav.status == "flying_home" else 0.0,
        ])

        # Task features (4*M dims)
        max_w = max((t.workload for t in self.tasks), default=1)
        for task in self.tasks:
            dx = (task.position[0] - uav.position[0]) / max(self.area_w, 1)
            dy = (task.position[1] - uav.position[1]) / max(self.area_h, 1)
            wr = task.workload_remaining / max_w
            done = 1.0 if task.status == "done" else 0.0
            obs.extend([dx, dy, wr, done])

        # Other UAV features (4*(N-1) dims)
        for other in self.uavs:
            if other.id == agent_id:
                continue
            dx = (other.position[0] - uav.position[0]) / max(self.area_w, 1)
            dy = (other.position[1] - uav.position[1]) / max(self.area_h, 1)
            cr = other.capacity / max(other.max_capacity, 1)
            flying = 1.0 if other.status == "flying_to_task" else 0.0
            obs.extend([dx, dy, cr, flying])

        return np.array(obs, dtype=np.float32)

    def _compute_stats(self) -> dict:
        uav_idle = sum(1 for u in self.uavs if u.status == "docked")
        uav_flying = sum(1 for u in self.uavs if u.status in ("flying_to_task", "flying_home"))
        task_pending = sum(1 for t in self.tasks if t.status in ("pending", "in_progress"))
        task_done = sum(1 for t in self.tasks if t.status == "done")
        total_workload_done = sum(t.workload - t.workload_remaining for t in self.tasks)
        return {
            "uav_idle": uav_idle,
            "uav_flying": uav_flying,
            "task_pending": task_pending,
            "task_done": task_done,
            "tasks_completed": task_done,
            "total_workload_done": total_workload_done,
        }
