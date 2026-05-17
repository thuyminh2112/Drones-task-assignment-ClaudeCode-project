import { useShallow } from "zustand/react/shallow";
import { useSimStore } from "../../store/simStore";
import { StatCard } from "./StatCard";

interface Props {
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function StatsPanel({ onPause, onResume, onReset }: Props) {
  const { phase, stats, envConfig, simDone, finalReward } = useSimStore(
    useShallow((s) => ({
      phase: s.phase,
      stats: s.stats,
      envConfig: s.envConfig,
      simDone: s.simDone,
      finalReward: s.finalReward,
    }))
  );

  const totalWorkload = envConfig
    ? envConfig.workloads.reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Mission Status
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            phase === "simulating" ? "bg-green-400 animate-pulse" :
            phase === "training" ? "bg-indigo-400 animate-pulse" :
            phase === "paused" ? "bg-yellow-400" :
            phase === "done" ? "bg-blue-400" :
            "bg-slate-500"
          }`} />
          <span className="text-xs text-slate-400 capitalize">{phase}</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-2 flex-1">
        <StatCard
          label="UAV Idle"
          value={stats.uav_idle}
          accent="text-slate-300"
        />
        <StatCard
          label="UAV Flying"
          value={stats.uav_flying}
          accent="text-blue-400"
        />
        <StatCard
          label="Tasks Pending"
          value={stats.task_pending}
          accent="text-yellow-400"
        />
        <StatCard
          label="Tasks Done"
          value={stats.task_done}
          accent="text-emerald-400"
        />
        <div className="col-span-2">
          <StatCard
            label="Tasks Completed"
            value={`${stats.tasks_completed} / ${envConfig?.n_tasks ?? "–"}`}
            accent="text-emerald-300"
          />
        </div>
        <div className="col-span-2">
          <StatCard
            label="Total Workload"
            value={`${stats.total_workload_done} / ${totalWorkload || "–"}`}
            accent="text-blue-300"
            sub="items delivered"
          />
        </div>

        {finalReward !== null && phase !== "training" && (
          <div className="col-span-2">
            <StatCard
              label="PPO Final Reward"
              value={finalReward.toFixed(2)}
              accent="text-indigo-300"
            />
          </div>
        )}

        {simDone && (
          <div className="col-span-2 bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/50">
            <p className="text-xs text-emerald-300 font-semibold mb-1">Mission Complete</p>
            <p className="text-xs text-slate-400">Steps: {simDone.steps}</p>
            <p className="text-xs text-slate-400">Tasks: {simDone.tasksCompleted}</p>
            <p className="text-xs text-slate-400">Workload: {simDone.workloadDone}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {(phase === "simulating" || phase === "paused" || phase === "done") && (
        <div className="p-4 border-t border-slate-700 space-y-2">
          {phase === "simulating" && (
            <button
              onClick={onPause}
              className="w-full py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors"
            >
              Pause
            </button>
          )}
          {phase === "paused" && (
            <button
              onClick={onResume}
              className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
            >
              Resume
            </button>
          )}
          <button
            onClick={onReset}
            className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
