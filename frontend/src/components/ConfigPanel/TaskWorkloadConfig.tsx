import { useConfigStore } from "../../store/configStore";

export function TaskWorkloadConfig() {
  const {
    nTasks, setNTasks,
    workloadMode, setWorkloadMode,
    workloadRange, setWorkloadRange,
    workloads, setWorkload,
  } = useConfigStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Tasks</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-500 w-20">Count</label>
        <input
          type="number" min={1} max={30}
          value={nTasks}
          onChange={(e) => setNTasks(Math.max(1, Math.min(30, +e.target.value)))}
          className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-500 w-20">Workload</label>
        <div className="flex gap-2">
          {(["random", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setWorkloadMode(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                workloadMode === m
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {workloadMode === "random" && (
        <div className="flex items-center gap-2 pl-1">
          <label className="text-xs text-slate-500">Range</label>
          <input
            type="number" min={1} value={workloadRange[0]}
            onChange={(e) => setWorkloadRange([+e.target.value, workloadRange[1]])}
            className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="number" min={1} value={workloadRange[1]}
            onChange={(e) => setWorkloadRange([workloadRange[0], +e.target.value])}
            className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
          />
        </div>
      )}

      {workloadMode === "manual" && (
        <div className="space-y-1 pl-1">
          {Array.from({ length: nTasks }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-14">Task {i + 1}</span>
              <input
                type="number" min={1}
                value={workloads[i] ?? 5}
                onChange={(e) => setWorkload(i, Math.max(1, +e.target.value))}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
