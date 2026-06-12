import React from "react";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface StudioToolbarProps {
  title: string;
  subtitle?: string;
  onTitleChange?: (v: string) => void;
  onTitleBlur?: (v: string) => void;
  backTo: string;
  backParams?: Record<string, string>;
  saving?: boolean;
  status?: string;
  statusBg?: string;
  statusColor?: string;
  children?: React.ReactNode;
}

export function StudioToolbar({
  title,
  subtitle,
  onTitleChange,
  onTitleBlur,
  backTo,
  backParams = {},
  saving = false,
  status,
  statusBg = "bg-brand/10",
  statusColor = "text-brand",
  children,
}: StudioToolbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface dark:bg-zinc-950 px-6 shrink-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Link
          to={backTo as any}
          params={backParams as any}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {subtitle && (
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {subtitle}
              </span>
            )}
            {status && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusBg} ${statusColor}`}
              >
                {status}
              </span>
            )}
            {saving ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-brand" />
                <span>Salvando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <Check className="h-3 w-3" />
                <span>Salvo</span>
              </span>
            )}
          </div>
          {onTitleChange ? (
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={(e) => onTitleBlur?.(e.target.value)}
              placeholder="Sem título"
              className="bg-transparent text-sm font-bold text-foreground outline-none border-b border-transparent hover:border-border/50 focus:border-brand w-full max-w-md transition-all py-0.5"
            />
          ) : (
            <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </header>
  );
}
