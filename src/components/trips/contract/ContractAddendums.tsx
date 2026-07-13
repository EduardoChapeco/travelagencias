import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { FormInput as Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PrimaryButton, GhostButton, Button } from "@/components/ui/button";
import { CONTRACT_STATUS_MAP } from "@/lib/constants/status";
import { StatusBadge } from "@/components/ui/badge";
import { FormTextarea as Textarea } from "@/components/ui/textarea";

type Addendum = {
  id: string;
  contract_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  signed_at?: string | null;
};



export function ContractAddendums({
  contractId,
  contractStatus,
  addendums,
}: {
  contractId: string;
  contractStatus: string;
  addendums: Addendum[];
}) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addendumTitle, setAddendumTitle] = useState("");
  const [addendumContent, setAddendumContent] = useState("");

  const createAddendum = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { data, error } = await supabase
        .from("contract_addendums")
        .insert({
          contract_id: contractId,
          title,
          content,
          status: "pending_signature",
        })
        .select("*")
        .single();
      if (error) throw error;

      // Cria log na cadeia de auditoria ledger
      const { error: auditErr } = await supabase.from("contract_audit_chain").insert({
        contract_id: contractId,
        action: "ADDENDUM_CREATED",
        metadata: { addendum_id: data.id, title },
      });
      if (auditErr) console.warn("Erro ao registrar auditoria de aditivo:", auditErr);

      return data;
    },
    onSuccess: () => {
      toast.success("Aditivo criado com sucesso e enviado para assinatura", { id: "addendum" });
      qc.invalidateQueries({ queryKey: ["contract_addendums", contractId] });
      qc.invalidateQueries({ queryKey: ["contract_audit_chain", contractId] });
      setAddendumTitle("");
      setAddendumContent("");
      setShowAddForm(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Erro ao criar aditivo", { id: "addendum" }),
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Aditivos e Retificações</h2>
        {contractStatus === "signed" && !showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Aditivo
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-border p-4 space-y-4 bg-surface-alt/20">
          <h3 className="text-xs font-bold text-foreground">Novo Aditivo ao Contrato</h3>
          <Field label="Título do Aditivo">
            <Input
              placeholder="Ex: Alteração de Data de Embarque ou Upgrade de Hotel"
              value={addendumTitle}
              onChange={(e) => setAddendumTitle(e.target.value)}
              
            />
          </Field>
          <Field label="Conteúdo do Acordo (Cláusulas Adicionais)">
            <Textarea
              rows={4}
              placeholder="Descreva detalhadamente o acordo complementar..."
              value={addendumContent}
              onChange={(e) => setAddendumContent(e.target.value)}
              className="w-full rounded-full p-2.5 focus:border-border-strong resize-none"
            />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton
              disabled={createAddendum.isPending || !addendumTitle || !addendumContent}
              onClick={() =>
                createAddendum.mutate({ title: addendumTitle, content: addendumContent })
              }
            >
              {createAddendum.isPending ? "Criando..." : "Enviar Aditivo"}
            </PrimaryButton>
            <GhostButton
              onClick={() => {
                setShowAddForm(false);
                setAddendumTitle("");
                setAddendumContent("");
              }}
            >
              Cancelar
            </GhostButton>
          </div>
        </div>
      )}

      {(!addendums || addendums.length === 0) && (
        <p className="text-xs text-muted-foreground">
          Nenhum termo aditivo registrado para este contrato.
        </p>
      )}

      {addendums && addendums.length > 0 && (
        <div className="space-y-3">
          {addendums.map((ad) => (
            <div
              key={ad.id}
              className="rounded-[var(--radius-card)] border border-border/60 bg-surface-alt/10 p-3 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{ad.title}</span>
                <StatusBadge tone={CONTRACT_STATUS_MAP[ad.status]?.tone ?? "neutral"}>
                  {CONTRACT_STATUS_MAP[ad.status]?.label ?? ad.status}
                </StatusBadge>
              </div>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                {ad.content}
              </p>
              <div className="flex items-center justify-between ds-meta text-muted-foreground border-t border-border/30 pt-2 font-mono">
                <span>Criado: {new Date(ad.created_at).toLocaleDateString("pt-BR")}</span>
                {ad.signed_at && (
                  <span className="text-success font-semibold">
                    Assinado: {new Date(ad.signed_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
