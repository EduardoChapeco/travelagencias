import { useCallback, useId, useRef, useState } from "react";
import { Upload, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";

type Props = {
  values: string[];
  onChange: (urls: string[]) => void;
  bucket: string;
  folder: string;
  max?: number;
  label?: string;
  publicBucket?: boolean;
  className?: string;
};

export function MultiFileUploader({
  values,
  onChange,
  bucket,
  folder,
  max = 10,
  label,
  publicBucket = true,
  className = "",
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const slots = Math.max(0, max - values.length);
      const list = Array.from(files).slice(0, slots);
      if (list.length === 0) {
        toast.error(`Máximo de ${max} arquivos`);
        return;
      }
      setBusy(true);
      const next: string[] = [];
      try {
        for (const file of list) {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`"${file.name}" excede 5MB`);
            continue;
          }
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
          const path = `${folder.replace(/\/$/, "")}/${crypto.randomUUID()}.${ext}`;
          const up = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: file.type || undefined,
          });
          if (up.error) {
            toast.error(up.error.message);
            continue;
          }
          if (publicBucket) {
            next.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
          } else {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 60 * 60 * 24 * 365);
            if (!error && data?.signedUrl) next.push(data.signedUrl);
          }
        }
        if (next.length) onChange([...values, ...next]);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, folder, max, onChange, publicBucket, values],
  );

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const copy = [...values];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    onChange(copy);
  }

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-[11px] text-muted-foreground">
            {values.length}/{max}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {values.map((url, i) => (
          <div
            key={`${url}-${i}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
            }}
            className="group relative aspect-square overflow-hidden rounded-full border border-border bg-surface"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <Button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 group-hover:opacity-100"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {values.length < max && (
          <>
            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-border text-muted-foreground hover:bg-surface-alt"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              <span className="text-[10px]">Adicionar</span>
            </label>
            <Input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>
    </div>
  );
}
