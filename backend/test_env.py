"""Quick sanity test for UAVTaskEnv — run with: python backend/test_env.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import random
from backend.env.uav_env import UAVTaskEnv


def run_random_episode(env: UAVTaskEnv) -> dict:
    obs = env.reset()
    done = False
    steps = 0
    total_reward = {i: 0.0 for i in range(env.n_agents)}

    while not done and steps < env.max_steps:
        masks = env.get_action_masks()
        actions = {}
        for i in range(env.n_agents):
            uav = env.uavs[i]
            if uav.status == "docked":
                valid = [a for a, ok in enumerate(masks[i]) if ok]
                actions[i] = random.choice(valid) if valid else env.n_tasks
        obs, rewards, dones, _, _ = env.step(actions)
        for i, r in rewards.items():
            total_reward[i] += r
        done = all(dones.values())
        steps += 1

    state = env.render()
    return {
        "steps": steps,
        "tasks_done": state["stats"]["task_done"],
        "total_tasks": env.n_tasks,
        "workload_done": state["stats"]["total_workload_done"],
        "total_workload": sum(env.workloads),
        "rewards": total_reward,
    }


if __name__ == "__main__":
    config = {
        "n_uavs": 3,
        "n_tasks": 4,
        "area_w": 100.0,
        "area_h": 100.0,
        "dock_x": 50.0,
        "dock_y": 50.0,
        "capacities": [3, 4, 5],
        "workloads": [2, 5, 7, 3],
        "max_steps": 300,
        "uav_speed": 5.0,
    }
    env = UAVTaskEnv(config)

    print("Running 5 random episodes...")
    for ep in range(5):
        result = run_random_episode(env)
        print(
            f"  Ep {ep+1}: steps={result['steps']} | "
            f"tasks={result['tasks_done']}/{result['total_tasks']} | "
            f"workload={result['workload_done']}/{result['total_workload']} | "
            f"rewards={[round(r,2) for r in result['rewards'].values()]}"
        )

    # Cooperation check: 1 task workload=10, 3 UAVs each cap=4
    print("\nCooperation test (task_workload=10, 3 UAVs cap=4 each)...")
    config2 = dict(config, n_tasks=1, workloads=[10], capacities=[4, 4, 4])
    env2 = UAVTaskEnv(config2)
    obs = env2.reset()
    # Force all UAVs to go to task 0
    done = False
    steps = 0
    while not done and steps < 300:
        actions = {i: 0 for i in range(3) if env2.uavs[i].status == "docked"}
        _, _, dones, _, _ = env2.step(actions)
        done = all(dones.values())
        steps += 1
    caps = [u.capacity for u in env2.uavs]
    task_done = env2.tasks[0].status == "done"
    print(f"  Task done: {task_done}, UAV remaining capacities: {caps}")
    assert task_done, "Cooperation test FAILED: task not completed"
    print("  PASSED")
    print("\nAll tests passed.")
