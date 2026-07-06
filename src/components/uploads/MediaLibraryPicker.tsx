import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Image as ImageIcon, Check, Loader2, X } from "lucide-react";
import { useAgency } from "@/lib/agency-context";

export function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ["media-library", agency?.id],
    enabled: open && !!agency?.id,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("agency-media").list(`${agency!.id}/`, {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return data.filter((f) => f.name !== ".emptyFolderPlaceholder");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${agency!.id}/${filename}`;

      const { error } = await supabase.storage.from("agency-media").upload(path, file);
      if (error) throw error;

      return supabase.storage.from("agency-media").getPublicUrl(path).data.publicUrl;
    },
    onSuccess: (url) => {
      qc.invalidateQueries({ queryKey: ["media-library", agency?.id] });
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-background/80 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-border bg-surface animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand" /> Media Library Central
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 hover:bg-surface-alt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-surface-alt/20">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border hover:border-brand/50 hover:bg-surface-alt transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]);
                  }}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-xs font-medium text-muted-foreground">Upload File</span>
                  </>
                )}
              </label>

              {files?.map((f) => {
                const url = supabase.storage
                  .from("agency-media")
                  .getPublicUrl(`${agency!.id}/${f.name}`).data.publicUrl;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      onSelect(url);
                      onOpenChange(false);
                    }}
                    className="group relative aspect-square overflow-hidden rounded-[24px] border border-border bg-surface cursor-pointer hover:ring-2 ring-brand transition-all"
                  >
                    <img src={url} alt={f.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-brand text-brand-foreground rounded-full p-2 ">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
