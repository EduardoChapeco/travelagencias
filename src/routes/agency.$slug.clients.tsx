import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/clients")({
  head: () => ({ meta: [{ title: "Clientes · TravelOS" }] }),
  component: ClientsPage,
});

type Client = {
  id: string;
  full_name: string;
  legal_name: string | null;
  kind: "individual" | "company";
  document: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  tags: string[];
};

function ClientsPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/clients" });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["clients", agency?.id, q],
    queryFn: async () => {
      let qb = supabase
        .from("clients")
        .select("id, full_name, legal_name, kind, document, email, phone, created_at, tags")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        qb = qb.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},document.ilike.${term}`);
      }
      const { data, error } = await qb;
      if (error) throw error;
      return data as Client[];
    },
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Base centralizada de clientes da agência."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou documento"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none focus:border-border-strong"
          />
        </div>
        <span className="text-xs text-muted-foreground">{list.data?.length ?? 0} clientes</span>
      </div>

      {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {list.data && list.data.length === 0 && (
        <EmptyState title="Nenhum cliente ainda" description="Crie seu primeiro cliente para começar." />
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5">
                    <Link
                      to="/agency/$slug/clients/$id"
                      params={{ slug, id: c.id }}
                      className="font-medium hover:underline"
                    >
                      {c.full_name}
                    </Link>
                    {c.legal_name && (
                      <div className="text-xs text-muted-foreground">{c.legal_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {c.kind === "individual" ? "Pessoa física" : "Empresa"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.document ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <div>{c.email ?? "—"}</div>
                    <div>{c.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newOpen && agency && (
        <NewClientSheet
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["clients", agency.id] });
          }}
        />
      )}
    </>
  );
}

function NewClientSheet({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<"individual" | "company">("individual");
  const [fullName, setFullName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("clients").insert({
      agency_id: agencyId,
      kind,
      full_name: fullName,
      legal_name: legalName || null,
      document: document || null,
      email: email || null,
      phone: phone || null,
      birth_date: birthDate || null,
      notes: notes || null,
      owner_id: u.user?.id ?? null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo cliente">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Tipo">
          <Select value={kind} onChange={(e) => setKind(e.target.value as "individual" | "company")}>
            <option value="individual">Pessoa física</option>
            <option value="company">Empresa</option>
          </Select>
        </Field>
        <Field label={kind === "individual" ? "Nome completo *" : "Nome fantasia *"}>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        {kind === "company" && (
          <Field label="Razão social">
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "individual" ? "CPF" : "CNPJ"}>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} />
          </Field>
          {kind === "individual" && (
            <Field label="Nascimento">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
          )}
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Notas">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cliente"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
