import type { Viewport, CanvasNode, ResizeHandle, HitResult, FreehandPoint } from "@/app/types/canvas";

// ─── Screen ↔ World Transforms ─────────────────────────────────────────────────

/**
 * Convert a screen-space coordinate to world-space.
 * World = (Screen - canvasOffset) / zoom - pan
 */
export function screenToWorld(
  sx: number,
  sy: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: (sx - viewport.panX) / viewport.zoom,
    y: (sy - viewport.panY) / viewport.zoom,
  };
}

/**
 * Convert a world-space coordinate to screen-space.
 * Screen = World * zoom + pan
 */
export function worldToScreen(
  wx: number,
  wy: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: wx * viewport.zoom + viewport.panX,
    y: wy * viewport.zoom + viewport.panY,
  };
}

/**
 * Compute a new viewport when zooming around a focal point (screen coords).
 */
export function zoomAroundPoint(
  viewport: Viewport,
  focalX: number,
  focalY: number,
  scaleFactor: number,
  minZoom: number,
  maxZoom: number
): Viewport {
  const newZoom = Math.min(maxZoom, Math.max(minZoom, viewport.zoom * scaleFactor));
  const zoomRatio = newZoom / viewport.zoom;
  return {
    zoom: newZoom,
    panX: focalX - zoomRatio * (focalX - viewport.panX),
    panY: focalY - zoomRatio * (focalY - viewport.panY),
  };
}

// ─── AABB helpers ──────────────────────────────────────────────────────────────

/** Returns normalized (positive-size) bounding box of a node */
export function normalizeRect(node: CanvasNode) {
  const x = node.width >= 0 ? node.x : node.x + node.width;
  const y = node.height >= 0 ? node.y : node.y + node.height;
  return {
    x,
    y,
    width: Math.abs(node.width),
    height: Math.abs(node.height),
  };
}

/** Point-in-AABB test (world space) */
export function pointInRect(
  wx: number,
  wy: number,
  node: CanvasNode,
  padding = 0
): boolean {
  const r = normalizeRect(node);
  return (
    wx >= r.x - padding &&
    wx <= r.x + r.width + padding &&
    wy >= r.y - padding &&
    wy <= r.y + r.height + padding
  );
}

/** Point-in-Ellipse test */
export function pointInEllipse(wx: number, wy: number, node: CanvasNode): boolean {
  const r = normalizeRect(node);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const rx = r.width / 2;
  const ry = r.height / 2;
  if (rx === 0 || ry === 0) return false;
  const dx = (wx - cx) / rx;
  const dy = (wy - cy) / ry;
  return dx * dx + dy * dy <= 1.1; // slight tolerance
}

/** Point-in-Diamond test */
export function pointInDiamond(wx: number, wy: number, node: CanvasNode): boolean {
  const r = normalizeRect(node);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const dx = Math.abs(wx - cx) / (r.width / 2);
  const dy = Math.abs(wy - cy) / (r.height / 2);
  return dx + dy <= 1.1;
}

/** Point-near-freehand-path test */
export function pointNearPath(
  wx: number,
  wy: number,
  points: FreehandPoint[],
  threshold = 8
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = distToSegment(wx, wy, a.x, a.y, b.x, b.y);
    if (dist < threshold) return true;
  }
  return false;
}

function distToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const nearX = ax + t * dx;
  const nearY = ay + t * dy;
  return Math.hypot(px - nearX, py - nearY);
}

// ─── Resize Handle Detection ────────────────────────────────────────────────────

const HANDLE_SIZE = 8; // pixels in screen space

/** Returns the resize handle at a screen-space point, if any */
export function getResizeHandle(
  wx: number,
  wy: number,
  node: CanvasNode,
  zoom: number
): ResizeHandle | null {
  const r = normalizeRect(node);
  const pad = HANDLE_SIZE / zoom;
  const handles: Array<{ name: ResizeHandle; hx: number; hy: number }> = [
    { name: "nw", hx: r.x,               hy: r.y                },
    { name: "n",  hx: r.x + r.width / 2, hy: r.y                },
    { name: "ne", hx: r.x + r.width,     hy: r.y                },
    { name: "w",  hx: r.x,               hy: r.y + r.height / 2 },
    { name: "e",  hx: r.x + r.width,     hy: r.y + r.height / 2 },
    { name: "sw", hx: r.x,               hy: r.y + r.height      },
    { name: "s",  hx: r.x + r.width / 2, hy: r.y + r.height      },
    { name: "se", hx: r.x + r.width,     hy: r.y + r.height      },
  ];
  for (const h of handles) {
    if (Math.abs(wx - h.hx) <= pad && Math.abs(wy - h.hy) <= pad) {
      return h.name;
    }
  }
  return null;
}

// ─── Hit Testing ───────────────────────────────────────────────────────────────

/** Full hit test: returns matching node + optional resize handle */
export function hitTest(
  wx: number,
  wy: number,
  nodes: CanvasNode[],
  selectedIds: Set<string>,
  zoom: number
): HitResult | null {
  // Test in reverse zIndex (top-most first)
  const sorted = [...nodes].sort((a, b) => b.zIndex - a.zIndex);

  // First check resize handles for selected nodes
  for (const node of sorted) {
    if (!selectedIds.has(node.id)) continue;
    const handle = getResizeHandle(wx, wy, node, zoom);
    if (handle) return { node, handle };
  }

  // Then check body hits
  for (const node of sorted) {
    let hit = false;
    switch (node.type) {
      case "rect":
      case "text":
      case "image":
        hit = pointInRect(wx, wy, node);
        break;
      case "ellipse":
        hit = pointInEllipse(wx, wy, node);
        break;
      case "diamond":
        hit = pointInDiamond(wx, wy, node);
        break;
      case "freehand":
        if (node.points) hit = pointNearPath(wx, wy, node.points);
        break;
    }
    if (hit) return { node };
  }
  return null;
}

// ─── Rubber-band Selection ─────────────────────────────────────────────────────

/** Returns all nodes intersecting the selection rect */
export function getNodesInRect(
  x1: number, y1: number,
  x2: number, y2: number,
  nodes: CanvasNode[]
): CanvasNode[] {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  return nodes.filter((n) => {
    const r = normalizeRect(n);
    return (
      r.x < maxX && r.x + r.width > minX &&
      r.y < maxY && r.y + r.height > minY
    );
  });
}

// ─── Apply Resize Delta ─────────────────────────────────────────────────────────

export function applyResize(
  node: CanvasNode,
  handle: ResizeHandle,
  dw: number,
  dh: number,
  dx: number,
  dy: number
): Partial<CanvasNode> {
  let { x, y, width, height } = node;
  switch (handle) {
    case "se": width += dw; height += dh; break;
    case "sw": x += dx; width -= dw; height += dh; break;
    case "ne": width += dw; y += dy; height -= dh; break;
    case "nw": x += dx; y += dy; width -= dw; height -= dh; break;
    case "e":  width += dw; break;
    case "w":  x += dx; width -= dw; break;
    case "s":  height += dh; break;
    case "n":  y += dy; height -= dh; break;
  }
  return { x, y, width, height };
}
