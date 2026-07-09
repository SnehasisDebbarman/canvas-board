"use client";

import { useConnectionStatus } from "@/app/hooks/useConnectionStatus";

export function ConnectionStatus() {
  const { isOnline, syncStatus, pendingCount } = useConnectionStatus();

  return (
    <div className="fixed top-4 md:top-6 left-4 md:left-6 z-50 flex items-center gap-3 px-3 py-2 bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-xl shadow-lg">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {syncStatus === "synced" && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </>
          )}
          {syncStatus === "connecting" && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </>
          )}
          {syncStatus === "pending" && (
            <>
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </>
          )}
          {syncStatus === "offline" && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          )}
        </span>
        <span className="text-xs font-semibold text-zinc-200 capitalize">
          {syncStatus === "synced" && "Synced"}
          {syncStatus === "connecting" && "Connecting..."}
          {syncStatus === "pending" && `Pending (${pendingCount})`}
          {syncStatus === "offline" && "Offline"}
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10"></div>

      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        }`}>
          {isOnline ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
    </div>
  );
}
