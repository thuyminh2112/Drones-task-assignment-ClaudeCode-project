import type { UAVData, TaskData, EnvConfig } from "../../types";
import droneIconUrl from "../../assets/drone.png";

// Validated categorical palette (fixed order — see dataviz skill's palette.md).
// Direct labels (U{id}) always accompany each mark, satisfying the relief
// rule for the lower-contrast slots (magenta/yellow/aqua).
const UAV_COLORS = [
  "#2a78d6", // blue
  "#008300", // green
  "#e87ba4", // magenta
  "#eda100", // yellow
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violet
  "#e34948", // red
];

// Status palette (fixed — never themed).
const STATUS_GOOD = "#0ca30c";
const STATUS_WARNING = "#fab219";
const STATUS_INFO = UAV_COLORS[0]; // blue — pending/queued, not a true status

const INK_PRIMARY = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const BASELINE = "#c3c2b7";
const CHART_SURFACE = "#fcfcfb";

const droneIcon = new Image();
droneIcon.src = droneIconUrl;

// Colored text directly on the chart surface can dip below body-text contrast
// for some palette slots (e.g. yellow, aqua) — a thin dark halo keeps it
// legible regardless of hue, the same technique map labels use.
function drawHaloText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string
) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(11, 11, 11, 0.25)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

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
  ctx.fillStyle = CHART_SURFACE;
  ctx.fillRect(0, 0, cw, ch);

  // Area boundary
  const x0 = scale.toCanvasX(0);
  const y0 = scale.toCanvasY(0);
  const x1 = scale.toCanvasX(config.area_w);
  const y1 = scale.toCanvasY(config.area_h);
  ctx.strokeStyle = BASELINE;
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
  ctx.strokeStyle = GRIDLINE;
  ctx.lineWidth = 1;

  // Vertical grid lines + x-axis tick labels (below the boundary)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK_MUTED;
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
  const size = 36;
  ctx.fillStyle = UAV_COLORS[5]; // orange
  ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
  ctx.strokeStyle = INK_PRIMARY;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
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
    ctx.strokeStyle = color + "66";  // ~40% opacity
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

    // Status color: done = good, in_progress = warning, pending = informational blue
    let stroke: string;
    if (task.status === "done") stroke = STATUS_GOOD;
    else if (task.status === "in_progress") stroke = STATUS_WARNING;
    else stroke = STATUS_INFO;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = stroke + "26"; // ~15% tint fill so dark text stays legible
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Workload label inside circle
    ctx.fillStyle = INK_PRIMARY;
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
    ctx.fillStyle = INK_SECONDARY;
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
    ctx.strokeStyle = STATUS_WARNING + "aa";
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

const ICON_DIAMETER = 56;
// UAVs start docked at the exact same point and can converge on the same
// task — without a fan-out, their icons fully overlap and hide each other.
const CLUSTER_RADIUS_PX = 18;

export function drawUAVs(
  ctx: CanvasRenderingContext2D,
  uavs: UAVData[],
  tasks: TaskData[],
  scale: DrawScale
) {
  const iconReady = droneIcon.complete && droneIcon.naturalWidth > 0;

  const points = uavs.map((uav) => ({
    uav,
    cx: scale.toCanvasX(uav.x),
    cy: scale.toCanvasY(uav.y),
  }));

  // Group points that land within CLUSTER_RADIUS_PX of each other, then
  // arrange each group's markers around a small ring so every UAV stays visible.
  const visited = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [points[i]];
    visited.add(i);
    for (let j = i + 1; j < points.length; j++) {
      if (visited.has(j)) continue;
      if (Math.hypot(points[i].cx - points[j].cx, points[i].cy - points[j].cy) < CLUSTER_RADIUS_PX) {
        cluster.push(points[j]);
        visited.add(j);
      }
    }

    const fanRadius = cluster.length > 1 ? ICON_DIAMETER * 0.7 : 0;
    cluster.forEach((p, idx) => {
      const spreadAngle = (2 * Math.PI * idx) / cluster.length - Math.PI / 2;
      const drawCx = p.cx + Math.cos(spreadAngle) * fanRadius;
      const drawCy = p.cy + Math.sin(spreadAngle) * fanRadius;
      drawOneUAV(ctx, p.uav, drawCx, drawCy, p.cx, p.cy, tasks, scale, iconReady);
    });
  }
}

function drawOneUAV(
  ctx: CanvasRenderingContext2D,
  uav: UAVData,
  cx: number,
  cy: number,
  actualCx: number,
  actualCy: number,
  tasks: TaskData[],
  scale: DrawScale,
  iconReady: boolean
) {
  const color = UAV_COLORS[uav.id % UAV_COLORS.length];

  // Direction angle, computed from the UAV's true position (not the fanned-out draw position).
  let angle = -Math.PI / 2; // default: up
  if (uav.status === "flying_to_task" && uav.target_task_id !== null) {
    const task = tasks.find((t) => t.id === uav.target_task_id);
    if (task) {
      angle = Math.atan2(scale.toCanvasY(task.y) - actualCy, scale.toCanvasX(task.x) - actualCx);
    }
  } else if (uav.status === "flying_home" && uav.path.length > 1) {
    const prev = uav.path[uav.path.length - 2];
    angle = Math.atan2(actualCy - scale.toCanvasY(prev[1]), actualCx - scale.toCanvasX(prev[0]));
  }

  const size = 10;
  const labelOffset = ICON_DIAMETER / 2 + 6;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.globalAlpha = uav.status === "docked" ? 0.55 : 1;
  ctx.rotate(angle + Math.PI / 2);

  if (iconReady) {
    ctx.drawImage(droneIcon, -ICON_DIAMETER / 2, -ICON_DIAMETER / 2, ICON_DIAMETER, ICON_DIAMETER);
  } else {
    // Fallback while the icon is still loading.
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.6, size * 0.6);
    ctx.lineTo(size * 0.6, size * 0.6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Capacity label below UAV (haloed since some palette hues are low-contrast on white)
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawHaloText(ctx, `${uav.capacity}`, cx, cy + labelOffset, color);

  // UAV ID label
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = "9px sans-serif";
  ctx.textBaseline = "bottom";
  ctx.fillText(`U${uav.id + 1}`, cx, cy - labelOffset);
}
