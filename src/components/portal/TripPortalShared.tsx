import React from "react";

// ─── AppWidget ──────────────────────────────────────────────────────────────
export function AppWidget({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-surface p-6 border border-border">
      <div className="mb-5 flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-black text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── TabButton ───────────────────────────────────────────────────────────────
export function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors${
        active
          ? " border-foreground text-foreground"
          : " border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}
