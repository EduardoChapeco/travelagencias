import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import {
  KeyRound,
  Plus,
  Trash2,
  MessageCircle,
  Zap,
  BarChart3,
  Wifi,
  WifiOff,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { fetchApiKeys, saveApiKey, toggleApiKey, deleteApiKey } from "@/services/settings";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/agency/$slug/integrations")({
  head: () => ({ meta: [{ title: "Integrações · TravelOS" }] }),
  component: IntegrationsPage,
});

const AI_PROVIDERS: Array<{ key: string; label: string; hint?: string; icon?: string }> = [
  {
    key: "gemini",
    label: "Gemini API Key",
    hint: "Para IA e OCR — opcional se quiser usar a chave global",
    icon: "G",
  },
  {
    key: "anthropic",
    label: "Anthropic API Key",
    hint: "Claude Sonnet — análise de contratos, IA avançada",
    icon: "A",
  },
  { key: "openai", label: "OpenAI API Key", hint: "GPT-4 — opcional", icon: "O" },
];

const COMM_PROVIDERS: Array<{ key: string; label: string; hint?: string }> = [
  { key: "resend", label: "Resend API Key", hint: "Envio de e-mails transacionais" },
  { key: "whatsapp_phone_id", label: "WhatsApp Phone Number ID" },
  { key: "whatsapp_token", label: "WhatsApp Access Token" },
  { key: "google_business", label: "Google Business Client ID" },
  {
    key: "google_calendar_client_id",
    label: "Google Calendar Client ID",
    hint: "ID do cliente OAuth 2.0",
  },
  { key: "google_calendar_client_secret", label: "Google Calendar Client Secret" },
  { key: "google_calendar_refresh_token", label: "Google Calendar Refresh Token" },
];

function mask(v: string | null | undefined) {
  if (!v) return "—";
  if (v.length <= 12) return "***";
  return v.slice(0, 8) + "•".repeat(Math.min(20, v.length - 8));
}

function IntegrationsPage() {
  const { agency } = useAgency();
  if (!agency) return null;

  return (
    <>
      <Tabs defaultValue="ai" className="max-w-4xl">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto no-scrollbar flex-nowrap flex mb-6">
          <TabsTrigger
            value="ai"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="h-3.5 w-3.5" /> IA
          </TabsTrigger>
          <TabsTrigger
            value="comms"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Comunicação
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="apikeys"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" /> Chaves de Acesso
          </TabsTrigger>
          <TabsTrigger
            value="infotravel"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Wifi className="h-3.5 w-3.5" /> Infotravel GDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <ProviderKeysSection
            agencyId={agency.id}
            providers={AI_PROVIDERS}
            title="Chaves de Inteligência Artificial"
            description="Quando ausentes, o sistema usa as chaves globais do administrador da plataforma."
          />
          <AiAgentSettingsSection agencyId={agency.id} />
        </TabsContent>

        <TabsContent value="comms">
          <ProviderKeysSection
            agencyId={agency.id}
            providers={COMM_PROVIDERS}
            title="Comunicação & Calendário"
            description="Configure e-mail, WhatsApp básico e Google Calendar para esta agência."
          />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab agencyId={agency.id} />
        </TabsContent>

        <TabsContent value="apikeys">
          <ApiKeysTab agencyId={agency.id} />
        </TabsContent>

        <TabsContent value="infotravel">
          <InfotravelTab agencyId={agency.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ──────────────────────────────────────────────── */
/* Provider Keys Section (AI / Comms)              */
/* ──────────────────────────────────────────────── */
function ProviderKeysSection({
  agencyId,
  providers,
  title,
  description,
}: {
  agencyId: string;
  providers: Array<{ key: string; label: string; hint?: string; icon?: string }>;
  title: string;
  description: string;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["agency-api-keys", agencyId],
    queryFn: () => fetchApiKeys(agencyId),
  });

  async function upsert(provider: string, value: string) {
    if (!value.trim()) return;
    try {
      await saveApiKey(agencyId, {
        provider,
        label: providers.find((p) => p.key === provider)?.label ?? provider,
        key_value: value.trim(),
        is_active: true,
      });
      toast.success("Chave salva com sucesso");
      qc.invalidateQueries({ queryKey: ["agency-api-keys", agencyId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border/60 bg-surface-alt/30 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="inline h-3.5 w-3.5 mr-1.5 text-brand" />
        {description}
      </div>

      <h3 className="text-sm font-semibold text-foreground">{title}</h3>

      <div className="space-y-2">
        {providers.map((p) => {
          const existing = q.data?.find((k) => k.provider === p.key);
          return (
            <IntegrationRow
              key={p.key}
              provider={p}
              existing={existing}
              onSubmit={(v) => upsert(p.key, v)}
            />
          );
        })}
      </div>
    </div>
  );
}

function IntegrationRow({
  provider,
  existing,
  onSubmit,
}: {
  provider: { key: string; label: string; hint?: string; icon?: string };
  existing?: { key_value: string } | undefined;
  onSubmit: (v: string) => Promise<void>;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-end gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      {provider.icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-alt border border-border font-bold text-sm text-muted-foreground">
          {provider.icon}
        </div>
      )}
      <div className="flex-1">
        <Field label={provider.label} hint={provider.hint}>
          <Input
            type="password"
            placeholder={existing ? mask(existing.key_value) : "Cole a chave aqui…"}
            value={v}
            onChange={(e) => setV(e.target.value)}
            autoComplete="off"
          />
        </Field>
      </div>
      <div className="flex items-center gap-2 pb-0.5">
        {existing && <StatusBadge tone="success">ativa</StatusBadge>}
        <PrimaryButton
          type="button"
          disabled={busy || !v.trim()}
          onClick={async () => {
            setBusy(true);
            await onSubmit(v);
            setV("");
            setBusy(false);
          }}
        >
          {existing ? "Atualizar" : "Salvar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/* WhatsApp Tab                                    */
/* ──────────────────────────────────────────────── */
function WhatsAppTab({ agencyId }: { agencyId: string }) {
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({
    meta_pixel_id: "",
    meta_capi_token: "",
    meta_verify_token: "",
    whatsapp_phone_id: "",
    whatsapp_access_token: "",
    evolution_api_url: "",
    evolution_api_key: "",
    preferred_provider: "meta_official" as "meta_official" | "evolution_api",
  });

  const { data: agencyData, isLoading } = useQuery({
    queryKey: ["agency-integrations", agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agencies")
        .select("integrations_config")
        .eq("id", agencyId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const keysQuery = useQuery({
    queryKey: ["agency-api-keys", agencyId],
    queryFn: () => fetchApiKeys(agencyId),
  });

  useEffect(() => {
    if ((agencyData as any)?.integrations_config) {
      setConfig((c) => ({ ...c, ...(agencyData as any).integrations_config }));
    }
    if (keysQuery.data) {
      const getVal = (provider: string) =>
        keysQuery.data?.find((k) => k.provider === provider)?.key_value || "";
      setConfig((c) => ({
        ...c,
        meta_capi_token: getVal("meta_capi_token"),
        meta_verify_token: getVal("meta_verify_token"),
        whatsapp_phone_id: getVal("whatsapp_phone_id"),
        whatsapp_access_token: getVal("whatsapp_access_token"),
        evolution_api_key: getVal("evolution_api_key"),
      }));
    }
  }, [agencyData, keysQuery.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const existingConfig = (agencyData as any)?.integrations_config || {};
      const nonSecrets = {
        ...existingConfig,
        meta_pixel_id: config.meta_pixel_id,
        evolution_api_url: config.evolution_api_url,
        preferred_provider: config.preferred_provider,
      };
      const { error } = await (supabase as any)
        .from("agencies")
        .update({ integrations_config: nonSecrets })
        .eq("id", agencyId);
      if (error) throw error;

      const secrets = [
        { provider: "meta_capi_token", val: config.meta_capi_token, label: "Meta CAPI Token" },
        {
          provider: "meta_verify_token",
          val: config.meta_verify_token,
          label: "Meta Verify Token",
        },
        {
          provider: "whatsapp_phone_id",
          val: config.whatsapp_phone_id,
          label: "WhatsApp Phone ID",
        },
        {
          provider: "whatsapp_access_token",
          val: config.whatsapp_access_token,
          label: "WhatsApp Access Token",
        },
        {
          provider: "evolution_api_key",
          val: config.evolution_api_key,
          label: "Evolution API Key",
        },
      ];
      for (const secret of secrets) {
        if (secret.val.trim() !== "") {
          await saveApiKey(agencyId, {
            provider: secret.provider,
            label: secret.label,
            key_value: secret.val.trim(),
            is_active: true,
          });
        }
      }
      toast.success("Configurações de WhatsApp salvas!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  const webhookUrl = `${window.location.origin.replace("5173", "54321")}/functions/v1/whatsapp-webhook`;

  if (isLoading)
    return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  return (
    <form onSubmit={save} className="mt-5 space-y-6">
      {/* Provider Selection */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <MessageCircle className="h-5 w-5 text-brand" />
          Provedor de WhatsApp
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "meta_official",
              title: "API Oficial Meta",
              desc: "Estável, sem servidor extra. 1.000 conversas/mês grátis.",
              icon: <Wifi className="h-5 w-5 text-green-500" />,
            },
            {
              value: "evolution_api",
              title: "Evolution API (VPS)",
              desc: "Custo zero por mensagem. Requer VPS própria (~$5/mês).",
              icon: <WifiOff className="h-5 w-5 text-yellow-500" />,
            },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.preferred_provider === opt.value
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="provider"
                value={opt.value}
                checked={config.preferred_provider === opt.value}
                onChange={() => setConfig({ ...config, preferred_provider: opt.value as any })}
              />
              <div className="flex items-center gap-2">
                {opt.icon}
                <span className="font-semibold text-sm">{opt.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-dashed border-border/80 bg-surface/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Zap className="h-4 w-4" /> URL do Webhook
        </div>
        <p className="text-xs text-muted-foreground">
          Configure este endereço no painel Meta ou Evolution API.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-surface-alt border border-border rounded px-3 py-2 font-mono truncate">
            {`[SUPABASE_URL]/functions/v1/whatsapp-webhook`}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              toast.success("URL copiada!");
            }}
            className="shrink-0 px-3 py-2 text-xs border border-border rounded-lg hover:bg-surface-alt transition-colors"
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Meta Official */}
      {config.preferred_provider === "meta_official" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand" /> API Oficial Meta
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp Phone Number ID">
              <Input
                type="password"
                placeholder="ID do número no painel Meta…"
                value={config.whatsapp_phone_id}
                onChange={(e) => setConfig({ ...config, whatsapp_phone_id: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp Access Token" hint="Token permanente do Meta Business Manager">
              <Input
                type="password"
                placeholder="EAAxxxxx…"
                value={config.whatsapp_access_token}
                onChange={(e) => setConfig({ ...config, whatsapp_access_token: e.target.value })}
              />
            </Field>
            <Field label="Verify Token (Webhook)" hint="Palavra-secreta configurada no painel Meta">
              <Input
                placeholder="ex: travelOS-secret-2024"
                value={config.meta_verify_token}
                onChange={(e) => setConfig({ ...config, meta_verify_token: e.target.value })}
              />
            </Field>
          </div>
          <div className="border-t border-border/50 pt-4">
            <div className="text-xs font-semibold text-muted-foreground mb-3">
              Rastreamento de Anúncios (CAPI)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Meta Pixel ID">
                <Input
                  placeholder="123456789012345"
                  value={config.meta_pixel_id}
                  onChange={(e) => setConfig({ ...config, meta_pixel_id: e.target.value })}
                />
              </Field>
              <Field label="CAPI Access Token" hint="Para retroalimentar eventos de conversão">
                <Input
                  type="password"
                  placeholder="Token da API de Conversões…"
                  value={config.meta_capi_token}
                  onChange={(e) => setConfig({ ...config, meta_capi_token: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Evolution API */}
      {config.preferred_provider === "evolution_api" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="text-sm font-semibold">Evolution API (VPS)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="URL da VPS" hint="Ex: https://minhavps.com">
              <Input
                placeholder="https://"
                value={config.evolution_api_url}
                onChange={(e) => setConfig({ ...config, evolution_api_url: e.target.value })}
              />
            </Field>
            <Field label="Evolution API Key">
              <Input
                type="password"
                placeholder="Chave de acesso da Evolution API…"
                value={config.evolution_api_key}
                onChange={(e) => setConfig({ ...config, evolution_api_key: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      <PrimaryButton disabled={busy} className="w-full">
        {busy ? "Salvando..." : "Salvar configurações de WhatsApp"}
      </PrimaryButton>
    </form>
  );
}

/* ──────────────────────────────────────────────── */
/* API Keys CRUD Tab                               */
/* ──────────────────────────────────────────────── */
function ApiKeysTab({ agencyId }: { agencyId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ provider: "", label: "", key_value: "", monthly_limit: "" });
  const [busy, setBusy] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const q = useQuery({
    queryKey: ["agency-api-keys-list", agencyId],
    queryFn: () => fetchApiKeys(agencyId),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider || !form.key_value) return;
    setBusy(true);
    try {
      await saveApiKey(agencyId, {
        provider: form.provider,
        label: form.label || form.provider,
        key_value: form.key_value,
        monthly_limit: form.monthly_limit ? Number(form.monthly_limit) : null,
        is_active: true,
      });
      toast.success("Chave adicionada");
      setForm({ provider: "", label: "", key_value: "", monthly_limit: "" });
      qc.invalidateQueries({ queryKey: ["agency-api-keys-list", agencyId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, is_active: boolean) {
    try {
      await toggleApiKey(id, is_active);
      qc.invalidateQueries({ queryKey: ["agency-api-keys-list", agencyId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    confirm({
      title: "Remover esta chave?",
      description:
        "Tem certeza de que deseja remover esta chave de API? Esta ação não pode ser desfeita.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteApiKey(id);
          toast.success("Chave removida");
          qc.invalidateQueries({ queryKey: ["agency-api-keys-list", agencyId] });
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <ConfirmDialog />
      <div className="rounded-lg border border-border/60 bg-surface-alt/30 px-4 py-3 text-xs text-muted-foreground">
        <KeyRound className="inline h-3.5 w-3.5 mr-1.5" />
        Gerencie livremente qualquer chave de integração para conectores customizados. Estas chaves
        ficam associadas exclusivamente a esta agência.
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5"
      >
        <Field label="Provider">
          <Input
            placeholder="anthropic, openai…"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            required
          />
        </Field>
        <Field label="Label">
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </Field>
        <Field label="Chave">
          <Input
            type="password"
            value={form.key_value}
            onChange={(e) => setForm({ ...form, key_value: e.target.value })}
            required
          />
        </Field>
        <Field label="Limite/mês">
          <Input
            type="number"
            value={form.monthly_limit}
            onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton disabled={busy} className="w-full">
            <Plus className="mr-1 inline h-3 w-3" /> Adicionar
          </PrimaryButton>
        </div>
      </form>

      <div className="rounded-lg border border-border bg-surface overflow-x-auto">
        {(q.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-xs text-muted-foreground">
            <KeyRound className="h-6 w-6" />
            Nenhuma chave cadastrada para esta agência.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Chave</th>
                <th className="px-3 py-2 text-right">Uso</th>
                <th className="px-3 py-2 text-center">Ativa</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((k) => (
                <tr key={k.id} className="border-t border-border hover:bg-surface-alt/20">
                  <td className="px-3 py-2.5 font-mono text-xs">{k.provider}</td>
                  <td className="px-3 py-2.5 text-xs">{k.label ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                    {mask(k.key_value)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {k.used_count}
                    {k.monthly_limit ? `/${k.monthly_limit}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={k.is_active}
                      onChange={(e) => toggle(k.id, e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <GhostButton
                      type="button"
                      onClick={() => remove(k.id)}
                      className="p-1 text-destructive hover:bg-destructive/10"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </GhostButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AiAgentSettingsSection({ agencyId }: { agencyId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [responderActive, setResponderActive] = useState(false);
  const [context, setContext] = useState("");
  const [persona, setPersona] = useState<"conversion" | "retention" | "balanced">("balanced");

  const { data: agencyData, isLoading } = useQuery({
    queryKey: ["agency-integrations-ai-config", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("integrations_config")
        .eq("id", agencyId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (agencyData?.integrations_config) {
      const cfg = agencyData.integrations_config as any;
      setResponderActive(cfg.ai_responder_active === true);
      setContext(cfg.ai_context || "");
      setPersona(cfg.ai_persona || "balanced");
    }
  }, [agencyData]);

  async function saveSettings() {
    setBusy(true);
    try {
      const existingConfig = (agencyData?.integrations_config as Record<string, any>) || {};
      const newConfig = {
        ...existingConfig,
        ai_responder_active: responderActive,
        ai_context: context.trim(),
        ai_persona: persona,
      };

      const { error } = await supabase
        .from("agencies")
        .update({ integrations_config: newConfig })
        .eq("id", agencyId);

      if (error) throw error;
      toast.success("Configurações do Agente de IA salvas!");
      qc.invalidateQueries({ queryKey: ["agency-integrations-ai-config", agencyId] });
      qc.invalidateQueries({ queryKey: ["agency-integrations", agencyId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading)
    return <div className="text-xs text-muted-foreground">Carregando agente de IA...</div>;

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <Cpu className="h-5 w-5 text-brand" />
        Configurações do Agente de IA (Auto-Responder)
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed font-sans">
        Configure as diretrizes comportamentais e o tom de voz do agente de IA que responde
        autonomamente às mensagens dos seus clientes no WhatsApp.
      </p>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-alt/10 p-3.5">
        <div>
          <label className="text-xs font-bold text-foreground">Auto-Responder Ativo</label>
          <p className="text-[10px] text-muted-foreground font-sans">
            Se ativado, a IA responderá diretamente às mensagens recebidas via WhatsApp.
          </p>
        </div>
        <input
          type="checkbox"
          checked={responderActive}
          onChange={(e) => setResponderActive(e.target.checked)}
          className="h-4 w-4 accent-brand cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Persona de Atendimento">
          <Select value={persona} onChange={(e: any) => setPersona(e.target.value)}>
            <option value="balanced">Equilibrado / Neutro</option>
            <option value="conversion">Foco em Conversão (Vendas Agressivas)</option>
            <option value="retention">Foco em Retenção (Suporte & Pós-Venda)</option>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
            Ajusta o estilo de comunicação e os objetivos de vendas da inteligência artificial.
          </p>
        </Field>
      </div>

      <Field label="Instruções de Contexto Base (System Prompt)">
        <textarea
          rows={5}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Ex: Somos uma agência focada em ecoturismo de luxo. Sempre chame o cliente pelo primeiro nome. Destaque que nossos pacotes incluem guias bilíngues..."
          className="w-full text-xs bg-surface-alt border border-border/60 rounded-xl px-4 py-2.5 resize-none focus:ring-0 focus:border-brand/50 font-sans leading-relaxed text-foreground"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
          Adicione diretrizes operacionais, regras de negócio ou ofertas exclusivas da sua agência.
        </p>
      </Field>

      <PrimaryButton type="button" disabled={busy} onClick={saveSettings} className="w-full">
        {busy ? "Salvando..." : "Salvar Configurações do Agente de IA"}
      </PrimaryButton>
    </div>
  );
}

function InfotravelTab({ agencyId }: { agencyId: string }) {
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({
    infotravel_url: "",
    infotravel_username: "",
    infotravel_password: "",
    infotravel_client: "",
    infotravel_agency: "",
    infotravel_markup: "0",
  });

  const { data: agencyData, isLoading } = useQuery({
    queryKey: ["agency-integrations-infotravel", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("integrations_config")
        .eq("id", agencyId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const keysQuery = useQuery({
    queryKey: ["agency-api-keys", agencyId],
    queryFn: () => fetchApiKeys(agencyId),
  });

  useEffect(() => {
    if (agencyData?.integrations_config) {
      const cfg = agencyData.integrations_config as any;
      setConfig((c) => ({
        ...c,
        infotravel_markup:
          cfg.infotravel_markup !== undefined ? String(cfg.infotravel_markup) : "0",
      }));
    }
    if (keysQuery.data) {
      const getVal = (provider: string) =>
        keysQuery.data?.find((k) => k.provider === provider)?.key_value || "";
      setConfig((c) => ({
        ...c,
        infotravel_url: getVal("infotravel_url") || "http://api.infotravel.com.br/api/v1",
        infotravel_username: getVal("infotravel_username"),
        infotravel_password: getVal("infotravel_password"),
        infotravel_client: getVal("infotravel_client"),
        infotravel_agency: getVal("infotravel_agency"),
      }));
    }
  }, [agencyData, keysQuery.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const existingConfig = (agencyData?.integrations_config as Record<string, any>) || {};
      const newConfig = {
        ...existingConfig,
        infotravel_markup: parseFloat(config.infotravel_markup) || 0,
      };

      const { error } = await supabase
        .from("agencies")
        .update({ integrations_config: newConfig })
        .eq("id", agencyId);
      if (error) throw error;

      const secrets = [
        {
          provider: "infotravel_url",
          val: config.infotravel_url.trim(),
          label: "Infotravel Base URL",
        },
        {
          provider: "infotravel_username",
          val: config.infotravel_username.trim(),
          label: "Infotravel Username",
        },
        {
          provider: "infotravel_password",
          val: config.infotravel_password.trim(),
          label: "Infotravel Password",
        },
        {
          provider: "infotravel_client",
          val: config.infotravel_client.trim(),
          label: "Infotravel Client Code",
        },
        {
          provider: "infotravel_agency",
          val: config.infotravel_agency.trim(),
          label: "Infotravel Agency Code",
        },
      ];

      for (const secret of secrets) {
        await saveApiKey(agencyId, {
          provider: secret.provider,
          label: secret.label,
          key_value: secret.val,
          is_active: true,
        });
      }

      toast.success("Configurações do Infotravel salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground font-sans">Carregando...</div>
    );

  return (
    <form onSubmit={save} className="mt-5 space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Wifi className="h-5 w-5 text-brand" />
          Conexão GDS Infotravel / Infotera
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed font-sans">
          Preencha os campos abaixo com as credenciais fornecidas pela sua operadora de turismo
          vinculada ao sistema Infotravel.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="col-span-2">
            <Field
              label="URL da API (Infotravel)"
              hint="Padrão: http://api.infotravel.com.br/api/v1"
            >
              <Input
                placeholder="http://api.infotravel.com.br/api/v1"
                value={config.infotravel_url}
                onChange={(e) => setConfig({ ...config, infotravel_url: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Usuário (Username)">
            <Input
              placeholder="Digite o usuário de integração…"
              value={config.infotravel_username}
              onChange={(e) => setConfig({ ...config, infotravel_username: e.target.value })}
              required
            />
          </Field>
          <Field label="Senha (Password)">
            <Input
              type="password"
              placeholder="Digite a senha de integração…"
              value={config.infotravel_password}
              onChange={(e) => setConfig({ ...config, infotravel_password: e.target.value })}
              required
            />
          </Field>
          <Field label="Código do Cliente (Client ID)">
            <Input
              placeholder="Identificador do cliente operadora…"
              value={config.infotravel_client}
              onChange={(e) => setConfig({ ...config, infotravel_client: e.target.value })}
              required
            />
          </Field>
          <Field label="Código da Agência (Agency ID)">
            <Input
              placeholder="Código da agência contratante…"
              value={config.infotravel_agency}
              onChange={(e) => setConfig({ ...config, infotravel_agency: e.target.value })}
              required
            />
          </Field>
          <Field
            label="Markup (%)"
            hint="Margem padrão a ser aplicada sobre as tarifas líquidas importadas"
          >
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 15.00"
              value={config.infotravel_markup}
              onChange={(e) => setConfig({ ...config, infotravel_markup: e.target.value })}
              required
            />
          </Field>
        </div>
      </div>

      <PrimaryButton disabled={busy} className="w-full">
        {busy ? "Salvando..." : "Salvar configurações do Infotravel"}
      </PrimaryButton>
    </form>
  );
}
