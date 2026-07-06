import React, {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block ds-label-caps text-muted-foreground">{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>
      )}
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  );
}

const baseInput =
  "w-full h-[42px] px-3 rounded-full border border-border bg-surface text-sm outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-60 text-foreground placeholder:text-muted-foreground/60";

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    return <input ref={ref} {...props} className={`${baseInput} ${props.className ?? ""}`} />;
  },
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => {
    return <select ref={ref} {...props} className={`${baseInput} ${props.className ?? ""}`} />;
  },
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`w-full min-h-[85px] p-3 rounded-full border border-border bg-surface text-sm outline-none transition-colors focus:border-border-strong text-foreground placeholder:text-muted-foreground/60 ${props.className ?? ""}`}
    />
  );
});
Textarea.displayName = "Textarea";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap h-[39px] rounded-full bg-primary px-[14px] text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap h-[39px] rounded-full border border-border-strong px-[14px] text-xs font-bold uppercase tracking-wider text-foreground bg-surface transition-all hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function Sheet({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-md md:max-w-lg overflow-y-auto border-l border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 ds-h3 text-foreground border-b border-border pb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  className = "",
  ...props
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-alt text-muted-foreground border border-border/40",
    success: "bg-success-bg text-success border border-success/30",
    warning: "bg-warning-bg text-warning border border-warning/30",
    danger: "bg-danger-bg text-danger border border-danger/30",
    info: "bg-info-bg text-info border border-info/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export const money = (n: number, currency?: string | null) => {
  const code = currency && currency.trim() ? currency.trim().toUpperCase() : "BRL";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: code }).format(n || 0);
  } catch (e) {
    console.error("Format error with currency:", currency, e);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
  }
};

export const fmtDate = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
