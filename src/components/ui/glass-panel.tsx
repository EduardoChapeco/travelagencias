import { cn } from "@/lib/utils";
import React from "react";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: "light" | "medium" | "heavy";
}

export function GlassPanel({ 
  children, 
  className, 
  intensity = "medium",
  ...props 
}: GlassPanelProps) {
  const intensityClasses = {
    light: "bg-background/20 backdrop-blur-md",
    medium: "bg-background/40 backdrop-blur-xl",
    heavy: "bg-background/60 backdrop-blur-3xl",
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10",
        intensityClasses[intensity],
        className
      )}
      {...props}
    >
      {/* Optional subtle inner glow/gradient could go here if we want more depth */}
      {children}
    </div>
  );
}
