import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  head: () => ({ meta: [{ title: "Páginas do portal · TravelOS" }] }),
  component: PagesPage,
});

type Page = { id: string; slug: string; title: string; is_published: boolean; template: string | null };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function PagesPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["portal-pages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_pages").select("id, slug, title, is_published, template").eq("agency_id", agency!.id).order("created_at");
      if (error) throw error;
      return data as Page[];
    },
  });

  async function togglePublish(p: Page) {
    const { error } = await supabase.from("portal_pages").update({ is_published: !p.is_published }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  return (
    <>
      <PageHeader
        title="Páginas do portal"
        description="Páginas estáticas (sobre, contato, política) publicadas no domínio público."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nova página
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem páginas" description="Crie páginas institucionais para o portal." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Título</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Template</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Ação</th></tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{p.title}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">/{p.slug}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.template ?? "default"}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={p.is_published ? "success" : "neutral"}>{p.is_published ? "publicada" : "rascunho"}</StatusBadge></td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => togglePublish(p)} className="text-xs text-primary hover:underline">{p.is_published ? "Despublicar" : "Publicar"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && <NewPage agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["portal-pages", agency.id] }); }} />}
    </>
  );
}

function NewPage({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("default");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const blocks = content ? [{ type: "text", content }] : [];
    const { error } = await supabase.from("portal_pages").insert({
      agency_id: agencyId, title, slug: slugify(title), template, blocks: blocks as never,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Página criada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova página">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Template">
          <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="default">Padrão</option>
            <option value="about">Sobre</option>
            <option value="contact">Contato</option>
            <option value="legal">Jurídico / Política</option>
          </Select>
        </Field>
        <Field label="Conteúdo"><Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar página"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
