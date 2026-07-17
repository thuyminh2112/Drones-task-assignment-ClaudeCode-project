import type { UAVData, TaskData, EnvConfig } from "../../types";

const UAV_COLORS = [
  "#60a5fa", "#34d399", "#f87171", "#fbbf24",
  "#a78bfa", "#fb7185", "#38bdf8", "#4ade80",
  "#f472b6", "#facc15", "#2dd4bf", "#c084fc",
];

export interface DrawScale {
  toCanvasX: (wx: number) => number;
  toCanvasY: (wy: number) => number;
  taskRadius: (workload: number, maxWorkload: number) => number;
}

export function makeScale(
  canvasW: number,
  canvasH: number,
  config: EnvConfig,
  padding = 40
): DrawScale {
  const usableW = canvasW - padding * 2;
  const usableH = canvasH - padding * 2;
  const scaleX = usableW / config.area_w;
  const scaleY = usableH / config.area_h;

  return {
    toCanvasX: (wx) => padding + wx * scaleX,
    // Flip vertically: world y=0 at the bottom, increasing upward (standard Cartesian).
    toCanvasY: (wy) => canvasH - padding - wy * scaleY,
    taskRadius: (workload, maxWorkload) =>
      6 + (workload / Math.max(maxWorkload, 1)) * 14,
  };
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  scale: DrawScale,
  config: EnvConfig
) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, cw, ch);

  // Area boundary
  const x0 = scale.toCanvasX(0);
  const y0 = scale.toCanvasY(0);
  const x1 = scale.toCanvasX(config.area_w);
  const y1 = scale.toCanvasY(config.area_h);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.setLineDash([]);
}

function niceStep(range: number): number {
  const rough = range / 6;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  scale: DrawScale,
  config: EnvConfig
) {
  const stepX = niceStep(config.area_w);
  const stepY = niceStep(config.area_h);
  const x0 = scale.toCanvasX(0);
  const x1 = scale.toCanvasX(config.area_w);
  const yTop = Math.min(scale.toCanvasY(0), scale.toCanvasY(config.area_h));
  const yBottom = Math.max(scale.toCanvasY(0), scale.toCanvasY(config.area_h));

  ctx.font = "9px monospace";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;

  // Vertical grid lines + x-axis tick labels (below the boundary)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#64748b";
  for (let x = 0; x <= config.area_w + 1e-6; x += stepX) {
    const cx = scale.toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, yTop);
    ctx.lineTo(cx, yBottom);
    ctx.stroke();
    // Origin's "0" is drawn once by the y-axis loop below; skip it here to avoid overlap.
    if (x > 1e-6) ctx.fillText(`${Math.round(x)}`, cx, yBottom + 4);
  }

  // Horizontal grid lines + y-axis tick labels (left of the boundary)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = 0; y <= config.area_h + 1e-6; y += stepY) {
    const cy = scale.toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.lineTo(x1, cy);
    ctx.stroke();
    ctx.fillText(`${Math.round(y)}`, x0 - 6, cy);
  }
}

export function drawDock(
  ctx: CanvasRenderingContext2D,
  scale: DrawScale,
  config: EnvConfig
) {
  const cx = scale.toCanvasX(config.dock_x);
  const cy = scale.toCanvasY(config.dock_y);
  const size = 14;
  ctx.fillStyle = "#f97316";
  ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
  ctx.strokeStyle = "#fed7aa";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D", cx, cy);
}

export function drawTrails(
  ctx: CanvasRenderingContext2D,
  uavs: UAVData[],
  scale: DrawScale
) {
  for (const uav of uavs) {
    if (uav.path.length < 2) continue;
    const color = UAV_COLORS[uav.id % UAV_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(scale.toCanvasX(uav.path[0][0]), scale.toCanvasY(uav.path[0][1]));
    for (let i = 1; i < uav.path.length; i++) {
      ctx.lineTo(scale.toCanvasX(uav.path[i][0]), scale.toCanvasY(uav.path[i][1]));
    }
    ctx.strokeStyle = color + "40";  // 25% opacity
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();
  }
}

export function drawTasks(
  ctx: CanvasRenderingContext2D,
  tasks: TaskData[],
  scale: DrawScale
) {
  const maxW = Math.max(...tasks.map((t) => t.workload), 1);

  for (const task of tasks) {
    const cx = scale.toCanvasX(task.x);
    const cy = scale.toCanvasY(task.y);
    const r = scale.taskRadius(task.workload, maxW);

    // Fill color
    let fill: string;
    if (task.status === "done") fill = "#166534";
    else if (task.status === "in_progress") fill = "#78350f";
    else fill = "#1e3a5f";

    let stroke: string;
    if (task.status === "done") stroke = "#4ade80";
    else if (task.status === "in_progress") stroke = "#fbbf24";
    else stroke = "#60a5fa";

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Workload label inside circle
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `bold ${Math.max(8, r * 0.6)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      task.status === "done"
        ? "✓"
        : `${task.workload_remaining}/${task.workload}`,
      cx,
      cy
    );

    // Task ID label above
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(`T${task.id + 1}`, cx, cy - r - 6);
  }
}

export function drawCooperationLinks(
  ctx: CanvasRenderingContext2D,
  uavs: UAVData[],
  scale: DrawScale
) {
  // Draw dashed lines between UAVs targeting the same task
  const byTask = new Map<number, UAVData[]>();
  for (const uav of uavs) {
    if (uav.target_task_id !== null) {
      const arr = byTask.get(uav.target_task_id) ?? [];
      arr.push(uav);
      byTask.set(uav.target_task_id, arr);
    }
  }
  for (const [, group] of byTask) {
    if (group.length < 2) continue;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#fbbf2480";
    ctx.lineWidth = 1;
    for (let a = 0; a < group.length - 1; a++) {
      for (let b = a + 1; b < group.length; b++) {
        ctx.beginPath();
        ctx.moveTo(scale.toCanvasX(group[a].x), scale.toCanvasY(group[a].y));
        ctx.lineTo(scale.toCanvasX(group[b].x), scale.toCanvasY(group[b].y));
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }
}

export function drawUAVs(
  ctx: CanvasRenderingContext2D,
  uavs: UAVData[],
  tasks: TaskData[],
  scale: DrawScale
) {
  for (const uav of uavs) {
    const cx = scale.toCanvasX(uav.x);
    const cy = scale.toCanvasY(uav.y);
    const color = UAV_COLORS[uav.id % UAV_COLORS.length];

    // Direction angle
    let angle = -Math.PI / 2; // default: up
    if (uav.status === "flying_to_task" && uav.target_task_id !== null) {
      const task = tasks.find((t) => t.id === uav.target_task_id);
      if (task) {
        angle = Math.atan2(scale.toCanvasY(task.y) - cy, scale.toCanvasX(task.x) - cx);
      }
    } else if (uav.status === "flying_home" && uav.path.length > 1) {
      const prev = uav.path[uav.path.length - 2];
      angle = Math.atan2(cy - scale.toCanvasY(prev[1]), cx - scale.toCanvasX(prev[0]));
    }

    // Draw triangle
    const size = 10;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.6, size * 0.6);
    ctx.lineTo(size * 0.6, size * 0.6);
    ctx.closePath();
    ctx.fillStyle = uav.status === "docked" ? color + "80" : color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Capacity label below UAV
    ctx.fillStyle = color;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${uav.capacity}`, cx, cy + 13);

    // UAV ID label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(`U${uav.id + 1}`, cx, cy - 13);
  }
}
