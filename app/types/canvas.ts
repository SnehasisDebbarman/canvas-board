// ─── Node Types ────────────────────────────────────────────────────────────────

export type NodeType =
  | "rect"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "parallelogram"
  | "cylinder"
  | "text"
  | "image"
  | "freehand";

export interface FreehandPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  points?: FreehandPoint[]; // for freehand
  roughness?: number;
  seed?: number;
  createdAt: number;
  updatedAt: number;
  zIndex: number;
}

export type PartialNode = Partial<CanvasNode> & { id: string };

// ─── Viewport ──────────────────────────────────────────────────────────────────

export interface Viewport {
  zoom: number; // scale factor, e.g. 1.0 = 100%
  panX: number; // world-space offset in px
  panY: number;
}

export const DEFAULT_VIEWPORT: Viewport = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 20;

// ─── Tools ─────────────────────────────────────────────────────────────────────

export type Tool =
  | "select"
  | "pan"
  | "rect"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "parallelogram"
  | "cylinder"
  | "text"
  | "draw"
  | "image";

// ─── Sync Status ───────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "pending" | "offline" | "connecting";

// ─── Interaction State Machine ──────────────────────────────────────────────────

export type InteractionState =
  | { type: "idle" }
  | { type: "panning"; startScreenX: number; startScreenY: number; startPanX: number; startPanY: number }
  | { type: "drawing"; nodeId: string }
  | { type: "dragging"; nodeIds: string[]; startWorldX: number; startWorldY: number; initialPositions: Record<string, { x: number; y: number }> }
  | { type: "resizing"; nodeId: string; handle: ResizeHandle; startWorldX: number; startWorldY: number; initialNode: CanvasNode }
  | { type: "selecting"; startWorldX: number; startWorldY: number; currentWorldX: number; currentWorldY: number }
  | { type: "freehand"; nodeId: string };

export type ResizeHandle =
  | "nw" | "n" | "ne"
  | "w"          | "e"
  | "sw" | "s" | "se";

// ─── Hit Test ──────────────────────────────────────────────────────────────────

export interface HitResult {
  node: CanvasNode;
  handle?: ResizeHandle;
}

// ─── Board ─────────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
