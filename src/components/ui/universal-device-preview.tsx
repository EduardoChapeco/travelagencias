import React from "react";
import { DevicePreview, type DeviceViewport } from "./DevicePreview";
import { IframeSandbox } from "../portal/IframeSandbox";
import { cn } from "@/lib/utils";

interface UniversalDevicePreviewProps {
  viewport: DeviceViewport;
  children: React.ReactNode;
  themeBackground?: string;
  themePrimary?: string;
  className?: string;
  iframeClassName?: string;
}

export function UniversalDevicePreview({
  viewport,
  children,
  themeBackground = "#ffffff",
  themePrimary = "#0f172a",
  className,
  iframeClassName,
}: UniversalDevicePreviewProps) {
  // Define simulated width to enforce media queries inside the iframe based on the selected device
  const simulatedWidth = 
    viewport === "mobile" ? 375 : 
    viewport === "tablet" ? 768 : 
    1200;

  return (
    <DevicePreview
      viewport={viewport}
      themeBackground={themeBackground}
      themePrimary={themePrimary}
      className={cn("transition-all duration-500 ease-in-out", className)}
    >
      <IframeSandbox
        title="preview"
        simulatedWidth={simulatedWidth}
        className={cn("w-full h-full border-0", iframeClassName)}
      >
        {children}
      </IframeSandbox>
    </DevicePreview>
  );
}
