import { useEffect, useRef } from "react";
import { useCanvasRenderer } from "./useCanvasRenderer";

export function SimCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvasRenderer(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });

    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
      // Initial size
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }

    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
