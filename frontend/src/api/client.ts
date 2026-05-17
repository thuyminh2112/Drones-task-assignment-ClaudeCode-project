const BASE = "";  // proxied by Vite to localhost:8000

export async function startSession(payload: object): Promise<{
  session_id: string;
  capacities: number[];
  workloads: number[];
}> {
  const res = await fetch(`${BASE}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/api/session/${sessionId}/stop`, { method: "POST" });
}

export function openWebSocket(sessionId: string): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(`${proto}//${window.location.host}/ws/${sessionId}`);
}
