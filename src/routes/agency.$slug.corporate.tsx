import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/corporate")({
  head: () => ({ meta: [{ title: "Contas corporativas · TravelOS" }] }),
  component: CorporatePage,
});

type Corp = { id: string; company_name: string; cnpj: string | null; contact_name: string | null; contact_email: string | null; credit_limit: number; payment_terms: number | null; status: string };

function CorporatePage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["corporate", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("corporate_clients").select("id, company_name, cnpj, contact_name, contact_email, credit_limit, payment_terms, status").eq("agency_id", agency!.id).order("company_name");
      if (error) throw error;
      return data as Corp[];
    },
  });

  return (
    <>
      <PageHeader
        title="Contas corporativas"
        description="Empresas com política de viagem, faturamento mensal e crédito."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nova conta
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem contas corporativas" description="Cadastre empresas para faturamento centralizado." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Empresa</th><th className="px-3 py-2">CNPJ</th><th className="px-3 py-2">Contato</th><th className="px-3 py-2 text-right">Crédito</th><th className="px-3 py-2 text-right">Prazo</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody>
              {q.data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2 font-medium"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {c.company_name}</div></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.cnpj ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <div>{c.contact_name ?? "—"}</div>
                    <div>{c.contact_email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(c.credit_limit))}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{c.payment_terms ?? 30}d</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={c.status === "active" ? "success" : "neutral"}>{c.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && <NewCorp agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["corporate", agency.id] }); }} />}
    </>
  );
}

function NewCorp({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [credit, setCredit] = useState(0);
  const [terms, setTerms] = useState(30);
  const [cycle, setCycle] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("corporate_clients").insert({
      agency_id: agencyId, company_name: name, cnpj: cnpj || null, contact_name: contact || null,
      contact_email: email || null, contact_phone: phone || null,
      credit_limit: credit, payment_terms: terms, billing_cycle: cycle,
      travel_policy: notes ? { notes } : {},
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Conta corporativa criada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova conta corporativa">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Razão social *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CNPJ"><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></Field>
          <Field label="Ciclo de cobrança">
            <Select value={cycle} onChange={(e) => setCycle(e.target.value)}>
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="per_trip">Por viagem</option>
            </Select>
          </Field>
        </div>
        <Field label="Contato responsável"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite de crédito"><Input type="number" min={0} step="0.01" value={credit} onChange={(e) => setCredit(+e.target.value || 0)} /></Field>
          <Field label="Prazo (dias)"><Input type="number" min={0} value={terms} onChange={(e) => setTerms(+e.target.value || 0)} /></Field>
        </div>
        <Field label="Política de viagem (resumo)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar conta"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
