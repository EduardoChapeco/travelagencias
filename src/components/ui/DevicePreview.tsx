import React from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

export type DeviceViewport = "mobile" | "tablet" | "desktop";

type DevicePreviewProps = {
  viewport: DeviceViewport;
  children: React.ReactNode;
  themeBackground?: string;
  themePrimary?: string;
  className?: string;
};

export function DevicePreview({
  viewport,
  children,
  themeBackground = "#ffffff",
  themePrimary = "#0f172a",
  className = "",
}: DevicePreviewProps) {
  if (viewport === "desktop") {
    return (
      <div className={`w-full max-w-6xl mx-auto rounded-[24px] shadow-xl border border-border overflow-hidden flex flex-col bg-background ${className}`}>
        {/* Fake Browser Top */}
        <div className="h-10 bg-surface border-b border-border flex items-center px-4 gap-2 shrink-0">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
          </div>
          <div className="mx-auto h-6 w-1/2 bg-background border border-border rounded-full"></div>
        </div>
        <div 
          className="flex-1 w-full h-full overflow-y-auto no-scrollbar relative"
          style={{ backgroundColor: themeBackground }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Tablet (similar ao desktop mas menor e diferente ratio)
  if (viewport === "tablet") {
    return (
      <div className={`relative w-[768px] h-[1024px] max-h-full mx-auto bg-black rounded-[40px] shadow-2xl p-[16px] shrink-0 border-[4px] border-zinc-700 flex flex-col scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100 origin-top ${className}`}>
         <div 
          className="w-full h-full rounded-[24px] overflow-hidden overflow-y-auto no-scrollbar relative bg-background"
          style={{ backgroundColor: themeBackground }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Mobile Mockup
  return (
    <div className={`relative w-[375px] h-[812px] bg-black rounded-[50px] shadow-2xl p-[12px] shrink-0 border-[8px] border-zinc-800 scale-75 md:scale-90 lg:scale-100 origin-top ${className}`}>
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-20"></div>
      
      <div 
        className="w-full h-full rounded-[38px] overflow-hidden overflow-y-auto no-scrollbar relative flex flex-col bg-background"
        style={{ backgroundColor: themeBackground }}
      >
        {children}
        
        {/* Fake Tab Bar (Opcional, pode ser parametrizado depois se quisermos remover) */}
        <div className="absolute bottom-0 w-full h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-10 rounded-b-[38px]">
          <div className="flex flex-col items-center gap-1" style={{ color: themePrimary }}>
            <div className="h-5 w-5 rounded-full bg-current opacity-20"></div>
            <div className="h-1 w-6 bg-current rounded-full"></div>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <div className="h-5 w-5 rounded-full bg-current"></div>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <div className="h-5 w-5 rounded-full bg-current"></div>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <div className="h-5 w-5 rounded-full bg-current"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

type DeviceSelectorProps = {
  viewport: DeviceViewport;
  onChange: (v: DeviceViewport) => void;
};

export function DeviceSelector({ viewport, onChange }: DeviceSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-2xl p-1">
      <button
        onClick={() => onChange("desktop")}
        className={`p-1.5 rounded-full transition-colors ${
          viewport === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
        title="Desktop"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("tablet")}
        className={`p-1.5 rounded-full transition-colors ${
          viewport === "tablet" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
        title="Tablet"
      >
        <Tablet className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("mobile")}
        className={`p-1.5 rounded-full transition-colors ${
          viewport === "mobile" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
        title="Mobile"
      >
        <Smartphone className="h-4 w-4" />
      </button>
    </div>
  );
}
