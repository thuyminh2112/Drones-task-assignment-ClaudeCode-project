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
    <div className="w-64 bg-slate-50 border-l border-slate-300 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Mission Status
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            phase === "simulating" ? "bg-[#0ca30c] animate-pulse" :
            phase === "training" ? "bg-[#4a3aa7] animate-pulse" :
            phase === "paused" ? "bg-[#fab219]" :
            phase === "done" ? "bg-[#2a78d6]" :
            "bg-[#898781]"
          }`} />
          <span className="text-xs text-slate-500 capitalize">{phase}</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-2 flex-1">
        <StatCard
          label="UAV Idle"
          value={stats.uav_idle}
          accent="text-[#52514e]"
        />
        <StatCard
          label="UAV Flying"
          value={stats.uav_flying}
          accent="text-[#2a78d6]"
        />
        <StatCard
          label="Tasks Pending"
          value={stats.task_pending}
          accent="text-amber-700"
        />
        <StatCard
          label="Tasks Done"
          value={stats.task_done}
          accent="text-[#0ca30c]"
        />
        <div className="col-span-2">
          <StatCard
            label="Tasks Completed"
            value={`${stats.tasks_completed} / ${envConfig?.n_tasks ?? "–"}`}
            accent="text-[#0ca30c]"
          />
        </div>
        <div className="col-span-2">
          <StatCard
            label="Total Workload"
            value={`${stats.total_workload_done} / ${totalWorkload || "–"}`}
            accent="text-[#2a78d6]"
            sub="items delivered"
          />
        </div>

        {finalReward !== null && phase !== "training" && (
          <div className="col-span-2">
            <StatCard
              label="PPO Final Reward"
              value={finalReward.toFixed(2)}
              accent="text-[#4a3aa7]"
            />
          </div>
        )}

        {simDone && (
          <div className="col-span-2 bg-emerald-100 rounded-lg p-3 border border-emerald-400">
            <p className="text-xs text-emerald-700 font-semibold mb-1">Mission Complete</p>
            <p className="text-xs text-slate-500">Steps: {simDone.steps}</p>
            <p className="text-xs text-slate-500">Tasks: {simDone.tasksCompleted}</p>
            <p className="text-xs text-slate-500">Workload: {simDone.workloadDone}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {(phase === "simulating" || phase === "paused" || phase === "done") && (
        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
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
            className="w-full py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
