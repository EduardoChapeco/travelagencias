import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Wifi, WifiOff, MessageCircle, Zap, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAgencySettings,
  saveSettings,
  fetchApiKeys,
  saveApiKey,
  toggleApiKey,
  deleteApiKey,
  fetchTeamMembers,
  fetchTeamInvites,
  inviteTeamMember,
  deleteTeamInvite,
} from "@/services/settings";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton, Select } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/agency/$slug/settings")({
  head: () => ({ meta: [{ title: "Configurações · TravelOS" }] }),
  component: Page,
});

const INTEGRATION_PROVIDERS: Array<{ key: string; label: string; hint?: string }> = [
  {
    key: "gemini",
    label: "Gemini API Key",
    hint: "Para IA e OCR; opcional se quiser usar a chave global",
  },
  { key: "anthropic", label: "Anthropic API Key", hint: "Claude Sonnet — opcional" },
  { key: "openai", label: "OpenAI API Key", hint: "GPT — opcional" },
  { key: "resend", label: "Resend API Key", hint: "Envio de e-mails" },
  { key: "whatsapp_phone_id", label: "WhatsApp Phone Number ID" },
  { key: "whatsapp_token", label: "WhatsApp Access Token" },
  { key: "google_business", label: "Google Business Client ID" },
  {
    key: "google_calendar_client_id",
    label: "Google Calendar Client ID",
    hint: "ID do cliente OAuth 2.0",
  },
  {
    key: "google_calendar_client_secret",
    label: "Google Calendar Client Secret",
    hint: "Segredo do cliente OAuth 2.0",
  },
  {
    key: "google_calendar_refresh_token",
    label: "Google Calendar Refresh Token",
    hint: "Refresh Token com escopo do Google Calendar",
  },
];

function mask(v: string | null | undefined) {
  if (!v) return "—";
  if (v.length <= 12) return "***";
  return v.slice(0, 8) + "•".repeat(Math.min(20, v.length - 8));
}

function Page() {
  const { agency } = useAgency();
  if (!agency) return null;
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados cadastrais, equipe, integrações e chaves"
      />
      <Tabs defaultValue="general" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="omnichannel" className="flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Omnichannel
          </TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralTab agencyId={agency.id} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab agencyId={agency.id} />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsTab agencyId={agency.id} />
        </TabsContent>
        <TabsContent value="omnichannel">
          <OmnichannelTab agencyId={agency.id} />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeysTab agencyId={agency.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ------------------------- GERAL ------------------------- */
const generalSettingsSchema = z.object({
  name: z.string().min(2, "Nome da agência deve ter pelo menos 2 caracteres"),
  slug: z.string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug inválido (apenas minúsculas, números e hifens, sem iniciar/terminar com hífen)"),
  legal_name: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().email("Digite um e-mail válido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;

function GeneralTab({ agencyId }: { agencyId: string }) {
  const { refresh } = useAgency();
  const [createdAt, setCreatedAt] = useState("");

  const q = useQuery({
    queryKey: ["agency-full", agencyId],
    queryFn: async () => {
      const data = await fetchAgencySettings(agencyId);
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      legal_name: "",
      document: "",
    },
  });

  useEffect(() => {
    if (!q.data?.agency) return;
    const agencyData = {
      name: q.data.agency.name,
      slug: q.data.agency.slug,
      email: q.data.priv?.email ?? "",
      phone: q.data.priv?.phone ?? "",
      legal_name: q.data.priv?.legal_name ?? "",
      document: q.data.priv?.document ?? "",
    };
    reset(agencyData);
    setCreatedAt(q.data.agency.created_at ?? "");
  }, [q.data, reset]);

  async function onSubmit(data: GeneralSettingsForm) {
    try {
      await saveSettings(
        agencyId,
        {
          name: data.name,
          cnpj: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
        }, // payload for company_profiles
        {
          name: data.name,
          slug: data.slug,
          email: data.email || null,
          phone: data.phone || null,
          document: data.document || null,
          legal_name: data.legal_name || null,
        }, // agencyPayload for agencies
        {
          email: data.email || null,
          phone: data.phone || null,
          document: data.document || null,
          legal_name: data.legal_name || null,
        }, // privatePayload for agency_private
      );
      toast.success("Configurações salvas");
      refresh();
      if (data.slug !== q.data?.agency?.slug) {
        window.location.href = `/agency/${data.slug}/settings`;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 rounded-lg border border-border bg-surface p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da agência" error={errors.name?.message}>
          <Input
            {...register("name")}
            onChange={(e) => {
              const val = e.target.value;
              setValue("name", val, { shouldValidate: true });
              // Auto-fill slug if it wasn't modified manually, or matches the slugified name
              const currentSlug = q.data?.agency?.slug || "";
              const currentNameSlugified = slugify(q.data?.agency?.name || "");
              const currentValSlugified = slugify(val);
              if (currentSlug === currentNameSlugified || !currentSlug) {
                setValue("slug", currentValSlugified, { shouldValidate: true });
              }
            }}
          />
        </Field>
        <Field label="Slug (URL)" error={errors.slug?.message}>
          <Input
            {...register("slug")}
            onChange={(e) => {
              setValue("slug", slugify(e.target.value), { shouldValidate: true });
            }}
          />
        </Field>
      </div>
      <Field label="Razão social" error={errors.legal_name?.message}>
        <Input {...register("legal_name")} />
      </Field>
      <Field label="CNPJ / Documento" error={errors.document?.message}>
        <Input {...register("document")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail oficial" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Telefone" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Criada em {createdAt ? new Date(createdAt).toLocaleDateString("pt-BR") : "—"} ·
        Plano: Padrão
      </div>
      <PrimaryButton disabled={isSubmitting}>{isSubmitting ? "Salvando…" : "Salvar"}</PrimaryButton>
    </form>
  );
}

/* ------------------------- EQUIPE ------------------------- */
function TeamTab({ agencyId }: { agencyId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [busy, setBusy] = useState(false);

  const members = useQuery({
    queryKey: ["team-members", agencyId],
    queryFn: () => fetchTeamMembers(agencyId),
  });

  const invites = useQuery({
    queryKey: ["team-invites", agencyId],
    queryFn: () => fetchTeamInvites(agencyId),
  });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const data = await inviteTeamMember(agencyId, email, role);
      const url = `${window.location.origin}/m/invite/${data.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Convite gerado — link copiado");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-invites", agencyId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao convidar");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      await deleteTeamInvite(id);
      toast.success("Convite removido");
      qc.invalidateQueries({ queryKey: ["team-invites", agencyId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao revogar");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <form
        onSubmit={invite}
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-4"
      >
        <Input
          type="email"
          placeholder="email@agente.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="min-w-[240px] flex-1"
        />
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-[180px]">
          <option value="agency_admin">Administrador</option>
          <option value="agent">Agente</option>
          <option value="agent_viewer">Visualizador</option>
        </Select>
        <PrimaryButton disabled={busy}>{busy ? "Enviando…" : "Convidar"}</PrimaryButton>
      </form>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Membros ativos
        </div>
        {(members.data ?? []).length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">Nenhum membro ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {members.data!.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{m.profile?.full_name ?? m.user_id.slice(0, 8)}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Convites pendentes
        </div>
        {(invites.data ?? []).filter((i) => !i.accepted_at).length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">Nenhum convite pendente.</div>
        ) : (
          <ul className="divide-y divide-border">
            {invites
              .data!.filter((i) => !i.accepted_at)
              .map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                >
                  <div>
                    <div>{i.email}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {i.role} · expira {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <GhostButton
                      type="button"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(`${window.location.origin}/m/invite/${i.token}`)
                          .then(() => toast.success("Link copiado"))
                      }
                    >
                      Copiar link
                    </GhostButton>
                    <button
                      type="button"
                      onClick={() => revokeInvite(i.id)}
                      className="rounded-md border border-border p-1.5 hover:bg-surface-alt"
                      aria-label="Revogar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------- INTEGRAÇÕES ------------------------- */
function IntegrationsTab({ agencyId }: { agencyId: string }) {
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
        label: INTEGRATION_PROVIDERS.find((p) => p.key === provider)?.label ?? provider,
        key_value: value.trim(),
        is_active: true,
      });
      toast.success("Chave salva");
      qc.invalidateQueries({ queryKey: ["agency-api-keys", agencyId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Chaves específicas desta agência. Quando ausentes, o sistema usa as chaves globais
        cadastradas pelo administrador.
      </div>
      {INTEGRATION_PROVIDERS.map((p) => {
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
  );
}

function IntegrationRow({
  provider,
  existing,
  onSubmit,
}: {
  provider: { key: string; label: string; hint?: string };
  existing?: { key_value: string };
  onSubmit: (v: string) => Promise<void>;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-end gap-2 rounded-lg border border-border bg-surface p-3">
      <Field label={provider.label} hint={provider.hint}>
        <Input
          type="password"
          placeholder={existing ? mask(existing.key_value) : "Cole a chave aqui"}
          value={v}
          onChange={(e) => setV(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <PrimaryButton
        type="button"
        disabled={busy || !v.trim()}
        onClick={async () => {
          setBusy(true);
          await onSubmit(v);
          setV("");
          setBusy(false);
        }}
        className="self-end"
      >
        {existing ? "Atualizar" : "Salvar"}
      </PrimaryButton>
    </div>
  );
}

/* ------------------------- API KEYS CRUD ------------------------- */
function ApiKeysTab({ agencyId }: { agencyId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ provider: "", label: "", key_value: "", monthly_limit: "" });
  const [busy, setBusy] = useState(false);

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
    if (!window.confirm("Remover esta chave?")) return;
    try {
      await deleteApiKey(id);
      toast.success("Chave removida");
      qc.invalidateQueries({ queryKey: ["agency-api-keys-list", agencyId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mt-4 space-y-4">
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

      <div className="rounded-lg border border-border bg-surface">
        {(q.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-xs text-muted-foreground">
            <KeyRound className="h-6 w-6" />
            Nenhuma chave cadastrada para esta agência.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Chave</th>
                <th className="px-3 py-2 text-right">Uso</th>
                <th className="px-3 py-2 text-center">Ativa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{k.provider}</td>
                  <td className="px-3 py-2">{k.label ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{mask(k.key_value)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {k.used_count}
                    {k.monthly_limit ? `/${k.monthly_limit}` : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={k.is_active}
                      onChange={(e) => toggle(k.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(k.id)}
                      className="rounded-md border border-border p-1.5 hover:bg-surface-alt"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

/* ----------------------- OMNICHANNEL TAB ----------------------- */
function OmnichannelTab({ agencyId }: { agencyId: string }) {
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

  const { data: agency, isLoading } = useQuery({
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
    if ((agency as any)?.integrations_config) {
      setConfig((c) => ({ ...c, ...(agency as any).integrations_config }));
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
  }, [agency, keysQuery.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // 1. Save non-secrets to agency integrations_config
      const nonSecrets = {
        meta_pixel_id: config.meta_pixel_id,
        evolution_api_url: config.evolution_api_url,
        preferred_provider: config.preferred_provider,
      };

      const { error } = await (supabase as any)
        .from("agencies")
        .update({ integrations_config: nonSecrets })
        .eq("id", agencyId);
      if (error) throw error;

      // 2. Save secrets to api_keys
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

      toast.success("Configurações de Omnichannel salvas com segurança!");
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
    <form onSubmit={save} className="mt-4 space-y-6">
      {/* Provider Selection */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <MessageCircle className="h-5 w-5 text-brand" />
          Provedor de WhatsApp
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              config.preferred_provider === "meta_official"
                ? "border-brand bg-brand/5"
                : "border-border hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name="provider"
              value="meta_official"
              checked={config.preferred_provider === "meta_official"}
              onChange={() => setConfig({ ...config, preferred_provider: "meta_official" })}
            />
            <span className="font-bold text-sm">API Oficial Meta</span>
            <span className="text-xs text-muted-foreground">
              Estável, sem servidor extra. 1.000 conversas/mês grátis.
            </span>
          </label>
          <label
            className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              config.preferred_provider === "evolution_api"
                ? "border-brand bg-brand/5"
                : "border-border hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name="provider"
              value="evolution_api"
              checked={config.preferred_provider === "evolution_api"}
              onChange={() => setConfig({ ...config, preferred_provider: "evolution_api" })}
            />
            <span className="font-bold text-sm">Evolution API (VPS)</span>
            <span className="text-xs text-muted-foreground">
              Custo zero por mensagem. Requer VPS própria ($5/mês).
            </span>
          </label>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-dashed border-border/80 bg-surface/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Zap className="h-4 w-4" /> URL do Webhook (configure no painel Meta ou Evolution)
        </div>
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

      {/* Meta Official Settings */}
      {config.preferred_provider === "meta_official" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand" /> Configurações da API Oficial Meta
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp Phone Number ID">
              <Input
                type="password"
                placeholder="Número do telefone no painel Meta..."
                value={config.whatsapp_phone_id}
                onChange={(e) => setConfig({ ...config, whatsapp_phone_id: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp Access Token" hint="Token permanente do Meta Business Manager">
              <Input
                type="password"
                placeholder="EAAxxxxx..."
                value={config.whatsapp_access_token}
                onChange={(e) => setConfig({ ...config, whatsapp_access_token: e.target.value })}
              />
            </Field>
            <Field
              label="Verify Token (Webhook)"
              hint="Defina qualquer palavra-secreta e coloque igual no Meta"
            >
              <Input
                placeholder="ex: travelOS-secret-2024"
                value={config.meta_verify_token}
                onChange={(e) => setConfig({ ...config, meta_verify_token: e.target.value })}
              />
            </Field>
          </div>
          <div className="border-t border-border/50 pt-4">
            <div className="text-xs font-bold text-muted-foreground mb-3">
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
                  placeholder="Token da API de Conversões..."
                  value={config.meta_capi_token}
                  onChange={(e) => setConfig({ ...config, meta_capi_token: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Evolution API Settings */}
      {config.preferred_provider === "evolution_api" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="text-sm font-bold text-foreground">
            Configurações do Evolution API (VPS)
          </div>
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
                placeholder="Chave de acesso da Evolution API..."
                value={config.evolution_api_key}
                onChange={(e) => setConfig({ ...config, evolution_api_key: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      <PrimaryButton disabled={busy} className="w-full">
        {busy ? "Salvando..." : "Salvar Configurações de Omnichannel"}
      </PrimaryButton>
    </form>
  );
}
