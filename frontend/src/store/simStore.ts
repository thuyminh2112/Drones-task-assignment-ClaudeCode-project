import { create } from "zustand";
import type {
  EnvConfig,
  SimPhase,
  SimStats,
  TaskData,
  TrainingProgressData,
  UAVData,
  WsMessage,
} from "../types";

interface SimStore {
  phase: SimPhase;
  sessionId: string | null;
  envConfig: EnvConfig | null;

  uavs: UAVData[];
  tasks: TaskData[];
  stats: SimStats;

  trainingProgress: TrainingProgressData | null;
  rewardHistory: { episode: number; reward: number }[];
  finalReward: number | null;

  simDone: { steps: number; tasksCompleted: number; workloadDone: number } | null;

  dispatch: (msg: WsMessage) => void;
  setPhase: (p: SimPhase) => void;
  setSession: (id: string) => void;
  reset: () => void;
}

const defaultStats: SimStats = {
  uav_idle: 0,
  uav_flying: 0,
  task_pending: 0,
  task_done: 0,
  tasks_completed: 0,
  total_workload_done: 0,
};

export const useSimStore = create<SimStore>((set) => ({
  phase: "idle",
  sessionId: null,
  envConfig: null,
  uavs: [],
  tasks: [],
  stats: defaultStats,
  trainingProgress: null,
  rewardHistory: [],
  finalReward: null,
  simDone: null,

  dispatch: (msg) => {
    switch (msg.type) {
      case "session_created":
        set({ envConfig: msg.env_config });
        break;

      case "training_progress":
        set((s) => ({
          phase: "training",
          trainingProgress: {
            episode: msg.episode,
            total_episodes: msg.total_episodes,
            mean_reward: msg.mean_reward,
            tasks_completed_rate: msg.tasks_completed_rate,
          },
          rewardHistory: [
            ...s.rewardHistory,
            { episode: msg.episode, reward: msg.mean_reward },
          ],
        }));
        break;

      case "training_done":
        set({
          phase: "idle",
          finalReward: msg.final_reward,
        });
        break;

      case "sim_step":
        set({
          phase: "simulating",
          uavs: msg.uavs,
          tasks: msg.tasks,
          stats: msg.stats,
        });
        break;

      case "sim_done":
        set({
          phase: "done",
          simDone: {
            steps: msg.steps,
            tasksCompleted: msg.tasks_completed,
            workloadDone: msg.workload_done,
          },
        });
        break;

      case "error":
        console.error("Backend error:", msg.message);
        break;
    }
  },

  setPhase: (p) => set({ phase: p }),
  setSession: (id) => set({ sessionId: id }),

  reset: () =>
    set({
      phase: "idle",
      sessionId: null,
      envConfig: null,
      uavs: [],
      tasks: [],
      stats: defaultStats,
      trainingProgress: null,
      rewardHistory: [],
      finalReward: null,
      simDone: null,
    }),
}));
