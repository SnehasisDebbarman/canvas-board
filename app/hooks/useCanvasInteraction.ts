"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Viewport,
  CanvasNode,
  Tool,
  InteractionState,
  ResizeHandle,
  FreehandPoint,
} from "@/app/types/canvas";
import {
  screenToWorld,
  worldToScreen,
  hitTest,
  getNodesInRect,
  applyResize,
} from "@/app/lib/canvas/coordinateSystem";

const SNAP_SIZE = 20;
function snap(val: number, enable: boolean): number {
  return enable ? Math.round(val / SNAP_SIZE) * SNAP_SIZE : val;
}

interface UseCanvasInteractionProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  nodes: CanvasNode[];
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  addNode: (partial: any) => CanvasNode;
  updateNode: (id: string, changes: Partial<CanvasNode>) => void;
  updateNodes: (updates: Array<{ id: string; changes: Partial<CanvasNode> }>) => void;
  gridSnapping: boolean;
}

export function useCanvasInteraction({
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
}: UseCanvasInteractionProps) {
  const [interaction, setInteraction] = useState<InteractionState>({ type: "idle" });
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  
  // Double-click / editing text state
  const [editingTextNodeId, setEditingTextNodeId] = useState<string | null>(null);

  // Keep latest refs to prevent stale closure dependencies in listeners
  const stateRef = useRef({
    nodes,
    viewport,
    activeTool,
    selectedIds,
    interaction,
  });

  useEffect(() => {
    stateRef.current = {
      nodes,
      viewport,
      activeTool,
      selectedIds,
      interaction,
    };
  }, [nodes, viewport, activeTool, selectedIds, interaction]);

  // Handle Wheel Zoom/Pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = stateRef.current;
      
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Zooming
        const zoomFactor = 1.05;
        const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
        
        setViewport((prev) => {
          const newZoom = Math.min(20, Math.max(0.05, prev.zoom * factor));
          const ratio = newZoom / prev.zoom;
          return {
            zoom: newZoom,
            panX: sx - ratio * (sx - prev.panX),
            panY: sy - ratio * (sy - prev.panY),
          };
        });
      } else {
        // Panning
        setViewport((prev) => ({
          ...prev,
          panX: prev.panX - e.deltaX,
          panY: prev.panY - e.deltaY,
        }));
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [canvasRef, setViewport]);

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const current = stateRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    
    const world = screenToWorld(sx, sy, current.viewport);

    // 1. Pan Tool (or space key/middle mouse pan)
    if (current.activeTool === "pan" || e.button === 1) {
      setInteraction({
        type: "panning",
        startScreenX: sx,
        startScreenY: sy,
        startPanX: current.viewport.panX,
        startPanY: current.viewport.panY,
      });
      return;
    }

    // 2. Editing check
    if (editingTextNodeId) {
      setEditingTextNodeId(null);
    }

    // Hit test elements
    const hit = hitTest(world.x, world.y, current.nodes, current.selectedIds, current.viewport.zoom);

    // 3. Selection handle hit -> Resize
    if (hit && hit.handle) {
      setInteraction({
        type: "resizing",
        nodeId: hit.node.id,
        handle: hit.handle,
        startWorldX: world.x,
        startWorldY: world.y,
        initialNode: { ...hit.node },
      });
      return;
    }

    // 4. Select Tool
    if (current.activeTool === "select") {
      if (hit) {
        const isSelected = current.selectedIds.has(hit.node.id);
        let newSelection = new Set(current.selectedIds);
        
        if (e.shiftKey) {
          if (isSelected) newSelection.delete(hit.node.id);
          else newSelection.add(hit.node.id);
        } else if (!isSelected) {
          newSelection = new Set([hit.node.id]);
        }
        
        setSelectedIds(newSelection);

        // Prepare for dragging
        const selectedList = Array.from(newSelection);
        const initialPositions: Record<string, { x: number; y: number }> = {};
        for (const id of selectedList) {
          const n = current.nodes.find((item) => item.id === id);
          if (n) {
            initialPositions[id] = { x: n.x, y: n.y };
          }
        }

        setInteraction({
          type: "dragging",
          nodeIds: selectedList,
          startWorldX: world.x,
          startWorldY: world.y,
          initialPositions,
        });
      } else {
        // Clear selection if not shifting
        if (!e.shiftKey) {
          setSelectedIds(new Set());
        }
        // Start rubber-band selection
        setInteraction({
          type: "selecting",
          startWorldX: world.x,
          startWorldY: world.y,
          currentWorldX: world.x,
          currentWorldY: world.y,
        });
        setSelectionRect({
          x1: world.x,
          y1: world.y,
          x2: world.x,
          y2: world.y,
        });
      }
      return;
    }

    // 5. Shape/Drawing Tools
    if (
      current.activeTool === "rect" ||
      current.activeTool === "ellipse" ||
      current.activeTool === "diamond" ||
      current.activeTool === "arrow" ||
      current.activeTool === "parallelogram" ||
      current.activeTool === "cylinder" ||
      current.activeTool === "text" ||
      current.activeTool === "image"
    ) {
      const type = current.activeTool;
      const node = addNode({
        type,
        x: world.x,
        y: world.y,
        width: 0,
        height: 0,
        text: type === "text" ? "" : undefined,
      });

      setSelectedIds(new Set([node.id]));
      setInteraction({
        type: "drawing",
        nodeId: node.id,
      });
      return;
    }

    // 6. Freehand Drawing
    if (current.activeTool === "draw") {
      const startPt: FreehandPoint = { x: world.x, y: world.y };
      const node = addNode({
        type: "freehand",
        x: world.x,
        y: world.y,
        width: 1,
        height: 1,
        points: [startPt],
      });
      setInteraction({
        type: "freehand",
        nodeId: node.id,
      });
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const current = stateRef.current;
    const { interaction } = current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, current.viewport);

    if (interaction.type === "idle") return;

    if (interaction.type === "panning") {
      const dx = sx - interaction.startScreenX;
      const dy = sy - interaction.startScreenY;
      setViewport({
        zoom: current.viewport.zoom,
        panX: interaction.startPanX + dx,
        panY: interaction.startPanY + dy,
      });
    }

    else if (interaction.type === "dragging") {
      const dx = world.x - interaction.startWorldX;
      const dy = world.y - interaction.startWorldY;

      const updates = interaction.nodeIds.map((id) => {
        const init = interaction.initialPositions[id];
        return {
          id,
          changes: {
            x: snap(init.x + dx, gridSnapping),
            y: snap(init.y + dy, gridSnapping),
          },
        };
      });
      updateNodes(updates);
    }

    else if (interaction.type === "resizing") {
      const dx = snap(world.x - interaction.startWorldX, gridSnapping);
      const dy = snap(world.y - interaction.startWorldY, gridSnapping);

      const changes = applyResize(
        interaction.initialNode,
        interaction.handle,
        dx,
        dy,
        dx,
        dy
      );
      updateNode(interaction.nodeId, changes);
    }

    else if (interaction.type === "drawing") {
      const node = current.nodes.find((n) => n.id === interaction.nodeId);
      if (!node) return;
      
      const width = snap(world.x - node.x, gridSnapping);
      const height = snap(world.y - node.y, gridSnapping);

      updateNode(node.id, {
        width,
        height,
      });
    }

    else if (interaction.type === "freehand") {
      const node = current.nodes.find((n) => n.id === interaction.nodeId);
      if (!node || !node.points) return;

      const updatedPoints = [...node.points, { x: world.x, y: world.y }];
      
      // Keep min/max boundaries updated
      const xs = updatedPoints.map((p) => p.x);
      const ys = updatedPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      updateNode(node.id, {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        points: updatedPoints,
      });
    }

    else if (interaction.type === "selecting") {
      setSelectionRect({
        x1: interaction.startWorldX,
        y1: interaction.startWorldY,
        x2: world.x,
        y2: world.y,
      });

      const intersected = getNodesInRect(
        interaction.startWorldX,
        interaction.startWorldY,
        world.x,
        world.y,
        current.nodes
      );
      setSelectedIds(new Set(intersected.map((n) => n.id)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    const current = stateRef.current;
    const { interaction } = current;

    // Convert small drawing node to default size if not dragged/drawn much
    if (interaction.type === "drawing") {
      const node = current.nodes.find((n) => n.id === interaction.nodeId);
      if (node && Math.abs(node.width) < 5 && Math.abs(node.height) < 5) {
        updateNode(node.id, {
          width: 120,
          height: 80,
        });
      }

      // Automatically transition text to editing
      if (node?.type === "text") {
        setEditingTextNodeId(node.id);
      }

    }

    if (interaction.type === "freehand") {
      // setActiveTool("select"); // Keep freehand active
    }

    setInteraction({ type: "idle" });
    setSelectionRect(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const current = stateRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, current.viewport);

    const hit = hitTest(world.x, world.y, current.nodes, current.selectedIds, current.viewport.zoom);
    if (hit) {
      if (hit.node.type === "text") {
        setEditingTextNodeId(hit.node.id);
      }
    } else {
      // Double click on empty canvas creates text box
      const node = addNode({
        type: "text",
        x: world.x - 60,
        y: world.y - 15,
        width: 120,
        height: 30,
        text: "",
      });
      setSelectedIds(new Set([node.id]));
      setEditingTextNodeId(node.id);
    }
  };

  return {
    interaction,
    selectionRect,
    editingTextNodeId,
    setEditingTextNodeId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  };
}
