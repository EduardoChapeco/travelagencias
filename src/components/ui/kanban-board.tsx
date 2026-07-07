import * as React from "react";
import { cn } from "@/lib/utils";

export function KanbanBoard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-1 flex-col min-h-0", className)} {...props} />;
}

export function KanbanDesktopContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("hidden lg:flex flex-1 flex-col min-h-0", className)} {...props} />;
}

export function KanbanScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-x-auto overflow-y-hidden p-3 no-scrollbar cursor-grab active:cursor-grabbing", className)}
      {...props}
    />
  );
}

export function KanbanColumnList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex h-full min-w-max gap-4 px-2", className)} {...props} />;
}

export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  isOver?: boolean;
  color?: string;
}

export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ className, isOver, color, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-[320px] shrink-0 flex-col rounded-[var(--radius-card)] border bg-black/5 dark:bg-white/5 backdrop-blur-3xl transition-all duration-300",
          isOver ? "border-brand bg-brand/10 scale-[1.02]" : "border-white/10 dark:border-white/5",
          className
        )}
        style={{ borderTop: color ? `4px solid ${color}` : undefined, ...style }}
        {...props}
      />
    );
  }
);
KanbanColumn.displayName = "KanbanColumn";

export interface KanbanColumnHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  color?: string;
  count?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function KanbanColumnHeader({
  className,
  title,
  color,
  count,
  subtitle,
  children,
  ...props
}: KanbanColumnHeaderProps) {
  return (
    <div
      className={cn("flex flex-col justify-center border-b border-white/10 dark:border-white/5 bg-transparent px-5 py-4 rounded-t-[28px]", className)}
      {...props}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          {color && <span className="h-3 w-3 rounded-full ring-2 ring-white/20" style={{ background: color }} />}
          <span className="text-[12px] font-bold uppercase tracking-widest text-foreground/90">
            {title}
          </span>
        </div>
        {count !== undefined && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black/10 dark:bg-white/10 px-2 text-[11px] font-bold text-foreground">
            {count}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-[11px] font-medium text-foreground/60 mt-1 ml-5">
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}

export function KanbanColumnBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 space-y-3 overflow-y-auto p-4 no-scrollbar cursor-default", className)}
      {...props}
    />
  );
}

export function KanbanMobileAccordion({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-3xl overflow-hidden shadow-none", className)}
      {...props}
    />
  );
}
