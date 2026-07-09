"use client";

import { useCanvas } from "@/app/context/CanvasContext";

export function ZoomControl() {
  const { viewport, setViewport } = useCanvas();

  const zoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(20, prev.zoom * 1.2),
    }));
  };

  const zoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.05, prev.zoom / 1.2),
    }));
  };

  const resetZoom = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0,
    }));
  };

  const percentage = Math.round(viewport.zoom * 100);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-1 px-2 py-1.5 bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-xl shadow-lg">
      <button
        onClick={zoomOut}
        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      
      <button
        onClick={resetZoom}
        className="px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors whitespace-nowrap min-w-[50px] text-center cursor-pointer"
        title="Reset Zoom"
      >
        {percentage}%
      </button>

      <button
        onClick={zoomIn}
        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        title="Zoom In"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
