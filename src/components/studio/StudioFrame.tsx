import React, { useRef, useState, useEffect } from "react";

export type CanvasFormat =
  | "a4-portrait"
  | "a4-landscape"
  | "story-916"
  | "presentation-169"
  | "letter-portrait";

export const CANVAS_DIMENSIONS: Record<CanvasFormat, { width: string; minHeight: string }> = {
  "a4-portrait": { width: "210mm", minHeight: "297mm" },
  "a4-landscape": { width: "297mm", minHeight: "210mm" },
  "story-916": { width: "1080px", minHeight: "1920px" },
  "presentation-169": { width: "1920px", minHeight: "1080px" },
  "letter-portrait": { width: "215.9mm", minHeight: "279.4mm" },
};

interface StudioFrameProps {
  format: CanvasFormat;
  children: React.ReactNode;
  zoomMode?: "auto" | "fit" | number;
}

export function StudioFrame({ format, children, zoomMode = "auto" }: StudioFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1080);
  const dims = CANVAS_DIMENSIONS[format] ?? CANVAS_DIMENSIONS["a4-portrait"];

  useEffect(() => {
    if (!containerRef.current || typeof zoomMode === "number") {
      if (typeof zoomMode === "number") setScale(zoomMode);
      return;
    }

    const handleResize = () => {
      if (!containerRef.current) return;
      const padX = 48; // Padding to allow scrolling space
      const availW = containerRef.current.clientWidth - padX;

      // Calculate pixel width of the target format assuming 96 DPI for mm
      let targetW = 794; // fallback A4 portrait (210mm * 96 / 25.4)
      if (dims.width === "210mm") targetW = 794;
      else if (dims.width === "297mm") targetW = 1123;
      else if (dims.width === "1080px") targetW = 1080;
      else if (dims.width === "1920px") targetW = 1920;
      else if (dims.width === "215.9mm") targetW = 816;

      const scaleW = availW / targetW;

      if (zoomMode === "fit") {
        setScale(Math.min(1, scaleW)); // We only scale by width in this new infinite scroll mode
      } else {
        setScale(Math.min(1, scaleW));
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    handleResize();
    return () => observer.disconnect();
  }, [zoomMode, dims.width]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const handleHeight = () => {
      if (!canvasRef.current) return;
      const layoutHeight = canvasRef.current.scrollHeight || canvasRef.current.offsetHeight || 1080;
      setHeight(layoutHeight);
    };

    const observer = new ResizeObserver(handleHeight);
    observer.observe(canvasRef.current);
    handleHeight();
    return () => observer.disconnect();
  }, [scale, format]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-200 flex flex-col items-center justify-start relative pb-20"
      style={{ padding: "32px 16px" }}
    >
      <div
        style={{
          width: `calc(${dims.width} * ${scale})`,
          height: height * scale,
          position: "relative",
          transition: "width 0.15s ease-out, height 0.15s ease-out",
        }}
      >
        <div
          id="proposal-canvas"
          ref={canvasRef}
          style={{
            width: dims.width,
            minHeight: dims.minHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            transition: "transform 0.15s ease-out",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
            backgroundColor: "#ffffff",
          }}
          className="canvas-page select-text flex flex-col overflow-hidden print:overflow-visible"
        >
          {/*
            IMPORTANT: Do not use overflow-hidden on internal blocks if you want html2pdf to split them.
            Use 'break-inside-avoid' on cards/blocks to prevent bad page breaks.
          */}
          {children}
        </div>
      </div>
    </div>
  );
}
