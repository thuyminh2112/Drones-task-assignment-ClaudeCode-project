import { useConfigStore } from "../../store/configStore";

export function AreaConfig() {
  const {
    areaWidth, setAreaWidth,
    areaHeight, setAreaHeight,
    simSpeedMs, setSimSpeedMs,
    totalTimesteps, setTotalTimesteps,
  } = useConfigStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Area & Settings</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Width</label>
          <input
            type="number" min={20} value={areaWidth}
            onChange={(e) => setAreaWidth(Math.max(20, +e.target.value))}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Height</label>
          <input
            type="number" min={20} value={areaHeight}
            onChange={(e) => setAreaHeight(Math.max(20, +e.target.value))}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Sim speed: {simSpeedMs}ms / step
        </label>
        <input
          type="range" min={50} max={1000} step={50}
          value={simSpeedMs}
          onChange={(e) => setSimSpeedMs(+e.target.value)}
          className="w-full accent-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Training steps: {totalTimesteps.toLocaleString()}
        </label>
        <input
          type="range" min={50_000} max={500_000} step={50_000}
          value={totalTimesteps}
          onChange={(e) => setTotalTimesteps(+e.target.value)}
          className="w-full accent-purple-500"
        />
      </div>
    </div>
  );
}
