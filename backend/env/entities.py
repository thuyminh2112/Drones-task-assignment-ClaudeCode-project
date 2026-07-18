from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import numpy as np


@dataclass
class UAVState:
    id: int
    position: np.ndarray          # [x, y]
    capacity: int                  # current remaining items
    max_capacity: int
    status: str                    # "docked" | "flying_to_task" | "flying_home"
    target_task_id: Optional[int] = None
    path_history: List[List[float]] = field(default_factory=list)

    def copy(self) -> UAVState:
        return UAVState(
            id=self.id,
            position=self.position.copy(),
            capacity=self.capacity,
            max_capacity=self.max_capacity,
            status=self.status,
            target_task_id=self.target_task_id,
            path_history=[p[:] for p in self.path_history],
        )


@dataclass
class TaskState:
    id: int
    position: np.ndarray
    workload: int                  # total items needed
    workload_remaining: int
    status: str                    # "pending" | "in_progress" | "done"
    assigned_uav_ids: List[int] = field(default_factory=list)

    def copy(self) -> TaskState:
        return TaskState(
            id=self.id,
            position=self.position.copy(),
            workload=self.workload,
            workload_remaining=self.workload_remaining,
            status=self.status,
            assigned_uav_ids=self.assigned_uav_ids[:],
        )


@dataclass
class DockState:
    position: np.ndarray           # [x, y]
