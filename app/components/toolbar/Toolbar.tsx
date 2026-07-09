"use client";

import { useCanvas } from "@/app/context/CanvasContext";
import type { Tool } from "@/app/types/canvas";

interface ToolItem {
  type: Tool;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvas();

  const tools: ToolItem[] = [
    {
      type: "select",
      label: "Select",
      shortcut: "V",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      type: "pan",
      label: "Pan",
      shortcut: "H",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      type: "rect",
      label: "Rectangle",
      shortcut: "R",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect width={16} height={16} x={4} y={4} rx={2} strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: "ellipse",
      label: "Ellipse",
      shortcut: "E",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx={12} cy={12} r={8} strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: "diamond",
      label: "Diamond",
      shortcut: "",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l9 9-9 9-9-9 9-9z" />
        </svg>
      ),
    },
    {
      type: "arrow",
      label: "Arrow",
      shortcut: "A",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
    },
    {
      type: "parallelogram",
      label: "Parallelogram",
      shortcut: "P",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h12l-4 16H4L8 4z" />
        </svg>
      ),
    },
    {
      type: "cylinder",
      label: "Cylinder",
      shortcut: "C",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3v10c0 1.657-3.582 3-8 3s-8-1.343-8-3V7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />
        </svg>
      ),
    },
    {
      type: "text",
      label: "Text",
      shortcut: "T",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12m-12 6h8" />
        </svg>
      ),
    },
    {
      type: "draw",
      label: "Pencil",
      shortcut: "D",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      type: "image",
      label: "Image",
      shortcut: "I",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] max-w-[calc(100vw-2rem)] md:max-w-none overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {tools.map((t) => {
        const active = activeTool === t.type;
        return (
          <button
            key={t.type}
            onClick={() => setActiveTool(t.type)}
            className={`group relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer ${
              active
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                : "text-zinc-400 hover:text-zinc-150 hover:bg-white/10"
            }`}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.icon}
            
            {/* Tooltip */}
            <span className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-white bg-zinc-800 border border-white/10 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
              {t.label} <span className="ml-1 text-zinc-400 border border-zinc-700 px-1 rounded text-[10px]">{t.shortcut}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
