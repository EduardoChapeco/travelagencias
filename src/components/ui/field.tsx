import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}

export function Field({ label, children, hint, error }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block ds-label-caps text-muted-foreground">{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-1 block ds-meta text-muted-foreground">{hint}</span>
      )}
      {error && <span className="mt-1 block ds-meta text-danger">{error}</span>}
    </label>
  );
}
