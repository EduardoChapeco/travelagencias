import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Webhook, Key, Save, BellRing, Sparkles } from "lucide-react";
import {
  fetchIntegrationsConfig,
  saveIntegrationsConfig,
  type IntegrationsConfig,
} from "@/services/admin";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({ meta: [{ title: "Integrações & APIs · Admin" }] }),
  component: Page,
});

const DEFAULTS: IntegrationsConfig = {
  openrouter_key: "",
  groq_key: "",
  firecrawl_key: "",
  stell_key: "",
  vapid_public_key: "",
  vapid_private_key: "",
};

function Page() {
  const qc = useQueryClient();
  const [form, setForm] = useState<IntegrationsConfig>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin-integrations-config"],
    queryFn: fetchIntegrationsConfig,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const set = <K extends keyof IntegrationsConfig>(k: K, v: IntegrationsConfig[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();

    // Check if user is just submitting the asterisks (no change). We don't want to re-encrypt asterisks!
    if (form.openrouter_key === "••••••••••••••••") {
      toast.error(
        "Você precisa colar as chaves reais para salvar. Apague os asteriscos e cole a chave nova.",
      );
      return;
    }

    setBusy(true);
    try {
      await saveIntegrationsConfig(form);
      toast.success("Integrações salvas e criptografadas com segurança na nuvem!");
      qc.invalidateQueries({ queryKey: ["admin-integrations-config"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Integrações & APIs"
        description="Configure as chaves globais de Inteligência Artificial e Web Push para todas as agências."
      />

      <form onSubmit={save} className="max-w-3xl space-y-6">
        {/* IA ORCHESTRATOR */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <div>
              <h3 className="text-sm font-semibold">Orquestrador de IA</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chaves utilizadas pelas Edge Functions para geração de viagens, roteiros e OCR.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="OpenRouter API Key">
              <Input
                type="password"
                value={form.openrouter_key}
                onChange={(e) => set("openrouter_key", e.target.value)}
                placeholder="sk-or-v1-..."
                className="font-mono"
              />
            </Field>
            <Field label="Groq API Key" hint="Usado para inferência ultrarrápida (ex: OCR rápido)">
              <Input
                type="password"
                value={form.groq_key}
                onChange={(e) => set("groq_key", e.target.value)}
                placeholder="gsk_..."
                className="font-mono"
              />
            </Field>
            <Field label="Firecrawl API Key" hint="Web scraping e extração de dados">
              <Input
                type="password"
                value={form.firecrawl_key}
                onChange={(e) => set("firecrawl_key", e.target.value)}
                placeholder="fc-..."
                className="font-mono"
              />
            </Field>
            <Field
              label="Stell.dev API Key"
              hint="Navegação autônoma em websites (Headless Browser IA)"
            >
              <Input
                type="password"
                value={form.stell_key}
                onChange={(e) => set("stell_key", e.target.value)}
                placeholder="sk-..."
                className="font-mono"
              />
            </Field>
          </div>
        </section>

        {/* WEB PUSH */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-info" />
            <div>
              <h3 className="text-sm font-semibold">Web Push Notifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chaves VAPID globais para envio de notificações nativas nos navegadores.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="VAPID Public Key">
              <Input
                value={form.vapid_public_key}
                onChange={(e) => set("vapid_public_key", e.target.value)}
                placeholder="BBz..."
                className="font-mono"
              />
            </Field>
            <Field label="VAPID Private Key">
              <Input
                type="password"
                value={form.vapid_private_key}
                onChange={(e) => set("vapid_private_key", e.target.value)}
                placeholder="••••••••••••••"
                className="font-mono"
              />
            </Field>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <PrimaryButton type="submit" disabled={busy} className="gap-1.5">
            <Save className="h-4 w-4" />
            {busy ? "Salvando…" : "Salvar Configurações"}
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}
