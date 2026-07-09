"use client";

import { CanvasProvider } from "./context/CanvasContext";
import { CanvasContainer } from "./components/canvas/CanvasContainer";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ZoomControl } from "./components/toolbar/ZoomControl";
import { ConnectionStatus } from "./components/status/ConnectionStatus";
import { PropertiesPanel } from "./components/properties/PropertiesPanel";
import { CanvasSettings } from "./components/toolbar/CanvasSettings";

export default function Home() {
  return (
    <CanvasProvider>
      <main className="relative flex flex-col w-screen h-[100dvh] overflow-hidden bg-zinc-950">
        {/* Status indicator */}
        <ConnectionStatus />

        {/* Toolbar bottom center */}
        <Toolbar />

        {/* Settings bottom left */}
        <CanvasSettings />

        {/* Zoom bottom right */}
        <ZoomControl />

        {/* Properties top right (collapsible/visible on selection) */}
        <PropertiesPanel />

        {/* Main Canvas Area */}
        <div className="flex-1 w-full h-full">
          <CanvasContainer />
        </div>
      </main>
    </CanvasProvider>
  );
}
