import { useCallback, useEffect, useRef } from "react";
import { openWebSocket } from "../api/client";
import { useSimStore } from "../store/simStore";
import type { WsMessage } from "../types";

export function useWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useSimStore((s) => s.dispatch);

  useEffect(() => {
    if (!sessionId) return;

    const ws = openWebSocket(sessionId);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        dispatch(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => console.error("WebSocket error");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, dispatch]);

  const send = useCallback((data: object) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { send };
}
