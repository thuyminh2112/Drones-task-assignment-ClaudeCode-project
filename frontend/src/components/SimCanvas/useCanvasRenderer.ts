import { type RefObject, useEffect, useRef } from "react";
import { useSimStore } from "../../store/simStore";
import {
  drawBackground,
  drawCooperationLinks,
  drawDock,
  drawTasks,
  drawTrails,
  drawUAVs,
  makeScale,
} from "./drawHelpers";

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

      if (!envConfig) {
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "#0f1117";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#475569";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Configure and start a mission to see the simulation", cw / 2, ch / 2);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const scale = makeScale(cw, ch, envConfig);

      drawBackground(ctx, cw, ch, scale, envConfig);
      drawTrails(ctx, uavs, scale);
      drawCooperationLinks(ctx, uavs, scale);
      drawTasks(ctx, tasks, scale);
      drawDock(ctx, scale, envConfig);
      drawUAVs(ctx, uavs, tasks, scale);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasRef]);
}
