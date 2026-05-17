import { useConfigStore } from "../../store/configStore";

export function AreaConfig() {
  const {
    areaWidth, setAreaWidth,
    areaHeight, setAreaHeight,
    dockX, setDockX,
    dockY, setDockY,
    simSpeedMs, setSimSpeedMs,
    totalTimesteps, setTotalTimesteps,
  } = useConfigStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Area & Settings</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Width</label>
          <input
            type="number" min={20} value={areaWidth}
            onChange={(e) => setAreaWidth(Math.max(20, +e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Height</label>
          <input
            type="number" min={20} value={areaHeight}
            onChange={(e) => setAreaHeight(Math.max(20, +e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Dock X</label>
          <input
            type="number" value={dockX}
            onChange={(e) => setDockX(+e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Dock Y</label>
          <input
            type="number" value={dockY}
            onChange={(e) => setDockY(+e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
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
