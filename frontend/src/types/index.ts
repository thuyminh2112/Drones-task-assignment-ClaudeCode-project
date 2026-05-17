export interface UAVData {
  id: number;
  x: number;
  y: number;
  capacity: number;
  max_capacity: number;
  status: "docked" | "flying_to_task" | "flying_home";
  target_task_id: number | null;
  path: [number, number][];
}

export interface TaskData {
  id: number;
  x: number;
  y: number;
  workload: number;
  workload_remaining: number;
  status: "pending" | "in_progress" | "done";
  assigned_uav_ids: number[];
}

export interface SimStats {
  uav_idle: number;
  uav_flying: number;
  task_pending: number;
  task_done: number;
  tasks_completed: number;
  total_workload_done: number;
}

export interface EnvConfig {
  n_uavs: number;
  n_tasks: number;
  area_w: number;
  area_h: number;
  dock_x: number;
  dock_y: number;
  capacities: number[];
  workloads: number[];
  max_steps: number;
  uav_speed: number;
}

export type SimPhase = "idle" | "training" | "simulating" | "paused" | "done";

export interface TrainingProgressData {
  episode: number;
  total_episodes: number;
  mean_reward: number;
  tasks_completed_rate: number;
}

// WebSocket message types
export interface WsTrainingProgress {
  type: "training_progress";
  episode: number;
  total_episodes: number;
  mean_reward: number;
  tasks_completed_rate: number;
}

export interface WsTrainingDone {
  type: "training_done";
  final_reward: number;
  total_episodes: number;
}

export interface WsSimStep {
  type: "sim_step";
  step: number;
  uavs: UAVData[];
  tasks: TaskData[];
  stats: SimStats;
}

export interface WsSimDone {
  type: "sim_done";
  steps: number;
  tasks_completed: number;
  workload_done: number;
}

export interface WsError {
  type: "error";
  message: string;
}

export interface WsSessionCreated {
  type: "session_created";
  session_id: string;
  env_config: EnvConfig;
}

export type WsMessage =
  | WsTrainingProgress
  | WsTrainingDone
  | WsSimStep
  | WsSimDone
  | WsError
  | WsSessionCreated;
