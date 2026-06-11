import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound } from "lucide-react";
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
        <TabsContent value="apikeys">
          <ApiKeysTab agencyId={agency.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ------------------------- GERAL ------------------------- */
function GeneralTab({ agencyId }: { agencyId: string }) {
  const { refresh } = useAgency();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    legal_name: "",
    document: "",
    created_at: "",
  });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["agency-full", agencyId],
    queryFn: async () => {
      const data = await fetchAgencySettings(agencyId);
      return data;
    },
  });

  useEffect(() => {
    if (!q.data?.agency) return;
    setForm({
      name: q.data.agency.name,
      slug: q.data.agency.slug,
      email: q.data.priv?.email ?? "",
      phone: q.data.priv?.phone ?? "",
      legal_name: q.data.priv?.legal_name ?? "",
      document: q.data.priv?.document ?? "",
      created_at: q.data.agency.created_at ?? "",
    });
  }, [q.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSettings(
        agencyId,
        { name: form.name, slug: form.slug },
        {
          email: form.email,
          phone: form.phone,
          document: form.document,
          legal_name: form.legal_name,
        },
        null,
      );
      toast.success("Configurações salvas");
      refresh();
      if (form.slug !== q.data?.agency?.slug) {
        window.location.href = `/agency/${form.slug}/settings`;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-4 rounded-lg border border-border bg-surface p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da agência">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Slug (URL)">
          <Input
            required
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
            }
          />
        </Field>
      </div>
      <Field label="Razão social">
        <Input
          value={form.legal_name}
          onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
        />
      </Field>
      <Field label="CNPJ / Documento">
        <Input
          value={form.document}
          onChange={(e) => setForm({ ...form, document: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail oficial">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Criada em {form.created_at ? new Date(form.created_at).toLocaleDateString("pt-BR") : "—"} ·
        Plano: Padrão
      </div>
      <PrimaryButton disabled={busy}>{busy ? "Salvando…" : "Salvar"}</PrimaryButton>
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
