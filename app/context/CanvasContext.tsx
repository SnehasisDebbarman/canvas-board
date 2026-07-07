"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { nanoid } from "nanoid";
import * as Y from "yjs";

import type {
  CanvasNode,
  NodeType,
  Tool,
  Viewport,
} from "@/app/types/canvas";
import { DEFAULT_VIEWPORT, MIN_ZOOM, MAX_ZOOM } from "@/app/types/canvas";
import {
  yNodes,
  yDoc,
  initYjs,
  yTransact,
} from "@/app/lib/yjs/yjsProvider";
import {
  upsertNode,
  deleteNode as dbDeleteNode,
  addPendingOp,
} from "@/app/lib/db/canvasRepository";

export const undoManager = new Y.UndoManager(yNodes);

// ─── Default Style Palette ────────────────────────────────────────────────────

export const DEFAULT_STROKE = "#e2e8f0";
export const DEFAULT_FILL = "transparent";
export const DEFAULT_STROKE_WIDTH = 2;

// ─── Context Types ────────────────────────────────────────────────────────────

interface CanvasContextValue {
  // State
  nodes: CanvasNode[];
  viewport: Viewport;
  selectedIds: Set<string>;
  activeTool: Tool;
  isYjsReady: boolean;

  // Viewport actions
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;

  // Tool
  setActiveTool: (tool: Tool) => void;

  // Selection
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Node CRUD
  addNode: (partial: Partial<CanvasNode> & { type: NodeType }) => CanvasNode;
  updateNode: (id: string, changes: Partial<CanvasNode>) => void;
  updateNodes: (updates: Array<{ id: string; changes: Partial<CanvasNode> }>) => void;
  deleteSelectedNodes: () => void;
  deleteNode: (id: string) => void;
  duplicateSelectedNodes: () => void;
  clearCanvas: () => void;

  // Z-order
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Grid Snap
  gridSnapping: boolean;
  setGridSnapping: (val: boolean) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be inside CanvasProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isYjsReady, setIsYjsReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [gridSnapping, setGridSnapping] = useState(false);

  // Keep an online ref for use in callbacks
  const isOnlineRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);

  // ─── Boot from IndexedDB via Yjs ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initYjs();
      if (!cancelled) {
        setNodes(Array.from(yNodes.values()));
        setIsYjsReady(true);
      }
    })();

    // Observe Yjs changes — mirror to React state
    const observer = () => {
      setNodes(Array.from(yNodes.values()));
    };
    yNodes.observe(observer);

    // Track Undo/Redo stacks
    const checkStack = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on("stack-item-added", checkStack);
    undoManager.on("stack-item-popped", checkStack);

    // Track online status
    const onOnline = () => { isOnlineRef.current = true; };
    const onOffline = () => { isOnlineRef.current = false; };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      yNodes.unobserve(observer);
      undoManager.off("stack-item-added", checkStack);
      undoManager.off("stack-item-popped", checkStack);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ─── Node Creation ────────────────────────────────────────────────────────

  const addNode = useCallback(
    (partial: Partial<CanvasNode> & { type: NodeType }): CanvasNode => {
      const maxZ = nodes.reduce((m, n) => Math.max(m, n.zIndex), 0);
      const node: CanvasNode = {
        id: nanoid(),
        type: partial.type,
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        width: partial.width ?? 160,
        height: partial.height ?? 100,
        strokeColor: partial.strokeColor ?? DEFAULT_STROKE,
        fillColor: partial.fillColor ?? DEFAULT_FILL,
        strokeWidth: partial.strokeWidth ?? DEFAULT_STROKE_WIDTH,
        opacity: partial.opacity ?? 1,
        roughness: partial.roughness ?? 1.2,
        seed: partial.seed ?? Math.floor(Math.random() * 9999),
        text: partial.text,
        fontSize: partial.fontSize ?? 16,
        fontFamily: partial.fontFamily ?? "Inter, sans-serif",
        points: partial.points,
        imageUrl: partial.imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        zIndex: maxZ + 1,
      };

      yDoc.transact(() => {
        yNodes.set(node.id, node);
      });

      // Mirror to secondary Dexie store
      upsertNode(node).catch(console.error);

      // If offline, queue pending op
      if (!isOnlineRef.current) {
        addPendingOp({
          type: "add",
          boardId: "canvas-board-v1",
          nodeId: node.id,
          payload: node,
          timestamp: Date.now(),
        }).catch(console.error);
      }

      return node;
    },
    [nodes]
  );

  // ─── Node Update ──────────────────────────────────────────────────────────

  const updateNode = useCallback((id: string, changes: Partial<CanvasNode>) => {
    const existing = yNodes.get(id);
    if (!existing) return;
    const updated: CanvasNode = {
      ...existing,
      ...changes,
      updatedAt: Date.now(),
    };
    yDoc.transact(() => {
      yNodes.set(id, updated);
    });
    upsertNode(updated).catch(console.error);

    if (!isOnlineRef.current) {
      addPendingOp({
        type: "update",
        boardId: "canvas-board-v1",
        nodeId: id,
        payload: changes,
        timestamp: Date.now(),
      }).catch(console.error);
    }
  }, []);

  // ─── Batch Update (e.g., drag multiple) ──────────────────────────────────

  const updateNodes = useCallback(
    (updates: Array<{ id: string; changes: Partial<CanvasNode> }>) => {
      yDoc.transact(() => {
        for (const { id, changes } of updates) {
          const existing = yNodes.get(id);
          if (!existing) continue;
          const updated: CanvasNode = {
            ...existing,
            ...changes,
            updatedAt: Date.now(),
          };
          yNodes.set(id, updated);
          upsertNode(updated).catch(console.error);
        }
      });
    },
    []
  );

  // ─── Delete ───────────────────────────────────────────────────────────────

  const deleteSelectedNodes = useCallback(() => {
    yDoc.transact(() => {
      for (const id of selectedIds) {
        yNodes.delete(id);
        dbDeleteNode(id).catch(console.error);
      }
    });
    setSelectedIds(new Set());
  }, [selectedIds]);

  const deleteNode = useCallback((id: string) => {
    yDoc.transact(() => {
      yNodes.delete(id);
      dbDeleteNode(id).catch(console.error);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ─── Duplicate ────────────────────────────────────────────────────────────

  const duplicateSelectedNodes = useCallback(() => {
    const newIds = new Set<string>();
    yDoc.transact(() => {
      for (const id of selectedIds) {
        const node = yNodes.get(id);
        if (!node) continue;
        const newNode: CanvasNode = {
          ...node,
          id: nanoid(),
          x: node.x + 20,
          y: node.y + 20,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        yNodes.set(newNode.id, newNode);
        upsertNode(newNode).catch(console.error);
        newIds.add(newNode.id);
      }
    });
    setSelectedIds(newIds);
  }, [selectedIds]);

  // ─── Clear ────────────────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    yDoc.transact(() => {
      yNodes.clear();
    });
    setSelectedIds(new Set());
  }, []);

  // ─── Z-order ──────────────────────────────────────────────────────────────

  const bringForward = useCallback((id: string) => {
    const node = yNodes.get(id);
    if (!node) return;
    updateNode(id, { zIndex: node.zIndex + 1 });
  }, [updateNode]);

  const sendBackward = useCallback((id: string) => {
    const node = yNodes.get(id);
    if (!node) return;
    updateNode(id, { zIndex: Math.max(0, node.zIndex - 1) });
  }, [updateNode]);

  const undo = useCallback(() => {
    try {
      undoManager.undo();
    } catch (e) {
      console.warn("Undo failed", e);
    }
  }, []);

  const redo = useCallback(() => {
    try {
      undoManager.redo();
    } catch (e) {
      console.warn("Redo failed", e);
    }
  }, []);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "v": case "V": setActiveTool("select"); break;
        case "h": case "H": setActiveTool("pan"); break;
        case "r": case "R": setActiveTool("rect"); break;
        case "e": case "E": setActiveTool("ellipse"); break;
        case "d": case "D": setActiveTool("draw"); break;
        case "t": case "T": setActiveTool("text"); break;
        case "i": case "I": setActiveTool("image"); break;
        case "Escape":
          setActiveTool("select");
          setSelectedIds(new Set());
          break;
        case "Delete":
        case "Backspace":
          deleteSelectedNodes();
          break;
      }

      // Ctrl/Cmd shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "d": e.preventDefault(); duplicateSelectedNodes(); break;
          case "a": e.preventDefault(); setSelectedIds(new Set(nodes.map((n) => n.id))); break;
          case "z":
          case "Z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "y":
          case "Y":
            e.preventDefault();
            redo();
            break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelectedNodes, duplicateSelectedNodes, nodes]);

  return (
    <CanvasContext.Provider
      value={{
        nodes,
        viewport,
        selectedIds,
        activeTool,
        isYjsReady,
        setViewport,
        setActiveTool,
        setSelectedIds,
        addNode,
        updateNode,
        updateNodes,
        deleteSelectedNodes,
        deleteNode,
        duplicateSelectedNodes,
        clearCanvas,
        bringForward,
        sendBackward,
        undo,
        redo,
        canUndo,
        canRedo,
        gridSnapping,
        setGridSnapping,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}
