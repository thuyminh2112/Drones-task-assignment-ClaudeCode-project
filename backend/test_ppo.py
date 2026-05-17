"""Quick PPO convergence test — run with: python backend/test_ppo.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.ppo.trainer import MultiAgentPPOTrainer

env_config = {
    "n_uavs": 2,
    "n_tasks": 3,
    "area_w": 80.0,
    "area_h": 80.0,
    "dock_x": 40.0,
    "dock_y": 40.0,
    "capacities": [4, 5],
    "workloads": [3, 4, 6],
    "max_steps": 200,
    "uav_speed": 6.0,
}

ppo_config = {
    "total_timesteps": 50_000,
    "n_steps": 256,
    "n_epochs": 5,
    "batch_size": 64,
    "lr": 3e-4,
    "gamma": 0.99,
    "gae_lambda": 0.95,
    "clip_eps": 0.2,
    "vf_coef": 0.5,
    "ent_coef": 0.01,
    "max_grad_norm": 0.5,
    "report_every": 5,
    "device": "cpu",
}

rewards_log = []

def progress_cb(p):
    rewards_log.append(p.mean_reward)
    print(f"  update {p.episode}/{p.total_episodes} | "
          f"mean_reward={p.mean_reward:.2f} | "
          f"completion={p.tasks_completed_rate:.2f}")

if __name__ == "__main__":
    print("Training PPO (2 UAVs, 3 tasks, 50k steps)...")
    trainer = MultiAgentPPOTrainer(env_config, ppo_config)
    trainer._train_sync(progress_cb)

    first = rewards_log[0] if rewards_log else 0
    last = rewards_log[-1] if rewards_log else 0
    print(f"\nFirst reward: {first:.2f}  →  Last reward: {last:.2f}")
    if last > first:
        print("PPO is learning (reward increased). PASSED")
    else:
        print("WARNING: reward did not clearly increase — may need more steps")
