"use client";

import { useCanvas } from "@/app/context/CanvasContext";

const STROKE_COLORS = [
  "#e2e8f0", // slate-200
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

const FILL_COLORS = [
  "transparent",
  "rgba(226, 232, 240, 0.2)",
  "rgba(239, 68, 68, 0.2)",
  "rgba(59, 130, 246, 0.2)",
  "rgba(16, 185, 129, 0.2)",
  "rgba(245, 158, 11, 0.2)",
  "rgba(139, 92, 246, 0.2)",
  "rgba(236, 72, 153, 0.2)",
];

export function PropertiesPanel() {
  const { selectedIds, nodes, updateNode, deleteSelectedNodes } = useCanvas();

  const selectedNodes = nodes.filter((n) => selectedIds.has(n.id));
  if (selectedNodes.length === 0) return null;

  // Grab the first selected node to read default property values
  const firstNode = selectedNodes[0];

  const updateProp = (key: string, value: any) => {
    for (const node of selectedNodes) {
      updateNode(node.id, { [key]: value });
    }
  };

  return (
    <div className="fixed top-6 right-6 z-40 w-64 p-4 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl shadow-xl flex flex-col gap-4 text-xs">
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <span className="font-semibold text-zinc-200">
          Selected ({selectedNodes.length})
        </span>
        <button
          onClick={deleteSelectedNodes}
          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          title="Delete selected nodes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Stroke Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-400 font-medium">Stroke Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {STROKE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateProp("strokeColor", c)}
              className={`w-6 h-6 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                firstNode.strokeColor === c ? "border-indigo-500 scale-105" : "border-white/10"
              }`}
              style={{ backgroundColor: c === "transparent" ? undefined : c }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-400 font-medium">Fill Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {FILL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateProp("fillColor", c)}
              className={`w-6 h-6 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                firstNode.fillColor === c ? "border-indigo-500 scale-105" : "border-white/10"
              }`}
              style={{
                backgroundColor: c === "transparent" ? undefined : c,
                backgroundImage: c === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : undefined,
                backgroundSize: c === "transparent" ? "8px 8px" : undefined,
                backgroundPosition: c === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-zinc-400">
          <span className="font-medium">Stroke Width</span>
          <span>{firstNode.strokeWidth}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={firstNode.strokeWidth ?? 2}
          onChange={(e) => updateProp("strokeWidth", parseInt(e.target.value))}
          className="w-full accent-indigo-600 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-zinc-400">
          <span className="font-medium">Opacity</span>
          <span>{Math.round((firstNode.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={firstNode.opacity ?? 1}
          onChange={(e) => updateProp("opacity", parseFloat(e.target.value))}
          className="w-full accent-indigo-600 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Roughness (For Hand-Drawn style) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-zinc-400">
          <span className="font-medium">Roughness</span>
          <span>{firstNode.roughness ?? 1.2}</span>
        </div>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={firstNode.roughness ?? 1.2}
          onChange={(e) => updateProp("roughness", parseFloat(e.target.value))}
          className="w-full accent-indigo-600 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}
