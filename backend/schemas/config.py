from __future__ import annotations
import random
from typing import List, Literal, Optional, Tuple

from pydantic import BaseModel, Field, model_validator


class UAVConfig(BaseModel):
    n_uavs: int = Field(default=3, ge=1, le=20)
    capacity_mode: Literal["random", "manual"] = "random"
    capacity_range: Tuple[int, int] = (2, 8)
    capacities: Optional[List[int]] = None

    @model_validator(mode="after")
    def resolve_capacities(self) -> UAVConfig:
        if self.capacity_mode == "random" or self.capacities is None:
            lo, hi = self.capacity_range
            self.capacities = [random.randint(lo, hi) for _ in range(self.n_uavs)]
        return self


class TaskConfig(BaseModel):
    n_tasks: int = Field(default=4, ge=1, le=30)
    workload_mode: Literal["random", "manual"] = "random"
    workload_range: Tuple[int, int] = (2, 10)
    workloads: Optional[List[int]] = None

    @model_validator(mode="after")
    def resolve_workloads(self) -> TaskConfig:
        if self.workload_mode == "random" or self.workloads is None:
            lo, hi = self.workload_range
            self.workloads = [random.randint(lo, hi) for _ in range(self.n_tasks)]
        return self


class AreaConfig(BaseModel):
    width: float = Field(default=100.0, gt=0)
    height: float = Field(default=100.0, gt=0)
    dock_x: float = Field(default=50.0)
    dock_y: float = Field(default=50.0)


class PPOTrainingConfig(BaseModel):
    total_timesteps: int = Field(default=200_000, ge=10_000)
    n_steps: int = Field(default=512, ge=64)
    n_epochs: int = Field(default=10, ge=1)
    batch_size: int = Field(default=64, ge=16)
    lr: float = Field(default=3e-4, gt=0)
    gamma: float = Field(default=0.99)
    gae_lambda: float = Field(default=0.95)
    clip_eps: float = Field(default=0.2)
    vf_coef: float = Field(default=0.5)
    ent_coef: float = Field(default=0.01)
    max_grad_norm: float = Field(default=0.5)
    report_every: int = Field(default=5, ge=1)
    device: str = "cpu"


class SimConfig(BaseModel):
    uav_config: UAVConfig = UAVConfig()
    task_config: TaskConfig = TaskConfig()
    area_config: AreaConfig = AreaConfig()
    ppo_config: PPOTrainingConfig = PPOTrainingConfig()
    sim_speed_ms: int = Field(default=200, ge=50, le=2000)
    uav_speed: float = Field(default=5.0, gt=0)
    max_steps: int = Field(default=300, ge=50)

    def to_env_config(self) -> dict:
        return {
            "n_uavs": self.uav_config.n_uavs,
            "n_tasks": self.task_config.n_tasks,
            "area_w": self.area_config.width,
            "area_h": self.area_config.height,
            "dock_x": self.area_config.dock_x,
            "dock_y": self.area_config.dock_y,
            "capacities": self.uav_config.capacities,
            "workloads": self.task_config.workloads,
            "max_steps": self.max_steps,
            "uav_speed": self.uav_speed,
        }

    def to_ppo_config(self) -> dict:
        return self.ppo_config.model_dump()
