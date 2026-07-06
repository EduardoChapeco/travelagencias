import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";

export const SMALL_INPUT =
  "w-full h-8 px-3 rounded-2xl border border-border/50 bg-surface-alt/50 text-xs font-medium outline-none transition-all hover:bg-surface focus:bg-surface focus:border-border-strong focus:ring-2 focus:ring-brand/20";

export function replaceAt<T>(arr: T[], i: number, item: T): T[] {
  const c = arr.slice();
  c[i] = item;
  return c;
}

export function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-4 overflow-hidden rounded-[24px] bg-surface  ring-1 ring-border/50 transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-surface-alt/50 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="border-t border-border/50 p-4">{children}</div>}
    </div>
  );
}

export function NumField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        className={SMALL_INPUT}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(parseInt(v) || 0)}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        className={SMALL_INPUT}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(v)}
      />
    </label>
  );
}

export function Inp({
  value,
  onChange,
  ph,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  ph?: string;
  type?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      type={type}
      placeholder={ph}
      className={SMALL_INPUT}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onChange(v)}
    />
  );
}

export function Sel({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select className={SMALL_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Card({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative mb-3 rounded-[24px] border border-border/60 bg-surface-alt/20 p-4">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-surface hover:text-danger transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FileUploadList({
  agencyId,
  images,
  onChange,
}: {
  agencyId: string;
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const uidVal = crypto.randomUUID();
      const path = `${agencyId}/${uidVal}-${file.name}`;
      const { error } = await supabase.storage.from("proposal-attachments").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("proposal-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    onChange([...images, ...urls]);
    setUploading(false);
  }
  return (
    <div className="mt-2">
      <div className="mb-1 flex flex-wrap gap-1">
        {images.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} alt="" className="h-12 w-12 rounded object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, x) => x !== i))}
              className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground hover:bg-destructive/80 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="text-[11px] text-primary hover:underline cursor-pointer">
        {uploading ? "Enviando…" : "+ adicionar imagens"}
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </label>
    </div>
  );
}

export function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-2xl border border-border/60 bg-surface px-3 text-xs font-semibold hover:bg-surface-alt transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function TagsEditor({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded bg-surface-alt px-2 py-0.5 text-[11px]"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, x) => x !== i))}
              className="text-muted-foreground hover:text-danger"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className={SMALL_INPUT}
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            e.preventDefault();
            onChange([...tags, v.trim()]);
            setV("");
          }
        }}
      />
    </div>
  );
}
