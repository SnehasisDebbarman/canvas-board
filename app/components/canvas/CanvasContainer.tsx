"use client";

import { useEffect, useRef } from "react";
import { useCanvas } from "@/app/context/CanvasContext";
import { useCanvasInteraction } from "@/app/hooks/useCanvasInteraction";
import { renderer } from "@/app/lib/canvas/renderer";
import { worldToScreen } from "@/app/lib/canvas/coordinateSystem";

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    nodes,
    viewport,
    setViewport,
    selectedIds,
    setSelectedIds,
    activeTool,
    setActiveTool,
    addNode,
    updateNode,
    updateNodes,
    deleteNode,
    gridSnapping,
  } = useCanvas();

  const {
    interaction,
    selectionRect,
    editingTextNodeId,
    setEditingTextNodeId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDoubleClick,
  } = useCanvasInteraction({
    canvasRef,
    nodes,
    viewport,
    setViewport,
    activeTool,
    setActiveTool,
    selectedIds,
    setSelectedIds,
    addNode,
    updateNode,
    updateNodes,
    gridSnapping,
  });

  // Handle high frequency canvas repaint loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const renderLoop = () => {
      renderer.render(canvas, ctx, nodes, viewport, selectedIds, selectionRect);
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodes, viewport, selectedIds, selectionRect]);

  // Handle Canvas Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Compute absolute screen position of text node currently being edited
  const getEditingTextConfig = () => {
    if (!editingTextNodeId) return null;
    const node = nodes.find((n) => n.id === editingTextNodeId);
    if (!node) return null;

    const screenPos = worldToScreen(node.x, node.y, viewport);
    return {
      node,
      style: {
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        width: `${Math.max(120, node.width * viewport.zoom)}px`,
        height: `${Math.max(40, node.height * viewport.zoom)}px`,
        fontSize: `${(node.fontSize ?? 16) * viewport.zoom}px`,
        fontFamily: node.fontFamily ?? "Inter, sans-serif",
        color: node.strokeColor,
      },
    };
  };

  const editingText = getEditingTextConfig();

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block touch-none outline-none select-none ${
          activeTool === "pan" || interaction.type === "panning"
            ? "cursor-grab active:cursor-grabbing"
            : activeTool === "draw"
            ? "cursor-crosshair"
            : "cursor-default"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Inline Text Editor Overlay */}
      {editingText && (
        <textarea
          autoFocus
          className="absolute z-30 p-2 bg-zinc-900 border border-indigo-500 rounded shadow-lg text-center outline-none resize-none overflow-hidden"
          style={editingText.style}
          value={editingText.node.text ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            const target = e.target;
            
            // Auto expand text area size based on scroll height and width
            target.style.height = "auto";
            target.style.width = "auto";
            
            // Limit text area bounds, divide by zoom to get world coordinates
            const newHeight = Math.max(40, target.scrollHeight + 8) / viewport.zoom;
            const newWidth = Math.max(120, target.scrollWidth + 16) / viewport.zoom;

            updateNode(editingText.node.id, {
              text: val,
              width: newWidth,
              height: newHeight,
            });
          }}
          onBlur={() => {
            // Remove text node if left completely empty
            if (!editingText.node.text || editingText.node.text.trim() === "") {
              deleteNode(editingText.node.id);
            }
            setEditingTextNodeId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      )}
    </div>
  );
}
