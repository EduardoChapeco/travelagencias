import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  Sheet,
  fmtDate,
} from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/passengers")({
  head: () => ({ meta: [{ title: "Passageiros · TravelOS" }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { slug, id } = useParams({ from: "/agency/$slug/trips/$id/passengers" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", id)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await (supabase as any)
        .from("trip_passengers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passengers", id] }),
  });

  return (
    <>
      <Link
        to="/agency/$slug/trips/$id"
        params={{ slug, id }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para viagem
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Passageiros</h1>
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar passageiro
        </button>
      </div>

      {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {list.data && list.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
          Nenhum passageiro cadastrado.
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Nascimento</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{p.full_name}</div>
                    {p.is_lead_passenger && (
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Passageiro principal
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.kind}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {p.document ?? "—"}{" "}
                    <span className="text-muted-foreground">{p.document_type ?? ""}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{fmtDate(p.birth_date)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <div>{p.email ?? "—"}</div>
                    <div className="text-muted-foreground">{p.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => remove.mutate(p.id)}
                      className="rounded p-1 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewPassengerSheet
          tripId={id}
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["passengers", id] });
          }}
        />
      )}
    </>
  );
}

function NewPassengerSheet({
  tripId,
  agencyId,
  onClose,
  onCreated,
}: {
  tripId: string;
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [kind, setKind] = useState<"adult" | "child" | "infant">("adult");
  const [document, setDocument] = useState("");
  const [documentType, setDocumentType] = useState("passport");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("trip_passengers").insert({
      trip_id: tripId,
      agency_id: agencyId,
      full_name: fullName,
      kind,
      document: document || null,
      document_type: documentType || null,
      birth_date: birthDate || null,
      nationality: nationality || null,
      email: email || null,
      phone: phone || null,
      is_lead_passenger: isLead,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Passageiro adicionado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Adicionar passageiro">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome completo *">
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as "adult" | "child" | "infant")}
            >
              <option value="adult">Adulto</option>
              <option value="child">Criança</option>
              <option value="infant">Infante</option>
            </Select>
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Doc.">
            <Select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="passport">Passaporte</option>
              <option value="rg">RG</option>
              <option value="cpf">CPF</option>
              <option value="cnh">CNH</option>
            </Select>
          </Field>
          <Field label="Número">
            <Input value={document} onChange={(e) => setDocument(e.target.value)} />
          </Field>
        </div>
        <Field label="Nacionalidade">
          <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Telefone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />
          Passageiro principal
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Adicionando…" : "Adicionar"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
