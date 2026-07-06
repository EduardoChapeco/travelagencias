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
    success: "bg-success-bg",
    danger: "bg-danger-bg",
    warning: "bg-warning-bg",
    neutral: "bg-surface",
    info: "bg-info-bg",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 p-5",
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
