import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, FileText, Scale, Save, Eye, EyeOff, Clock, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, Textarea, PrimaryButton, GhostButton, StatusBadge, fmtDate } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export const Route = createFileRoute("/admin/policies")({
  head: () => ({ meta: [{ title: "Políticas & LGPD · TravelOS Admin" }] }),
  component: Page,
});

type PolicyDoc = {
  id: string;
  title: string;
  slug: string;
  content: string;
  version: string;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
};

const POLICY_PROVIDER = "__platform_policies__";

const DEFAULT_DOCS: Omit<PolicyDoc, "updated_at">[] = [
  {
    id: "privacy",
    title: "Política de Privacidade",
    slug: "privacidade",
    version: "1.0.0",
    is_published: false,
    published_at: null,
    content: `# Política de Privacidade

**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}

## 1. Dados coletados

Coletamos os seguintes dados pessoais no uso da plataforma TravelOS:

- Nome completo e e-mail ao criar conta
- Dados de viagem e passageiros fornecidos pela agência
- Dados de navegação e uso da plataforma (logs técnicos)

## 2. Finalidade do tratamento

Os dados são usados exclusivamente para:

- Prestação dos serviços contratados
- Comunicação de suporte e atualizações
- Melhoria contínua da plataforma

## 3. Compartilhamento

Não vendemos nem compartilhamos dados com terceiros, exceto quando necessário para a operação do serviço (ex.: processadores de pagamento e servidores de hospedagem).

## 4. Direitos do titular

Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pelo e-mail: dpo@travelos.com.br

## 5. Retenção

Dados são retidos pelo período necessário para a prestação do serviço e obrigações legais.

## 6. Contato DPO

Nome: Encarregado de Dados TravelOS  
E-mail: dpo@travelos.com.br
`,
  },
  {
    id: "terms",
    title: "Termos de Uso",
    slug: "termos",
    version: "1.0.0",
    is_published: false,
    published_at: null,
    content: `# Termos de Uso

**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}

## 1. Aceitação

Ao usar o TravelOS, você concorda com estes Termos. Caso discorde, não utilize a plataforma.

## 2. Serviço

O TravelOS é uma plataforma SaaS para gestão de agências de viagens, fornecida mediante assinatura mensal ou anual.

## 3. Obrigações do usuário

- Usar a plataforma de acordo com as leis vigentes
- Não compartilhar credenciais de acesso
- Fornecer dados verídicos no cadastro
- Zelar pelos dados de seus clientes e passageiros

## 4. Propriedade intelectual

Todo o código, marca e conteúdo do TravelOS pertencem à empresa desenvolvedora.

## 5. Limitação de responsabilidade

A plataforma é fornecida "como está". Não nos responsabilizamos por perdas indiretas decorrentes do uso.

## 6. Rescisão

Podemos suspender contas que violem estes termos sem aviso prévio.

## 7. Foro

Fica eleito o foro da comarca de Chapecó/SC para dirimir controvérsias.
`,
  },
  {
    id: "dpa",
    title: "DPA — Acordo de Processamento de Dados",
    slug: "dpa",
    version: "1.0.0",
    is_published: false,
    published_at: null,
    content: `# Data Processing Agreement (DPA)

**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}

Este acordo regula o processamento de dados pessoais entre o TravelOS (Processador) e as agências cadastradas (Controladoras), em conformidade com a LGPD (Lei nº 13.709/2018).

## 1. Definições

- **Controlador:** A agência de viagens que coleta e determina o uso dos dados.
- **Processador:** TravelOS, que processa dados em nome do Controlador.

## 2. Obrigações do Processador

- Processar dados apenas conforme instruções documentadas do Controlador
- Implementar medidas técnicas e organizacionais adequadas de segurança
- Notificar o Controlador em caso de incidente de segurança em até 48h

## 3. Subprocessadores

O TravelOS utiliza os seguintes subprocessadores aprovados:
- Supabase (banco de dados e autenticação) — EUA / conformidade SOC 2
- Netlify/Vercel (hospedagem) — EUA

## 4. Transferência internacional

Dados podem ser processados em servidores fora do Brasil por subprocessadores com garantias adequadas (SCCs, adequação).

## 5. Direitos dos titulares

O Processador apoia o Controlador no atendimento a solicitações dos titulares de dados.

## 6. Vigência

Este DPA tem a mesma vigência do contrato de assinatura da plataforma.
`,
  },
];

function Page() {
  const qc = useQueryClient();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [activeId, setActiveId] = useState<string>("privacy");
  const [busy, setBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const q = useQuery({
    queryKey: ["admin-policies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("key_value")
        .eq("provider", POLICY_PROVIDER)
        .maybeSingle();
      if (data?.key_value) {
        try { return JSON.parse(data.key_value) as PolicyDoc[]; } catch { return null; }
      }
      return null;
    },
  });

  useEffect(() => {
    if (q.data) {
      setDocs(q.data);
    } else if (!q.isLoading) {
      // Initialize with defaults
      setDocs(DEFAULT_DOCS.map((d) => ({ ...d, updated_at: new Date().toISOString() })));
    }
  }, [q.data, q.isLoading]);

  const activeDoc = docs.find((d) => d.id === activeId);

  function updateDoc<K extends keyof PolicyDoc>(k: K, v: PolicyDoc[K]) {
    setDocs((prev) =>
      prev.map((d) => d.id === activeId ? { ...d, [k]: v, updated_at: new Date().toISOString() } : d)
    );
  }

  async function save() {
    setBusy(true);
    const val = JSON.stringify(docs);
    const existing = q.data !== null && q.data !== undefined;
    const { error } = existing
      ? await supabase.from("api_keys").update({ key_value: val }).eq("provider", POLICY_PROVIDER)
      : await supabase.from("api_keys").insert({
          provider: POLICY_PROVIDER, label: "Platform Policies", key_value: val, agency_id: null,
        });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Políticas salvas");
    qc.invalidateQueries({ queryKey: ["admin-policies"] });
  }

  async function publish(id: string) {
    const now = new Date().toISOString();
    setDocs((prev) =>
      prev.map((d) => d.id === id ? { ...d, is_published: true, published_at: now, updated_at: now } : d)
    );
    // auto-save
    const next = docs.map((d) =>
      d.id === id ? { ...d, is_published: true, published_at: now, updated_at: now } : d
    );
    const val = JSON.stringify(next);
    const existing = q.data !== null && q.data !== undefined;
    await (existing
      ? supabase.from("api_keys").update({ key_value: val }).eq("provider", POLICY_PROVIDER)
      : supabase.from("api_keys").insert({ provider: POLICY_PROVIDER, label: "Platform Policies", key_value: val, agency_id: null }));
    toast.success("Documento publicado");
    qc.invalidateQueries({ queryKey: ["admin-policies"] });
  }

  async function unpublish(id: string) {
    setDocs((prev) =>
      prev.map((d) => d.id === id ? { ...d, is_published: false, updated_at: new Date().toISOString() } : d)
    );
    toast("Documento despublicado");
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
            const Icon = icons[doc.id] ?? FileText;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveId(doc.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  activeId === doc.id
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
                  {activeDoc.updated_at ? fmtDate(activeDoc.updated_at) : "—"}
                </div>
                {activeDoc.is_published && activeDoc.published_at && (
                  <div className="text-xs text-success flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Publicado em {fmtDate(activeDoc.published_at)}
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
                  <GhostButton type="button" onClick={() => unpublish(activeDoc.id)} className="text-xs">
                    Despublicar
                  </GhostButton>
                ) : (
                  <GhostButton type="button" onClick={() => publish(activeDoc.id)} className="text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Publicar
                  </GhostButton>
                )}
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
                  dangerouslySetInnerHTML={{ __html: activeDoc.content }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-surface-alt/40">
                  <span className="text-xs font-semibold">{activeDoc.title}</span>
                </div>
                <RichTextEditor
                  value={activeDoc.content}
                  onChange={(v) => updateDoc("content", v)}
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
