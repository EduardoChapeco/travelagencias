import * as React from "react";
import { cn } from "@/lib/utils";

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "neutral" | "info";
}

export function KpiCard({
  label,
  value,
  icon,
  tone = "neutral",
  className,
  ...props
}: KpiCardProps) {
  const bgClasses = {
    success: "glass text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    danger: "glass text-rose-400 border-rose-500/20 bg-rose-500/10",
    warning: "glass text-amber-400 border-amber-500/20 bg-amber-500/10",
    neutral: "glass-card text-white border-none",
    info: "glass text-sky-400 border-sky-500/20 bg-sky-500/10",
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-5 backdrop-blur-3xl",
        bgClasses[tone],
        className
      )}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}
