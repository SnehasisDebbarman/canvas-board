"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import type { CanvasNode } from "@/app/types/canvas";

// ─── Yjs Document ─────────────────────────────────────────────────────────────

export const BOARD_ID = "canvas-board-v1";

export const yDoc = new Y.Doc();

/** Y.Map keyed by node.id → CanvasNode */
export const yNodes = yDoc.getMap<CanvasNode>("nodes");

// ─── Local IndexedDB Persistence ─────────────────────────────────────────────

let _indexeddbProvider: IndexeddbPersistence | null = null;
let _synced = false;

export function getIndexeddbProvider(): IndexeddbPersistence | null {
  return _indexeddbProvider;
}

export function isYjsSynced(): boolean {
  return _synced;
}

/**
 * Initialize Yjs with IndexedDB persistence.
 * Returns a promise that resolves when the local state is fully loaded.
 */
export async function initYjs(): Promise<void> {
  if (_indexeddbProvider) return; // already initialized

  _indexeddbProvider = new IndexeddbPersistence(BOARD_ID, yDoc);

  return new Promise<void>((resolve) => {
    _indexeddbProvider!.on("synced", () => {
      _synced = true;
      resolve();
    });

    // Fallback: resolve after 2s in case synced doesn't fire
    setTimeout(resolve, 2000);
  });
}

// ─── WebSocket Provider (lazy) ────────────────────────────────────────────────

let _wsProvider: unknown = null;

export async function connectWebSocket(url: string): Promise<void> {
  if (_wsProvider) return;
  try {
    const { WebsocketProvider } = await import("y-websocket");
    const provider = new WebsocketProvider(url, BOARD_ID, yDoc, {
      connect: true,
    });
    _wsProvider = provider;
  } catch (e) {
    console.warn("[Yjs] WebSocket connection failed:", e);
  }
}

export function disconnectWebSocket(): void {
  if (_wsProvider) {
    const p = _wsProvider as { destroy: () => void };
    p.destroy?.();
    _wsProvider = null;
  }
}

export function getWsProvider(): unknown {
  return _wsProvider;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get all nodes as a plain array */
export function getYNodes(): CanvasNode[] {
  return Array.from(yNodes.values());
}

/** Batch transaction for multiple mutations */
export function yTransact(fn: () => void) {
  yDoc.transact(fn);
}
