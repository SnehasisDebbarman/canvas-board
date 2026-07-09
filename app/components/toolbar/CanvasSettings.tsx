"use client";

import { useCanvas } from "@/app/context/CanvasContext";

export function CanvasSettings() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    gridSnapping,
    setGridSnapping,
    clearCanvas,
  } = useCanvas();

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-xl shadow-lg">
      {/* Undo Button */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          canUndo
            ? "text-zinc-300 hover:text-white hover:bg-white/10"
            : "text-zinc-600 cursor-not-allowed"
        }`}
        title="Undo (Cmd+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      {/* Redo Button */}
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          canRedo
            ? "text-zinc-300 hover:text-white hover:bg-white/10"
            : "text-zinc-600 cursor-not-allowed"
        }`}
        title="Redo (Cmd+Shift+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-20l-6 6m6-6l-6-6" />
        </svg>
      </button>

      <div className="h-4 w-[1px] bg-white/10"></div>

      {/* Snap to Grid */}
      <button
        onClick={() => setGridSnapping(!gridSnapping)}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          gridSnapping
            ? "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
            : "text-zinc-400 hover:text-white hover:bg-white/10"
        }`}
        title="Snap to Grid (20px)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>

      <div className="h-4 w-[1px] bg-white/10"></div>

      {/* Clear Canvas */}
      <button
        onClick={() => {
          if (confirm("Are you sure you want to clear the entire board?")) {
            clearCanvas();
          }
        }}
        className="p-2 text-zinc-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        title="Clear Board"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
