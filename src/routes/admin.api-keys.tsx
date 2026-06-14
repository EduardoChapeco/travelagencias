import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton } from "@/components/ui/form";
import {
  fetchGlobalApiKeys,
  saveGlobalApiKey,
  toggleGlobalApiKey,
  deleteGlobalApiKey,
  type ApiKey,
} from "@/services/admin";


export const Route = createFileRoute("/admin/api-keys")({
  head: () => ({ meta: [{ title: "Chaves Globais · TravelOS Admin" }] }),
  component: Page,
});

function mask(v: string | null | undefined) {
  if (!v) return "—";
  if (v.length <= 12) return "***";
  return v.slice(0, 8) + "•".repeat(Math.min(20, v.length - 8));
}

function Page() {
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [form, setForm] = useState({ provider: "", label: "", key_value: "", monthly_limit: "" });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin-global-api-keys"],
    queryFn: fetchGlobalApiKeys,
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider || !form.key_value) return;
    setBusy(true);
    try {
      await saveGlobalApiKey({
        provider: form.provider.toLowerCase().trim(),
        label: form.label.trim() || form.provider.trim(),
        key_value: form.key_value.trim(),
        monthly_limit: form.monthly_limit ? Number(form.monthly_limit) : null,
        is_active: true,
      });
      toast.success("Chave global adicionada");
      setForm({ provider: "", label: "", key_value: "", monthly_limit: "" });
      qc.invalidateQueries({ queryKey: ["admin-global-api-keys"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, is_active: boolean) {
    try {
      await toggleGlobalApiKey(id, is_active);
      qc.invalidateQueries({ queryKey: ["admin-global-api-keys"] });
      toast.success(is_active ? "Chave ativada" : "Chave desativada");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    confirm({
      title: "Remover esta chave global?",
      description: "Tem certeza de que deseja remover esta chave de API global? Esta ação não pode ser desfeita.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteGlobalApiKey(id);
          toast.success("Chave global removida");
          qc.invalidateQueries({ queryKey: ["admin-global-api-keys"] });
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    });
  }

  const keysList = q.data ?? [];

  return (
    <>
      <ConfirmDialog />
      <PageHeader
        title="Chaves Globais"
        description="Gerencie chaves de API padrão do sistema (Gemini, OpenAI, Resend, etc.) usadas como fallback quando as agências não fornecem chaves próprias."
      />

      <div className="mt-4 space-y-4 max-w-5xl">
        <form
          onSubmit={add}
          className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5 items-end"
        >
          <Field label="Provedor (ex: gemini, resend)">
            <Input
              placeholder="gemini, resend..."
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              required
            />
          </Field>
          <Field label="Identificador / Label">
            <Input
              placeholder="Padrão"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </Field>
          <Field label="Chave de API">
            <Input
              type="password"
              placeholder="Cole a chave aqui"
              value={form.key_value}
              onChange={(e) => setForm({ ...form, key_value: e.target.value })}
              required
            />
          </Field>
          <Field label="Limite mensal de uso (opcional)">
            <Input
              type="number"
              min="1"
              value={form.monthly_limit}
              onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
            />
          </Field>
          <div>
            <PrimaryButton disabled={busy} className="w-full h-9 flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar
            </PrimaryButton>
          </div>
        </form>

        {q.isLoading && (
          <div className="text-sm text-muted-foreground p-6 text-center">Carregando chaves globais...</div>
        )}

        {!q.isLoading && keysList.length === 0 && (
          <EmptyState
            title="Nenhuma chave global cadastrada"
            description="Adicione chaves de fallback para garantir o funcionamento das integrações gerais da plataforma."
          />
        )}

        {!q.isLoading && keysList.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Provedor</th>
                  <th className="px-4 py-2.5 text-left font-medium">Label</th>
                  <th className="px-4 py-2.5 text-left font-medium">Chave</th>
                  <th className="px-4 py-2.5 text-right font-medium">Uso / Limite</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status (Ativa)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keysList.map((k: ApiKey) => (
                  <tr key={k.id} className="hover:bg-surface-alt/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground/80">{k.provider}</td>
                    <td className="px-4 py-3">{k.label ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{mask(k.key_value)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {k.used_count}
                      {k.monthly_limit ? ` / ${k.monthly_limit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={k.is_active}
                        onChange={(e) => toggle(k.id, e.target.checked)}
                        className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <GhostButton
                        type="button"
                        onClick={() => remove(k.id)}
                        className="h-8 w-8 p-0 text-danger hover:bg-danger/10 flex items-center justify-center rounded-md"
                        aria-label="Remover chave"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
