import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, AlertTriangle, Trash2, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "passport", label: "Passaporte" },
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "birth_cert", label: "Certidão de Nascimento" },
  { value: "cnh", label: "CNH" },
  { value: "visa", label: "Visto" },
  { value: "vaccination_card", label: "Cartão de Vacinação" },
  { value: "insurance", label: "Seguro" },
  { value: "other", label: "Outro" },
];

export function DocumentsPanel({ clientId, agencyId }: { clientId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    doc_type: "passport",
    doc_number: "",
    issued_at: "",
    expires_at: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const docsQ = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_documents" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

  async function saveDoc() {
    setSaving(true);
    const { error } = await supabase.from("client_documents" as any).insert({
      client_id: clientId,
      agency_id: agencyId,
      doc_type: form.doc_type,
      doc_number: form.doc_number || null,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar documento: " + error.message);
    toast.success("Documento adicionado!");
    setAdding(false);
    setForm({ doc_type: "passport", doc_number: "", issued_at: "", expires_at: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
  }

  async function deleteDoc(docId: string) {
    confirm({
      title: "Remover Documento",
      description: "Deseja remover este documento?",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await supabase
            .from("client_documents" as any)
            .delete()
            .eq("id", docId);
          qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
          toast.success("Documento removido.");
        } catch (e) {
          toast.error("Erro ao remover documento");
        }
      },
    });
  }

  const today = new Date();
  const soon = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  function expiryStatus(expiresAt?: string) {
    if (!expiresAt) return null;
    const d = new Date(expiresAt + "T00:00:00");
    if (d < today) return "expired";
    if (d < soon) return "soon";
    return "ok";
  }

  const docs = docsQ.data ?? [];
  const expiredCount = docs.filter((d: any) => expiryStatus(d.expires_at) === "expired").length;
  const soonCount = docs.filter((d: any) => expiryStatus(d.expires_at) === "soon").length;

  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface/50 transition-colors text-foreground"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          Documentos ({docs.length})
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <span className="text-[10px] font-bold bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {expiredCount} vencido(s)
            </span>
          )}
          {soonCount > 0 && (
            <span className="text-[10px] font-bold bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded-full">
              {soonCount} vence em breve
            </span>
          )}
        </div>
      </Button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-border/50 bg-background">
          {docs.length === 0 && !adding && (
            <p className="pt-4 text-sm text-muted-foreground text-center">
              Nenhum documento cadastrado.
            </p>
          )}

          {docs.map((doc: any) => {
            const status = expiryStatus(doc.expires_at);
            return (
              <div
                key={doc.id}
                className={`flex items-start justify-between gap-3 rounded-[var(--radius-card)] border p-3 ${
                  status === "expired"
                    ? "border-danger/30 bg-danger/5"
                    : status === "soon"
                      ? "border-warning/30 bg-warning/5"
                      : "border-border bg-surface"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground">
                      {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type}
                    </span>
                    {status === "expired" && (
                      <span className="text-[10px] font-bold text-danger">⚠ VENCIDO</span>
                    )}
                    {status === "soon" && (
                      <span className="text-[10px] font-bold text-warning">⏰ Vence em breve</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {doc.doc_number && <span>Nº {doc.doc_number} · </span>}
                    {doc.expires_at && (
                      <span>
                        Vence: {new Date(doc.expires_at + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {doc.notes && <span> · {doc.notes}</span>}
                  </div>
                </div>
                <Button
                  onClick={() => deleteDoc(doc.id)}
                  className="text-muted-foreground hover:text-danger transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {adding && (
            <div className="rounded-[var(--radius-card)] border border-brand/30 bg-brand/5 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Tipo
                  </label>
                  <Select
                    value={form.doc_type}
                    onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                    className="w-full rounded-full px-2"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Número
                  </label>
                  <Input
                    value={form.doc_number}
                    onChange={(e) => setForm({ ...form, doc_number: e.target.value })}
                    className="w-full rounded-full px-2"
                    placeholder="Ex: AB123456"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Emissão
                  </label>
                  <Input
                    type="date"
                    value={form.issued_at}
                    onChange={(e) => setForm({ ...form, issued_at: e.target.value })}
                    className="w-full rounded-full px-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Vencimento
                  </label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full rounded-full px-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveDoc}
                  disabled={saving}
                  className="flex-1 h-9 rounded-2xl bg-brand text-brand-foreground text-xs font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  onClick={() => setAdding(false)}
                  className="h-9 px-4 rounded-2xl border border-border text-xs font-semibold cursor-pointer text-foreground bg-surface"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!adding && (
            <Button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              <FileUp className="h-3.5 w-3.5" /> Adicionar documento
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
