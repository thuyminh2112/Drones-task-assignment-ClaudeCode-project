import { useConfigStore } from "../../store/configStore";

export function UAVInitialPositionConfig() {
  const { dockX, setDockX, dockY, setDockY } = useConfigStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        Initial Position of UAVs
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Dock X</label>
          <input
            type="number" value={dockX}
            onChange={(e) => setDockX(+e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Dock Y</label>
          <input
            type="number" value={dockY}
            onChange={(e) => setDockY(+e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900"
          />
        </div>
      </div>
    </div>
  );
}
