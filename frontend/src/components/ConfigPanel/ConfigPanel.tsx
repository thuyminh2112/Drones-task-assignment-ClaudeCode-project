import { useState } from "react";
import { startSession } from "../../api/client";
import { useConfigStore } from "../../store/configStore";
import { useSimStore } from "../../store/simStore";
import { AreaConfig } from "./AreaConfig";
import { TaskWorkloadConfig } from "./TaskWorkloadConfig";
import { UAVCapacityConfig } from "./UAVCapacityConfig";
import { UAVInitialPositionConfig } from "./UAVInitialPositionConfig";

interface Props {
  onStart: (sessionId: string) => void;
}

export function ConfigPanel({ onStart }: Props) {
  const toApiPayload = useConfigStore((s) => s.toApiPayload);
  const phase = useSimStore((s) => s.phase);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = toApiPayload();
      const data = await startSession(payload);
      onStart(data.session_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (phase !== "idle" && phase !== "done");

  return (
    <div className="w-72 bg-slate-50 border-r border-slate-300 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h1 className="text-lg font-bold text-slate-900">UAV Mission Planner</h1>
        <p className="text-xs text-slate-500 mt-0.5">Multi-agent PPO task assignment</p>
      </div>

      <div className="flex-1 p-4 space-y-6">
        <UAVCapacityConfig />
        <div className="border-t border-slate-200" />
        <UAVInitialPositionConfig />
        <div className="border-t border-slate-200" />
        <TaskWorkloadConfig />
        <div className="border-t border-slate-200" />
        <AreaConfig />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        {error && (
          <p className="text-red-600 text-xs mb-2">{error}</p>
        )}
        <button
          onClick={handleStart}
          disabled={disabled}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
            disabled
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
          }`}
        >
          {loading ? "Starting…" : "Start Mission"}
        </button>
      </div>
    </div>
  );
}
