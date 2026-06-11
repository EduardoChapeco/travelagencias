import { useState } from "react";
import { toast } from "sonner";
import { X, UserPlus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";

export function NewPassengerSheet({
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
    <SheetPage isOpen={true} onClose={onClose} title="Novo Passageiro">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <UserPlus className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Adicionar à Rooming List</p>
      </div>

      {/* Content Form */}
      <form onSubmit={submit} className="flex flex-col">
        <div className="px-6 py-6 space-y-5">
          <Field label="Nome Completo *">
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome conforme o documento"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de Viajante">
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as "adult" | "child" | "infant")}
              >
                <option value="adult">Adulto</option>
                <option value="child">Criança (CHD)</option>
                <option value="infant">Infante (INF)</option>
              </Select>
            </Field>
            <Field label="Data de Nascimento">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
          </div>

          <div className="rounded-xl border border-border p-4 bg-surface-alt/20 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Documentação Primária
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo de Documento">
                <Select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="passport">Passaporte</option>
                  <option value="rg">Identidade (RG)</option>
                  <option value="cpf">CPF</option>
                  <option value="cnh">CNH</option>
                </Select>
              </Field>
              <Field label="Número do Documento">
                <Input
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Ex: AB123456"
                />
              </Field>
            </div>
            <Field label="Nacionalidade Emissora">
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ex: Brasileiro"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email (Opcional)">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passageiro@email.com"
              />
            </Field>
            <Field label="Telefone (Opcional)">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4 cursor-pointer hover:border-brand/40 transition-colors">
            <input
              type="checkbox"
              checked={isLead}
              onChange={(e) => setIsLead(e.target.checked)}
              className="h-4 w-4 rounded border-brand/30 bg-surface text-brand focus:ring-brand"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Passageiro Principal (Lead)</span>
              <span className="text-xs text-muted-foreground">
                Responsável financeiro ou líder da reserva no destino.
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-alt/30 px-6 py-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar Passageiro"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
