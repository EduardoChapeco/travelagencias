import React from "react";

interface StudioSidebarProps {
  children: React.ReactNode;
  className?: string;
  width?: number;
}

export function StudioSidebar({ children, className = "", width = 420 }: StudioSidebarProps) {
  return (
    <aside
      style={{ width }}
      className={`shrink-0 overflow-y-auto border-r border-border bg-surface dark:bg-zinc-950 p-5 no-scrollbar ${className}`}
    >
      <div className="space-y-4">{children}</div>
    </aside>
  );
}
