import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, FileText, Scale, Save, Eye, EyeOff, Clock, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton, StatusBadge, fmtDate } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export const Route = createFileRoute("/admin/policies")({
  head: () => ({ meta: [{ title: "Políticas & LGPD · TravelOS Admin" }] }),
  component: Page,
});

type PolicyDoc = {
  id?: string;
  kind: string;
  title: string;
  slug: string;
  content_md: string;
  version: string;
  is_published: boolean;
  effective_at: string | null;
};

const DEFAULT_DOCS: PolicyDoc[] = [
  {
    kind: "privacy",
    title: "Política de Privacidade",
    slug: "privacidade",
    version: "1.0.0",
    is_published: false as any,
    effective_at: null,
    content_md: `# Política de Privacidade\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\n## 1. Dados coletados\n\nColetamos os seguintes dados pessoais no uso da plataforma TravelOS:\n\n- Nome completo e e-mail ao criar conta\n- Dados de viagem e passageiros fornecidos pela agência\n- Dados de navegação e uso da plataforma (logs técnicos)\n\n## 2. Finalidade do tratamento\n\nOs dados são usados exclusivamente para:\n\n- Prestação dos serviços contratados\n- Comunicação de suporte e atualizações\n- Melhoria contínua da plataforma\n\n## 3. Compartilhamento\n\nNão vendemos nem compartilhamos dados com terceiros, exceto quando necessário para a operação do serviço (ex.: processadores de pagamento e servidores de hospedagem).\n\n## 4. Direitos do titular\n\nVocê pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pelo e-mail: dpo@travelos.com.br\n\n## 5. Retenção\n\nDados são retidos pelo período necessário para a prestação do serviço e obrigações legais.\n\n## 6. Contato DPO\n\nNome: Encarregado de Dados TravelOS  \nE-mail: dpo@travelos.com.br\n`,
  },
  {
    kind: "terms",
    title: "Termos de Uso",
    slug: "termos",
    version: "1.0.0",
    is_published: false as any,
    effective_at: null,
    content_md: `# Termos de Uso\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\n## 1. Aceitação\n\nAo usar o TravelOS, você concorda com estes Termos. Caso discorde, não utilize a plataforma.\n\n## 2. Serviço\n\nO TravelOS é uma plataforma SaaS para gestão de agências de viagens, fornecida mediante assinatura mensal ou anual.\n\n## 3. Obrigações do usuário\n\n- Usar a plataforma de acordo com as leis vigentes\n- Não compartilhar credenciais de acesso\n- Fornecer dados verídicos no cadastro\n- Zelar pelos dados de seus clientes e passageiros\n\n## 4. Propriedade intelectual\n\nTodo o código, marca e conteúdo do TravelOS pertencem à empresa desenvolvedora.\n\n## 5. Limitação de responsabilidade\n\nA plataforma é fornecida "como está". Não nos responsabilizamos por perdas indiretas decorrentes do uso.\n\n## 6. Rescisão\n\nPodemos suspender contas que violem estes termos sem aviso prévio.\n\n## 7. Foro\n\nFica eleito o foro da comarca de Chapecó/SC para dirimir controvérsias.\n`,
  },
  {
    kind: "dpa",
    title: "DPA — Acordo de Processamento de Dados",
    slug: "dpa",
    version: "1.0.0",
    is_published: false as any,
    effective_at: null,
    content_md: `# Data Processing Agreement (DPA)\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\nEste acordo regula o processamento de dados pessoais entre o TravelOS (Processador) e as agências cadastradas (Controladoras), em conformidade com a LGPD (Lei nº 13.709/2018).\n\n## 1. Definições\n\n- **Controlador:** A agência de viagens que coleta e determina o uso dos dados.\n- **Processador:** TravelOS, que processa dados em nome do Controlador.\n\n## 2. Obrigações do Processador\n\n- Processar dados apenas conforme instruções documentadas do Controlador\n- Implementar medidas técnicas e organizacionais adequadas de segurança\n- Notificar o Controlador em caso de incidente de segurança em até 48h\n\n## 3. Subprocessadores\n\nO TravelOS utiliza os seguintes subprocessadores aprovados:\n- Supabase (banco de dados e autenticação) — EUA / conformidade SOC 2\n- Netlify/Vercel (hospedagem) — EUA\n\n## 4. Transferência internacional\n\nDados podem ser processados em servidores fora do Brasil por subprocessadores com garantias adequadas (SCCs, adequação).\n\n## 5. Direitos dos titulares\n\nO Processador apoia o Controlador no atendimento a solicitações dos titulares de dados.\n\n## 6. Vigência\n\nEste DPA tem a mesma vigência do contrato de assinatura da plataforma.\n`,
  },
];

const META_MAP: Record<string, { title: string, slug: string }> = {
  privacy: { title: "Política de Privacidade", slug: "privacidade" },
  terms: { title: "Termos de Uso", slug: "termos" },
  dpa: { title: "DPA — Acordo de Processamento", slug: "dpa" },
  cookies: { title: "Política de Cookies", slug: "cookies" },
  lgpd: { title: "Termos LGPD", slug: "lgpd" },
};

function Page() {
  const qc = useQueryClient();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [activeKind, setActiveKind] = useState<string>("privacy");
  const [busy, setBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const q = useQuery({
    queryKey: ["admin-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Group by kind to get the latest version of each
      const latestMap = new Map<string, any>();
      for (const row of (data || [])) {
        if (!latestMap.has(row.kind)) {
          latestMap.set(row.kind, row);
        }
      }

      return DEFAULT_DOCS.map(def => {
        const dbDoc = latestMap.get(def.kind);
        if (dbDoc) {
          return {
            id: dbDoc.id,
            kind: dbDoc.kind,
            title: META_MAP[dbDoc.kind]?.title || def.title,
            slug: META_MAP[dbDoc.kind]?.slug || def.slug,
            version: dbDoc.version,
            content_md: dbDoc.content_md,
            is_published: dbDoc.is_published ?? false,
            effective_at: dbDoc.effective_at,
          };
        }
        return def;
      });
    },
  });

  useEffect(() => {
    if (q.data) {
      setDocs(q.data);
    }
  }, [q.data]);

  const activeDoc = docs.find((d) => d.kind === activeKind);

  function updateDoc<K extends keyof PolicyDoc>(k: K, v: PolicyDoc[K]) {
    setDocs((prev) =>
      prev.map((d) => d.kind === activeKind ? { ...d, [k]: v } : d)
    );
  }

  async function save() {
    if (!activeDoc) return;
    setBusy(true);
    
    // Check if we are updating an existing draft or creating a new record
    if (activeDoc.id) {
      // Update existing
      const { error } = await supabase.from("policy_documents").update({
        version: activeDoc.version,
        content_md: activeDoc.content_md,
      }).eq("id", activeDoc.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Rascunho salvo com sucesso");
        qc.invalidateQueries({ queryKey: ["admin-policies"] });
      }
    } else {
      // Insert new
      const { error } = await (supabase as any).from("policy_documents").insert({
        kind: activeDoc.kind,
        version: activeDoc.version,
        content_md: activeDoc.content_md,
        is_published: false as any,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Novo rascunho criado");
        qc.invalidateQueries({ queryKey: ["admin-policies"] });
      }
    }
    setBusy(false);
  }

  async function saveAsNewVersion() {
    if (!activeDoc) return;
    setBusy(true);
    const newVersion = prompt("Qual a nova versão?", activeDoc.version);
    if (!newVersion) { setBusy(false); return; }
    
    const { error } = await (supabase as any).from("policy_documents").insert({
      kind: activeDoc.kind,
      version: newVersion,
      content_md: activeDoc.content_md,
      is_published: false as any,
    });

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Nova versão criada");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    }
  }

  async function publish() {
    if (!activeDoc?.id) {
      toast.error("Salve o documento antes de publicar.");
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await (supabase as any).from("policy_documents").update({
      is_published: true as any,
      effective_at: now,
    }).eq("id", activeDoc.id);

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Documento publicado!");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    }
  }

  async function unpublish() {
    if (!activeDoc?.id) return;
    setBusy(true);
    const { error } = await (supabase as any).from("policy_documents").update({
      is_published: false as any,
    }).eq("id", activeDoc.id);

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Documento despublicado");
      qc.invalidateQueries({ queryKey: ["admin-policies"] });
    }
  }

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    privacy: Shield,
    terms: Scale,
    dpa: FileText,
  };

  return (
    <>
      <PageHeader
        title="Políticas & LGPD"
        description="Documentos jurídicos e de conformidade da plataforma. Edite e publique Política de Privacidade, Termos de Uso e DPA."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <nav className="space-y-1">
          {docs.map((doc) => {
            const Icon = icons[doc.kind] ?? FileText;
            return (
              <button
                key={doc.kind}
                onClick={() => setActiveKind(doc.kind)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  activeKind === doc.kind
                    ? "border-brand/30 bg-brand/5 text-brand font-semibold"
                    : "border-transparent hover:bg-surface-alt text-foreground"
                }`}
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
            <div className="text-[10px] text-muted-foreground px-3 font-semibold uppercase tracking-wide mb-2">Atenção LGPD</div>
            <div className="rounded-lg bg-warning-bg border border-warning/20 p-3 text-xs text-warning">
              Publique todos os documentos antes de ir a produção com usuários reais.
            </div>
          </div>
        </nav>

        {/* Editor */}
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
                  {activeDoc.effective_at ? fmtDate(activeDoc.effective_at) : "Sem publicação"}
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
                  {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {previewMode ? "Editar" : "Prévia"}
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
                
                <GhostButton type="button" onClick={saveAsNewVersion} disabled={busy} className="gap-1.5 text-xs">
                  <History className="h-3.5 w-3.5" /> Nova Versão
                </GhostButton>

                <PrimaryButton type="button" onClick={save} disabled={busy} className="gap-1.5 text-xs">
                  <Save className="h-3.5 w-3.5" />
                  {busy ? "Salvando…" : "Salvar"}
                </PrimaryButton>
              </div>
            </div>

            {previewMode ? (
              <div className="rounded-lg border border-border bg-surface p-6 prose prose-sm max-w-none prose-headings:font-bold prose-a:text-brand hover:prose-a:underline">
                <div
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: activeDoc.content_md }}
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

            {/* Public URL info */}
            <div className="rounded-lg border border-border bg-surface-alt/40 p-3 text-xs">
              <span className="font-semibold">URL pública quando publicado:</span>{" "}
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
