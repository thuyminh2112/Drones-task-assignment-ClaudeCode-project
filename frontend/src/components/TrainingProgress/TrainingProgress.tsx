import { useShallow } from "zustand/react/shallow";
import { useSimStore } from "../../store/simStore";
import { RewardChart } from "./RewardChart";

export function TrainingProgress() {
  const { phase, trainingProgress } = useSimStore(
    useShallow((s) => ({
      phase: s.phase,
      trainingProgress: s.trainingProgress,
    }))
  );

  if (phase !== "training" || !trainingProgress) return null;

  const pct = Math.round(
    (trainingProgress.episode / trainingProgress.total_episodes) * 100
  );

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">Training PPO…</span>
        <span className="text-xs text-slate-400 font-mono">
          {trainingProgress.episode} / {trainingProgress.total_episodes}
        </span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>Reward: <span className="text-indigo-300 font-mono">{trainingProgress.mean_reward.toFixed(2)}</span></span>
        <span>Task rate: <span className="text-emerald-300 font-mono">{(trainingProgress.tasks_completed_rate * 100).toFixed(0)}%</span></span>
      </div>

      <RewardChart />
    </div>
  );
}
