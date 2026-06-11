import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, FileText, Scale, Save, Eye, EyeOff, Clock, History } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  PrimaryButton,
  GhostButton,
  StatusBadge,
  fmtDate,
} from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import DOMPurify from "isomorphic-dompurify";
import {
  fetchPolicies,
  savePolicyDraft,
  savePolicyNewVersion,
  publishPolicy,
  unpublishPolicy,
  type PolicyDoc,
} from "@/services/policies";

export const Route = createFileRoute("/admin/policies")({
  head: () => ({ meta: [{ title: "Politicas LGPD - TravelOS Admin" }] }),
  component: Page,
});

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  privacy: Shield,
  terms: Scale,
  dpa: FileText,
};

function Page() {
  const qc = useQueryClient();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [activeKind, setActiveKind] = useState<string>("privacy");
  const [busy, setBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const q = useQuery({ queryKey: ["admin-policies"], queryFn: fetchPolicies });

  useEffect(() => {
    if (q.data) setDocs(q.data);
  }, [q.data]);

  const activeDoc = docs.find((d) => d.kind === activeKind);

  function updateDoc<K extends keyof PolicyDoc>(k: K, v: PolicyDoc[K]) {
    setDocs((prev) => prev.map((d) => (d.kind === activeKind ? { ...d, [k]: v } : d)));
  }

  async function save() {
    if (!activeDoc) return;
    setBusy(true);
    try {
      await savePolicyDraft(activeDoc);
      toast.success(activeDoc.id ? "Rascunho salvo" : "Novo rascunho criado");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAsNewVersion() {
    if (!activeDoc) return;
    const newVer = prompt("Nova versao?", activeDoc.version);
    if (!newVer) return;
    setBusy(true);
    try {
      await savePolicyNewVersion(activeDoc, newVer);
      toast.success("Nova versao criada");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!activeDoc?.id) {
      toast.error("Salve antes de publicar.");
      return;
    }
    setBusy(true);
    try {
      await publishPolicy(activeDoc.id);
      toast.success("Documento publicado!");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!activeDoc?.id) return;
    setBusy(true);
    try {
      await unpublishPolicy(activeDoc.id);
      toast.success("Documento despublicado");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Politicas LGPD"
        description="Documentos juridicos e de conformidade da plataforma. Edite e publique Politica de Privacidade, Termos de Uso e DPA."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {docs.map((doc) => {
            const Icon = icons[doc.kind] ?? FileText;
            return (
              <button
                key={doc.kind}
                onClick={() => setActiveKind(doc.kind)}
                className={
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors " +
                  (activeKind === doc.kind
                    ? "border-brand/30 bg-brand/5 text-brand font-semibold"
                    : "border-transparent hover:bg-surface-alt text-foreground")
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{doc.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge tone={doc.is_published ? "success" : "neutral"}>
                      {doc.is_published ? "publicado" : "rascunho"}
                    </StatusBadge>
                    <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="border-t border-border pt-3 mt-3">
            <div className="text-[10px] text-muted-foreground px-3 font-semibold uppercase tracking-wide mb-2">
              Atencao LGPD
            </div>
            <div className="rounded-lg bg-warning-bg border border-warning/20 p-3 text-xs text-warning">
              Publique todos os documentos antes de producao com usuarios reais.
            </div>
          </div>
        </nav>

        {activeDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Field label="">
                  <Input
                    value={activeDoc.version}
                    onChange={(e) => updateDoc("version", e.target.value)}
                    className="w-24 font-mono text-xs"
                    placeholder="1.0.0"
                  />
                </Field>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {activeDoc.effective_at ? fmtDate(activeDoc.effective_at) : "Sem publicacao"}
                </div>
                {activeDoc.is_published && activeDoc.effective_at && (
                  <div className="text-xs text-success flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Publicado em {fmtDate(activeDoc.effective_at)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-surface-alt"
                >
                  {previewMode ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {previewMode ? "Editar" : "Previa"}
                </button>
                {activeDoc.is_published ? (
                  <GhostButton type="button" onClick={unpublish} className="text-xs">
                    Despublicar
                  </GhostButton>
                ) : (
                  <GhostButton type="button" onClick={publish} className="text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Publicar
                  </GhostButton>
                )}
                <GhostButton
                  type="button"
                  onClick={saveAsNewVersion}
                  disabled={busy}
                  className="gap-1.5 text-xs"
                >
                  <History className="h-3.5 w-3.5" /> Nova Versao
                </GhostButton>
                <PrimaryButton
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {busy ? "Salvando..." : "Salvar"}
                </PrimaryButton>
              </div>
            </div>

            {previewMode ? (
              <div className="rounded-lg border border-border bg-surface p-6 prose prose-sm max-w-none prose-headings:font-bold prose-a:text-brand hover:prose-a:underline">
                <div
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeDoc.content_md) }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-surface-alt/40">
                  <span className="text-xs font-semibold">{activeDoc.title}</span>
                </div>
                <RichTextEditor
                  value={activeDoc.content_md}
                  onChange={(v) => updateDoc("content_md", v)}
                />
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface-alt/40 p-3 text-xs">
              <span className="font-semibold">URL publica quando publicado: </span>
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-muted-foreground">
                {window.location.origin}/{activeDoc.slug}
              </code>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
