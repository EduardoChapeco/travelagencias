import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/suppliers")({
  head: () => ({ meta: [{ title: "Fornecedores · TravelOS" }] }),
  component: SuppliersPage,
});

type Supplier = {
  id: string; name: string; legal_name: string | null; kind: string;
  document: string | null; email: string | null; phone: string | null;
  commission_rate: number; is_active: boolean;
};

function SuppliersPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, legal_name, kind, document, email, phone, commission_rate, is_active")
        .eq("agency_id", agency!.id)
        .order("name");
      if (error) throw error;
      return data as unknown as Supplier[];
    },
  });

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Operadoras, hotéis, companhias aéreas e parceiros que compõem os pacotes."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Novo fornecedor
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem fornecedores" description="Cadastre operadoras e hotéis." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium text-right">Comissão</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{s.name}</div>
                    {s.legal_name && <div className="text-[11px] text-muted-foreground">{s.legal_name}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.kind}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{s.document ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <div>{s.email ?? "—"}</div>
                    <div>{s.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{Number(s.commission_rate).toFixed(2)}%</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "ativo" : "inativo"}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewSupplier agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["suppliers", agency.id] }); }} />
      )}
    </>
  );
}

function NewSupplier({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [kind, setKind] = useState("operator");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("suppliers").insert({
      agency_id: agencyId,
      name,
      legal_name: legalName || null,
      kind: kind as never,
      document: document || null,
      email: email || null,
      phone: phone || null,
      commission_rate: commission,
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Fornecedor criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo fornecedor">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome fantasia *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Razão social"><Input value={legalName} onChange={(e) => setLegalName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="operator">Operadora</option>
              <option value="airline">Cia aérea</option>
              <option value="hotel">Hotel</option>
              <option value="car_rental">Locadora</option>
              <option value="insurance">Seguro</option>
              <option value="transfer">Transfer</option>
              <option value="tour">Passeio</option>
              <option value="other">Outro</option>
            </Select>
          </Field>
          <Field label="Comissão (%)"><Input type="number" min={0} max={100} step="0.01" value={commission} onChange={(e) => setCommission(+e.target.value || 0)} /></Field>
        </div>
        <Field label="CNPJ"><Input value={document} onChange={(e) => setDocument(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Notas"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Criar"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
