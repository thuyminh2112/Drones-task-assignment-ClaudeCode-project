import { type RefObject, useEffect, useRef } from "react";
import { useSimStore } from "../../store/simStore";
import { useConfigStore } from "../../store/configStore";
import type { EnvConfig } from "../../types";
import {
  drawAxes,
  drawBackground,
  drawCooperationLinks,
  drawDock,
  drawTasks,
  drawTrails,
  drawUAVs,
  makeScale,
} from "./drawHelpers";

function previewEnvConfig(): EnvConfig {
  const c = useConfigStore.getState();
  return {
    n_uavs: c.nUavs,
    n_tasks: c.nTasks,
    area_w: c.areaWidth,
    area_h: c.areaHeight,
    dock_x: c.dockX,
    dock_y: c.dockY,
    capacities: [],
    workloads: [],
    max_steps: c.maxSteps,
    uav_speed: c.uavSpeed,
  };
}

export function useCanvasRenderer(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const { uavs, tasks, envConfig } = useSimStore.getState();

      const cw = canvas.width;
      const ch = canvas.height;
      const activeConfig = envConfig ?? previewEnvConfig();
      const scale = makeScale(cw, ch, activeConfig);

      drawBackground(ctx, cw, ch, scale, activeConfig);
      drawAxes(ctx, scale, activeConfig);

      if (!envConfig) {
        drawDock(ctx, scale, activeConfig);
        ctx.fillStyle = "#898781";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Configure and start a mission to see the simulation", cw / 2, ch / 2);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      drawTrails(ctx, uavs, scale);
      drawCooperationLinks(ctx, uavs, scale);
      drawTasks(ctx, tasks, scale);
      drawDock(ctx, scale, activeConfig);
      drawUAVs(ctx, uavs, tasks, scale);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasRef]);
}
