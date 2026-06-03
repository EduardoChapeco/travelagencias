import { useCallback, useId, useRef, useState } from "react";
import { Upload, X, FileText, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Variant = "image" | "pdf" | "video" | "any";

const LIMITS_MB: Record<Variant, number> = { image: 5, pdf: 10, video: 50, any: 20 };
const ACCEPT: Record<Variant, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  pdf: "application/pdf",
  video: "video/mp4,video/webm,video/quicktime",
  any: "image/*,application/pdf",
};

export type FileUploaderProps = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  bucket: string;
  folder: string; // ex.: `${agency.id}/logos`
  variant?: Variant;
  label?: string;
  allowExternalUrl?: boolean;
  publicBucket?: boolean; // true → getPublicUrl, false → createSignedUrl 1 ano
  className?: string;
};

export function FileUploader({
  value,
  onChange,
  bucket,
  folder,
  variant = "image",
  label,
  allowExternalUrl = true,
  publicBucket = true,
  className = "",
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const maxMb = LIMITS_MB[variant];
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`Arquivo excede ${maxMb}MB`);
        return;
      }
      setBusy(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${folder.replace(/\/$/, "")}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (up.error) throw up.error;
        let url: string | null = null;
        if (publicBucket) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          url = data.publicUrl;
        } else {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
          if (error) throw error;
          url = data.signedUrl;
        }
        onChange(url);
        toast.success("Arquivo enviado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha no upload");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, folder, onChange, publicBucket, variant],
  );

  return (
    <div className={className}>
      {label && <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>}
      {value ? (
        <div className="relative flex items-center gap-3 rounded-md border border-border bg-surface p-2">
          {variant === "image" ? (
            <img src={value} alt="" className="h-16 w-16 rounded object-cover" />
          ) : variant === "video" ? (
            <video src={value} className="h-16 w-24 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="flex-1 truncate text-xs text-muted-foreground">{value}</div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md border border-border p-1 hover:bg-surface-alt"
            aria-label="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-xs transition-colors ${
            dragOver ? "border-foreground bg-surface-alt" : "border-border bg-surface"
          }`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="text-muted-foreground">Arraste um arquivo ou</div>
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-alt"
          >
            Selecionar arquivo
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT[variant]}
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          {allowExternalUrl && (
            <div className="mt-1 flex w-full max-w-xs items-center gap-1">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              <input
                type="url"
                placeholder="ou cole uma URL"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => {
                  if (urlDraft.trim()) {
                    onChange(urlDraft.trim());
                    setUrlDraft("");
                  }
                }}
                className="h-7 w-full rounded border border-border bg-surface px-2 text-[11px] outline-none"
              />
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">Máx {LIMITS_MB[variant]}MB</div>
        </div>
      )}
    </div>
  );
}
