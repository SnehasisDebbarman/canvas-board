"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SyncStatus } from "@/app/types/canvas";
import {
  connectWebSocket,
  disconnectWebSocket,
  getWsProvider,
} from "@/app/lib/yjs/yjsProvider";
import { getPendingOpsCount } from "@/app/lib/db/canvasRepository";

const WS_URL = "ws://localhost:1234";

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [pendingCount, setPendingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingOpsCount();
    setPendingCount(count);
  }, []);

  const tryConnect = useCallback(async () => {
    if (!isOnline) {
      setSyncStatus("offline");
      return;
    }
    try {
      await connectWebSocket(WS_URL);
      const provider = getWsProvider() as {
        wsconnected?: boolean;
        on?: (event: string, cb: () => void) => void;
      } | null;

      if (provider?.on) {
        provider.on("status", () => {
          setSyncStatus(provider.wsconnected ? "synced" : "pending");
        });
        setSyncStatus(provider.wsconnected ? "synced" : "pending");
      } else {
        // No WS server running — still functional, just local
        setSyncStatus("synced");
      }
    } catch {
      setSyncStatus("offline");
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus("connecting");
      await tryConnect();
      await updatePendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
      disconnectWebSocket();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial connection attempt
    tryConnect();

    // Poll pending count every 2s
    pollRef.current = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tryConnect, updatePendingCount]);

  return { isOnline, syncStatus, pendingCount };
}
