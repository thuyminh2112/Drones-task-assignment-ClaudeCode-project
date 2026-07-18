import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { stopSession } from "./api/client";
import { ConfigPanel } from "./components/ConfigPanel/ConfigPanel";
import { SimCanvas } from "./components/SimCanvas/SimCanvas";
import { StatsPanel } from "./components/StatsPanel/StatsPanel";
import { TrainingProgress } from "./components/TrainingProgress/TrainingProgress";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSimStore } from "./store/simStore";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { send } = useWebSocket(sessionId);
  const { phase, reset, setPhase, finalReward, rewardHistory } = useSimStore(
    useShallow((s) => ({
      phase: s.phase,
      reset: s.reset,
      setPhase: s.setPhase,
      finalReward: s.finalReward,
      rewardHistory: s.rewardHistory,
    }))
  );

  // Auto-start simulation once training finishes
  const sentStartRef = useRef(false);
  useEffect(() => {
    if (
      finalReward !== null &&
      phase === "idle" &&
      rewardHistory.length > 0 &&
      !sentStartRef.current
    ) {
      sentStartRef.current = true;
      send({ type: "start_sim" });
    }
    if (phase !== "idle") {
      sentStartRef.current = false;
    }
  }, [finalReward, phase, rewardHistory.length, send]);

  const handleStart = (sid: string) => {
    reset();
    sentStartRef.current = false;
    setSessionId(sid);
  };

  const handlePause = () => {
    send({ type: "pause_sim" });
    setPhase("paused");
  };

  const handleResume = () => {
    send({ type: "resume_sim" });
    setPhase("simulating");
  };

  const handleReset = () => {
    send({ type: "reset" });
    setPhase("simulating");
    sentStartRef.current = false;
  };

  const handleNewMission = async () => {
    if (sessionId) {
      await stopSession(sessionId).catch(() => {});
    }
    setSessionId(null);
    reset();
    sentStartRef.current = false;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <ConfigPanel onStart={handleStart} />

      <div className="flex-1 flex flex-col min-w-0">
        {phase === "training" && (
          <div className="p-4 pb-0">
            <TrainingProgress />
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          <SimCanvas />
        </div>

        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">UAV Mission Control</span>
          {sessionId && (
            <span>
              Session: <span className="font-mono text-slate-600">{sessionId}</span>
            </span>
          )}
          {(phase === "done" || (phase === "idle" && sessionId)) && (
            <button
              onClick={handleNewMission}
              className="ml-auto text-blue-600 hover:text-blue-500 transition-colors"
            >
              New Mission
            </button>
          )}
        </div>
      </div>

      <StatsPanel
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
      />
    </div>
  );
}
