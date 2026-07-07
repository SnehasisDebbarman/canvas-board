import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Options as RoughOptions } from "roughjs/bin/core";
import type { CanvasNode, Viewport, FreehandPoint } from "@/app/types/canvas";
import { normalizeRect, worldToScreen, getResizeHandle } from "./coordinateSystem";

// ─── Renderer Class ────────────────────────────────────────────────────────────

export class CanvasRenderer {
  private rc: RoughCanvas | null = null;
  private lastCanvas: HTMLCanvasElement | null = null;

  /** Attach to a canvas element */
  attach(canvas: HTMLCanvasElement) {
    if (this.lastCanvas !== canvas) {
      this.rc = rough.canvas(canvas);
      this.lastCanvas = canvas;
    }
  }

  /** Full redraw cycle */
  render(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    nodes: CanvasNode[],
    viewport: Viewport,
    selectedIds: Set<string>,
    selectionRect?: { x1: number; y1: number; x2: number; y2: number } | null
  ) {
    this.attach(canvas);
    const { width, height } = canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background grid
    this.drawGrid(ctx, viewport, width, height);

    // Save transform
    ctx.save();
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Sort by zIndex
    const sorted = [...nodes].sort((a, b) => a.zIndex - b.zIndex);

    for (const node of sorted) {
      ctx.save();
      ctx.globalAlpha = node.opacity;
      this.drawNode(ctx, node, selectedIds.has(node.id));
      ctx.restore();
    }

    // Draw resize handles for selected nodes
    for (const node of sorted) {
      if (selectedIds.has(node.id)) {
        this.drawSelectionHandles(ctx, node, viewport.zoom);
      }
    }

    ctx.restore();

    // Rubber-band selection rect (screen space, not world space)
    if (selectionRect) {
      this.drawSelectionRect(ctx, selectionRect, viewport);
    }
  }

  // ─── Grid ──────────────────────────────────────────────────────────────────

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    w: number,
    h: number
  ) {
    const spacing = 40 * viewport.zoom;
    const offsetX = viewport.panX % spacing;
    const offsetY = viewport.panY % spacing;

    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;

    for (let x = offsetX; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Dot grid overlay
    ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
    for (let x = offsetX; x < w; x += spacing) {
      for (let y = offsetY; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ─── Node Drawing ──────────────────────────────────────────────────────────

  private drawNode(
    ctx: CanvasRenderingContext2D,
    node: CanvasNode,
    selected: boolean
  ) {
    if (!this.rc) return;

    const r = normalizeRect(node);
    if (r.width < 1 && r.height < 1 && node.type !== "freehand") return;

    const roughOpts: RoughOptions = {
      stroke: node.strokeColor,
      fill: node.fillColor === "transparent" ? undefined : node.fillColor,
      fillStyle: "solid",
      strokeWidth: node.strokeWidth,
      roughness: node.roughness ?? 1.2,
      seed: node.seed ?? 1,
    };

    switch (node.type) {
      case "rect":
        this.rc.rectangle(r.x, r.y, r.width, r.height, roughOpts);
        break;

      case "ellipse":
        this.rc.ellipse(
          r.x + r.width / 2,
          r.y + r.height / 2,
          r.width,
          r.height,
          roughOpts
        );
        break;

      case "diamond":
        this.rc.polygon(
          [
            [r.x + r.width / 2, r.y],
            [r.x + r.width, r.y + r.height / 2],
            [r.x + r.width / 2, r.y + r.height],
            [r.x, r.y + r.height / 2],
          ],
          roughOpts
        );
        break;

      case "arrow": {
        const x1 = node.width >= 0 ? r.x : r.x + r.width;
        const y1 = node.height >= 0 ? r.y : r.y + r.height;
        const x2 = node.width >= 0 ? r.x + r.width : r.x;
        const y2 = node.height >= 0 ? r.y + r.height : r.y;
        
        // Draw the main line
        this.rc.line(x1, y1, x2, y2, roughOpts);
        
        // Draw arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headlen = 15;
        this.rc.line(
          x2, y2,
          x2 - headlen * Math.cos(angle - Math.PI / 6),
          y2 - headlen * Math.sin(angle - Math.PI / 6),
          roughOpts
        );
        this.rc.line(
          x2, y2,
          x2 - headlen * Math.cos(angle + Math.PI / 6),
          y2 - headlen * Math.sin(angle + Math.PI / 6),
          roughOpts
        );
        break;
      }

      case "parallelogram": {
        const offset = r.width * 0.2;
        this.rc.polygon(
          [
            [r.x + offset, r.y],
            [r.x + r.width, r.y],
            [r.x + r.width - offset, r.y + r.height],
            [r.x, r.y + r.height],
          ],
          roughOpts
        );
        break;
      }

      case "cylinder": {
        const ry = Math.min(r.height * 0.15, 20);
        // Cylinder body
        const d = `
          M ${r.x} ${r.y + ry}
          L ${r.x} ${r.y + r.height - ry}
          A ${r.width/2} ${ry} 0 0 0 ${r.x + r.width} ${r.y + r.height - ry}
          L ${r.x + r.width} ${r.y + ry}
          A ${r.width/2} ${ry} 0 0 1 ${r.x} ${r.y + ry}
        `;
        this.rc.path(d, roughOpts);
        // Cylinder top lid
        this.rc.ellipse(
          r.x + r.width / 2,
          r.y + ry,
          r.width,
          ry * 2,
          roughOpts
        );
        break;
      }

      case "freehand":
        if (node.points && node.points.length > 1) {
          this.drawFreehand(ctx, node.points, node.strokeColor, node.strokeWidth);
        }
        break;

      case "text":
        this.drawText(ctx, node, r);
        break;

      case "image":
        this.drawImagePlaceholder(ctx, r, node);
        break;
    }

    // Selection highlight outline
    if (selected) {
      ctx.save();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2 / (this.lastCanvas ? 1 : 1);
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private drawFreehand(
    ctx: CanvasRenderingContext2D,
    points: FreehandPoint[],
    color: string,
    width: number
  ) {
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 2; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    node: CanvasNode,
    r: { x: number; y: number; width: number; height: number }
  ) {
    if (!node.text) return;
    ctx.save();
    ctx.fillStyle = node.strokeColor;
    ctx.font = `${node.fontSize ?? 16}px ${node.fontFamily ?? "Inter, sans-serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Word wrap
    const lines = wrapText(ctx, node.text, r.width - 16);
    const lineHeight = (node.fontSize ?? 16) * 1.4;
    const totalH = lines.length * lineHeight;
    let yStart = r.y + r.height / 2 - totalH / 2 + lineHeight / 2;
    for (const line of lines) {
      ctx.fillText(line, r.x + r.width / 2, yStart);
      yStart += lineHeight;
    }
    // Box background
    ctx.restore();
  }

  private drawImagePlaceholder(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; width: number; height: number },
    node: CanvasNode
  ) {
    ctx.save();
    // Gradient background
    const grad = ctx.createLinearGradient(r.x, r.y, r.x + r.width, r.y + r.height);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#312e81");
    ctx.fillStyle = grad;
    ctx.strokeStyle = node.strokeColor;
    ctx.lineWidth = node.strokeWidth;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.width, r.height, 6);
    ctx.fill();
    ctx.stroke();

    // Image icon
    ctx.fillStyle = "rgba(99, 102, 241, 0.6)";
    const iw = Math.min(r.width * 0.4, 48);
    const ih = iw * 0.7;
    const ix = r.x + r.width / 2 - iw / 2;
    const iy = r.y + r.height / 2 - ih / 2;
    ctx.beginPath();
    ctx.roundRect(ix, iy, iw, ih, 4);
    ctx.fill();

    ctx.fillStyle = "#c7d2fe";
    ctx.font = `${Math.min(r.width / 6, 12)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Image", r.x + r.width / 2, r.y + r.height / 2 + ih / 2 + 8);
    ctx.restore();
  }

  // ─── Resize Handles ────────────────────────────────────────────────────────

  private drawSelectionHandles(
    ctx: CanvasRenderingContext2D,
    node: CanvasNode,
    zoom: number
  ) {
    const r = normalizeRect(node);
    const handleSize = 8 / zoom;
    const handles = [
      { x: r.x,               y: r.y                },
      { x: r.x + r.width / 2, y: r.y                },
      { x: r.x + r.width,     y: r.y                },
      { x: r.x,               y: r.y + r.height / 2 },
      { x: r.x + r.width,     y: r.y + r.height / 2 },
      { x: r.x,               y: r.y + r.height      },
      { x: r.x + r.width / 2, y: r.y + r.height      },
      { x: r.x + r.width,     y: r.y + r.height      },
    ];

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5 / zoom;

    for (const h of handles) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Rubber-band Rect (screen space) ───────────────────────────────────────

  private drawSelectionRect(
    ctx: CanvasRenderingContext2D,
    rect: { x1: number; y1: number; x2: number; y2: number },
    viewport: Viewport
  ) {
    const sx1 = rect.x1 * viewport.zoom + viewport.panX;
    const sy1 = rect.y1 * viewport.zoom + viewport.panY;
    const sx2 = rect.x2 * viewport.zoom + viewport.panX;
    const sy2 = rect.y2 * viewport.zoom + viewport.panY;

    const x = Math.min(sx1, sx2);
    const y = Math.min(sy1, sy2);
    const w = Math.abs(sx2 - sx1);
    const h = Math.abs(sy2 - sy1);

    ctx.save();
    ctx.fillStyle = "rgba(99, 102, 241, 0.06)";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

export const renderer = new CanvasRenderer();
