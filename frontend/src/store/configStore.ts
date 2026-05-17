import { create } from "zustand";

interface ConfigStore {
  nUavs: number;
  nTasks: number;
  areaWidth: number;
  areaHeight: number;
  dockX: number;
  dockY: number;

  capacityMode: "random" | "manual";
  capacityRange: [number, number];
  capacities: number[];

  workloadMode: "random" | "manual";
  workloadRange: [number, number];
  workloads: number[];

  simSpeedMs: number;
  uavSpeed: number;
  maxSteps: number;
  totalTimesteps: number;

  setNUavs: (n: number) => void;
  setNTasks: (n: number) => void;
  setAreaWidth: (w: number) => void;
  setAreaHeight: (h: number) => void;
  setDockX: (x: number) => void;
  setDockY: (y: number) => void;
  setCapacityMode: (m: "random" | "manual") => void;
  setCapacityRange: (r: [number, number]) => void;
  setCapacity: (idx: number, val: number) => void;
  setWorkloadMode: (m: "random" | "manual") => void;
  setWorkloadRange: (r: [number, number]) => void;
  setWorkload: (idx: number, val: number) => void;
  setSimSpeedMs: (ms: number) => void;
  setTotalTimesteps: (t: number) => void;

  toApiPayload: () => object;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  nUavs: 3,
  nTasks: 4,
  areaWidth: 100,
  areaHeight: 100,
  dockX: 50,
  dockY: 50,

  capacityMode: "random",
  capacityRange: [2, 8],
  capacities: [4, 5, 6],

  workloadMode: "random",
  workloadRange: [2, 10],
  workloads: [3, 5, 7, 4],

  simSpeedMs: 200,
  uavSpeed: 5.0,
  maxSteps: 300,
  totalTimesteps: 200_000,

  setNUavs: (n) =>
    set((s) => ({
      nUavs: n,
      capacities: Array.from({ length: n }, (_, i) => s.capacities[i] ?? 5),
    })),
  setNTasks: (n) =>
    set((s) => ({
      nTasks: n,
      workloads: Array.from({ length: n }, (_, i) => s.workloads[i] ?? 5),
    })),
  setAreaWidth: (w) => set({ areaWidth: w }),
  setAreaHeight: (h) => set({ areaHeight: h }),
  setDockX: (x) => set({ dockX: x }),
  setDockY: (y) => set({ dockY: y }),
  setCapacityMode: (m) => set({ capacityMode: m }),
  setCapacityRange: (r) => set({ capacityRange: r }),
  setCapacity: (idx, val) =>
    set((s) => {
      const caps = [...s.capacities];
      caps[idx] = val;
      return { capacities: caps };
    }),
  setWorkloadMode: (m) => set({ workloadMode: m }),
  setWorkloadRange: (r) => set({ workloadRange: r }),
  setWorkload: (idx, val) =>
    set((s) => {
      const wl = [...s.workloads];
      wl[idx] = val;
      return { workloads: wl };
    }),
  setSimSpeedMs: (ms) => set({ simSpeedMs: ms }),
  setTotalTimesteps: (t) => set({ totalTimesteps: t }),

  toApiPayload: () => {
    const s = get();
    return {
      uav_config: {
        n_uavs: s.nUavs,
        capacity_mode: s.capacityMode,
        capacity_range: s.capacityRange,
        capacities: s.capacityMode === "manual" ? s.capacities : null,
      },
      task_config: {
        n_tasks: s.nTasks,
        workload_mode: s.workloadMode,
        workload_range: s.workloadRange,
        workloads: s.workloadMode === "manual" ? s.workloads : null,
      },
      area_config: {
        width: s.areaWidth,
        height: s.areaHeight,
        dock_x: s.dockX,
        dock_y: s.dockY,
      },
      ppo_config: {
        total_timesteps: s.totalTimesteps,
        n_steps: 512,
        n_epochs: 10,
        batch_size: 64,
        lr: 3e-4,
        report_every: 5,
        device: "cpu",
      },
      sim_speed_ms: s.simSpeedMs,
      uav_speed: s.uavSpeed,
      max_steps: s.maxSteps,
    };
  },
}));
