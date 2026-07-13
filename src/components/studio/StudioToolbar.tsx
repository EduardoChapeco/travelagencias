import React from "react";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FormInput as Input } from "@/components/ui/input";

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

import { HeaderPortal } from "@/components/shell/HeaderPortal";

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
    <HeaderPortal>
      <div className="flex w-full items-center justify-between px-2 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          to={backTo as any}
          params={backParams as any}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {subtitle && (
              <span className="ds-meta text-muted-foreground font-mono uppercase tracking-wider">
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
              <span className="flex items-center gap-1 ds-meta text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-brand" />
                <span>Salvando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 ds-meta text-emerald-600">
                <Check className="h-3 w-3" />
                <span>Salvo</span>
              </span>
            )}
          </div>
          {onTitleChange ? (
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={(e) => onTitleBlur?.(e.target.value)}
              placeholder="Sem título"
              className="font-bold border-b hover:border-border/50 focus:border-brand w-full max-w-md py-0.5"
            />
          ) : (
            <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
      </div>
    </HeaderPortal>
  );
}
