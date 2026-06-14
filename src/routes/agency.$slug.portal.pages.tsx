import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  Globe,
  Copy,
  History,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  PhoneCall,
  ListPlus,
  Megaphone,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/ui/form";
import { PortalBlockSchema } from "@/lib/cms-schemas";
import { PortalPagePayloadSchema } from "@/lib/cms-schemas";

import { useConfirm } from "@/hooks/use-confirm";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  head: () => ({ meta: [{ title: "Páginas do portal · TravelOS" }] }),
  component: PagesPage,
});

// PortalBlock is now imported from @/lib/cms-types — do not redefine locally

type PageRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  template: string | null;
  blocks: any;
  seo: any;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function PagesPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["portal-pages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_pages")
        .select("id, slug, title, is_published, template, blocks, seo")
        .eq("agency_id", agency!.id)
        .order("created_at");
      if (error) throw error;
      return data as PageRow[];
    },
  });

  async function togglePublish(p: PageRow) {
    if (p.is_published) {
      // Despublicação: UPDATE direto (não precisa snapshottear versão)
      const { error } = await supabase
        .from("portal_pages")
        .update({ is_published: false })
        .eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Página despublicada");
    } else {
      // Publicação: usa a RPC que copia rascunho → published_blocks + salva versão
      const { error } = await (supabase as any).rpc("publish_portal_page", { p_page_id: p.id });
      if (error) return toast.error(error.message);
      toast.success("Página publicada com sucesso!");
    }
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  async function deletePage(p: PageRow) {
    confirm({
      title: "Excluir página",
      description: `Tem certeza que deseja excluir a página "${p.title}"? Esta ação não pode ser desfeita.`,
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await supabase.from("portal_pages").delete().eq("id", p.id);
        if (error) return toast.error(error.message);
        toast.success("Página excluída");
        qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      },
    });
  }

  async function handleDuplicate(p: PageRow) {
    const { error } = await (supabase as any).rpc("duplicate_portal_page", { p_page_id: p.id });
    if (error) return toast.error(error.message);
    toast.success("Página duplicada com sucesso");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  return (
    <>
      <ConfirmDialog />
      <PageHeader
        title="Páginas do portal"
        description="Construa páginas estáticas usando o editor de blocos dinâmicos."
        actions={
          <button
            onClick={() =>
              navigate({
                to: "/agency/$slug/portal/pages/$page_id",
                params: { slug: agency!.slug, page_id: "new" },
              })
            }
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nova página
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && (
        <EmptyState
          title="Sem páginas"
          description="Crie páginas institucionais para o seu portal."
        />
      )}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-surface-alt/30 transition-colors"
                >
                  <td
                    className="px-3 py-2.5 font-medium cursor-pointer hover:text-brand transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/agency/$slug/portal/pages/$page_id",
                        params: { slug: agency!.slug, page_id: p.id },
                      })
                    }
                  >
                    {p.title}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">/{p.slug}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                    {p.template ?? "padrão"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={p.is_published ? "success" : "neutral"}>
                      {p.is_published ? "publicada" : "rascunho"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right flex justify-end items-center gap-2">
                    {p.is_published && agency && (
                      <a
                        href={`${window.location.origin}/p/${agency.slug}/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-brand"
                        title="Ver no portal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => togglePublish(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      {p.is_published ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      onClick={() => handleDuplicate(p)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Duplicar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePage(p)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* O editor de página não existe mais neste arquivo. É acessado via rota In-Page. */}
    </>
  );
}
