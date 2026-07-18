from __future__ import annotations
from typing import Dict, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .entities import UAVState, TaskState


def compute_step_rewards(
    uav_states: List["UAVState"],
    task_states: List["TaskState"],
    deliveries: Dict[int, int],       # uav_id -> items delivered this step
    tasks_just_completed: List[int],  # task ids completed this step
    wasted_trips: List[int],          # uav ids that flew to an already-done task
    redundant_launches: List[int],    # uav ids that piled onto a task another one could've soloed, same step
    step: int,
    max_steps: int,
) -> Dict[int, float]:
    rewards: Dict[int, float] = {uav.id: 0.0 for uav in uav_states}
    max_workload = max((t.workload for t in task_states), default=1)
    uav_by_id = {uav.id: uav for uav in uav_states}

    for uav_id, delivered in deliveries.items():
        rewards[uav_id] += 1.0 * (delivered / max_workload)

    for task_id in tasks_just_completed:
        task = next(t for t in task_states if t.id == task_id)
        contributors = [uid for uid in task.assigned_uav_ids if uid in deliveries]
        # Only reward cooperation when it was actually necessary — i.e. no
        # single contributor's own capacity could have covered the whole
        # task alone. An unconditional bonus teaches agents to cluster onto
        # one task instead of splitting up across pending work, since a
        # group would always out-earn solo completions.
        necessary_cooperation = len(contributors) > 1 and all(
            uav_by_id[uid].max_capacity < task.workload for uid in contributors
        )
        for uid in contributors:
            rewards[uid] += 5.0
            if necessary_cooperation:
                rewards[uid] += 2.0

    for uav_id in wasted_trips:
        rewards[uav_id] -= 3.0

    # Penalize piling multiple UAVs onto the same task in the same decision
    # when it didn't need more than one — this is the signal (applied right
    # at launch, not just at completion) that teaches agents to spread out
    # across pending tasks instead of clustering.
    for uav_id in redundant_launches:
        rewards[uav_id] -= 2.0

    for uav_id in rewards:
        rewards[uav_id] -= 0.01

    return rewards


def compute_terminal_rewards(
    uav_states: List["UAVState"],
    task_states: List["TaskState"],
    steps_taken: int,
    max_steps: int,
) -> Dict[int, float]:
    total_tasks = len(task_states)
    tasks_completed = sum(1 for t in task_states if t.status == "done")
    total_workload = sum(t.workload for t in task_states)
    workload_done = sum(t.workload - t.workload_remaining for t in task_states)

    bonus = (
        10.0 * (tasks_completed / total_tasks)
        + 0.5 * (workload_done / max(total_workload, 1))
        - 0.1 * (steps_taken / max(max_steps, 1))
    )
    return {uav.id: bonus for uav in uav_states}
