import { useConfigStore } from "../../store/configStore";

export function UAVCapacityConfig() {
  const {
    nUavs, setNUavs,
    capacityMode, setCapacityMode,
    capacityRange, setCapacityRange,
    capacities, setCapacity,
  } = useConfigStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">UAVs</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400 w-20">Count</label>
        <input
          type="number"
          min={1} max={20}
          value={nUavs}
          onChange={(e) => setNUavs(Math.max(1, Math.min(20, +e.target.value)))}
          className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400 w-20">Capacity</label>
        <div className="flex gap-2">
          {(["random", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCapacityMode(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                capacityMode === m
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {capacityMode === "random" && (
        <div className="flex items-center gap-2 pl-1">
          <label className="text-xs text-slate-500">Range</label>
          <input
            type="number" min={1} value={capacityRange[0]}
            onChange={(e) => setCapacityRange([+e.target.value, capacityRange[1]])}
            className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="number" min={1} value={capacityRange[1]}
            onChange={(e) => setCapacityRange([capacityRange[0], +e.target.value])}
            className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
          />
        </div>
      )}

      {capacityMode === "manual" && (
        <div className="space-y-1 pl-1">
          {Array.from({ length: nUavs }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-14">UAV {i + 1}</span>
              <input
                type="number" min={1}
                value={capacities[i] ?? 5}
                onChange={(e) => setCapacity(i, Math.max(1, +e.target.value))}
                className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
