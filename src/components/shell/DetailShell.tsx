import React, { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface DetailTab {
  id: string;
  label: string;
  to: string; 
  params?: any;
  icon?: ReactNode;
  exact?: boolean;
}

export function DetailShell({
  header,
  tabs,
  children,
  className
}: {
  header: ReactNode;
  tabs?: DetailTab[];
  children: ReactNode;
  className?: string;
}) {
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname = (rawPathname ?? "/").replace(/\/$/, "") || "/";

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      
      {/* Header Area (doesn't scroll) */}
      <div className="flex-shrink-0 relative z-10">
        {header}
      </div>

      {/* Tabs Bar */}
      {tabs && tabs.length > 0 && (
        <div className="flex-shrink-0 px-4 md:px-6 pb-2 mb-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            {tabs.map((t) => {
              // Simplistic matching for styling active tab if we don't rely fully on Router's isActive
              // The `Link` component can do it, but we can do it manually for custom classes if needed.
              return (
                <Link
                  key={t.id}
                  to={t.to as any}
                  params={t.params}
                  activeProps={{
                    className: "bg-white/10 text-white border border-white/5 shadow-xs"
                  }}
                  inactiveProps={{
                    className: "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                  }}
                  activeOptions={{ exact: t.exact }}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-semibold rounded-full transition-all gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {t.icon}
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area (unified bounding and scroll handling) */}
      <div className="flex-1 flex flex-col min-h-0 relative page-content dock-offset max-w-7xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
