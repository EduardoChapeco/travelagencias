import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, CheckCircle2, Clock, Send, Users, Building2, MapPin, DollarSign, Edit, AlertCircle, CheckSquare, Plus, } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { toast } from "sonner";
import { useState } from "react";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";

import { useConfirm } from "@/hooks/use-confirm";

export const Route = createFileRoute("/agency/$slug/corporate/$rfp_id")({
  head: ({ context }: any) => ({ meta: [{ title: `RFP Detail · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: RfpDetailPage,
});

const STATUS_STEPS = ["new", "scoping", "quoting", "negotiating", "approved"];

function RfpDetailPage() {
  const { slug, rfp_id } = useParams({ from: "/agency/$slug/corporate/$rfp_id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [addingOption, setAddingOption] = useState(false);
  const [newOptTitle, setNewOptTitle] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [newOptDesc, setNewOptDesc] = useState("");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["corporate-rfp", rfp_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("corporate_rfps")
        .select("*, client:corporate_clients(company_name)")
        .eq("id", rfp_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await (supabase as any)
        .from("corporate_rfps")
        .update(patch)
        .eq("id", rfp_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["corporate-rfp", rfp_id] }),
  });

  if (q.isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!q.data) return <div className="p-8 text-danger">RFP não encontrada.</div>;

  const rfp = q.data;
  const options = rfp.proposed_options || [];

  function addOption() {
    if (!newOptTitle || !newOptPrice) return;
    const next = [
      ...options,
      {
        id: crypto.randomUUID(),
        title: newOptTitle,
        price: parseFloat(newOptPrice),
        description: newOptDesc,
      },
    ];
    updateMut.mutate({ proposed_options: next });
    setAddingOption(false);
    setNewOptTitle("");
    setNewOptPrice("");
    setNewOptDesc("");
  }

  function removeOption(id: string) {
    confirm({
      title: "Remover opção",
      description: "Tem certeza de que deseja remover esta opção proposta?",
      variant: "destructive",
      onConfirm: () => {
        updateMut.mutate({ proposed_options: options.filter((o: any) => o.id !== id) });
      },
    });
  }

  const currentStepIndex = STATUS_STEPS.indexOf(rfp.status);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ConfirmDialog />
              <div className="flex items-center gap-2">
          {rfp.status === "negotiating" && (
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/p/corporate/approve?token=${rfp.approval_token}`,
                );
                toast.success("Link de aprovação copiado!");
              }}
              className="flex h-8 items-center gap-1.5 rounded-full border-none glass-card border-none px-3 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Link do Cliente
            </Button>
          )}
        </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0">
        <Link
          to="/agency/$slug/corporate"
          params={{ slug }}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para {getModuleName("corporate", agency)}
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 glass-card border-none p-6 rounded-[var(--radius-card)] border-none">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                RFP-{rfp.id.split("-")[0]}
              </span>
              <StatusBadge
                tone={
                  rfp.status === "approved"
                    ? "success"
                    : rfp.status === "lost"
                      ? "danger"
                      : "neutral"
                }
              >
                {rfp.status}
              </StatusBadge>
            </div>
            <h1 className="text-2xl font-bold">{rfp.title || "Solicitação de Orçamento"}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> {rfp.client?.company_name}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Select
              value={rfp.status}
              onChange={(e) => updateMut.mutate({ status: e.target.value })}
              className="w-48 font-medium"
            >
              <option value="new">Novo / Recebido</option>
              <option value="scoping">Definindo Escopo</option>
              <option value="quoting">Cotando Fornecedores</option>
              <option value="negotiating">Em Negociação</option>
              <option value="approved">Aprovado (Ganho)</option>
              <option value="lost">Perdido / Recusado</option>
            </Select>
            {rfp.status === "negotiating" && (
              <PrimaryButton
                className="h-9 text-xs gap-1.5 bg-success hover:bg-success/90 text-success-foreground border-none"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/p/corporate/approve?token=${rfp.approval_token}`,
                  );
                  toast.success("Link de aprovação copiado!");
                }}
              >
                <Send className="w-3.5 h-3.5" /> Link do Cliente
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 mb-8 px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 glass bg-white/5 border-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{
                  width:
                    currentStepIndex >= 0
                      ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`
                      : "0%",
                }}
              />
            </div>
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;
              return (
                <div
                  key={step}
                  className={`relative flex flex-col items-center gap-2 z-10 ${isCompleted ? "text-primary" : "text-muted-foreground"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${isCompleted ? "bg-primary text-primary-foreground" : "glass bg-white/5 border-white/10"}`}
                  >
                    {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className="ds-meta uppercase tracking-widest font-bold bg-background px-1">
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card border-none border-none p-6 rounded-[var(--radius-card)]">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand" /> Requisitos & Escopo
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass bg-white/5 border-white/10/50 p-3 rounded-[var(--radius-card)]">
                  <div className="ds-meta font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Destino
                  </div>
                  <div className="font-medium text-sm">{rfp.destination || "—"}</div>
                </div>
                <div className="glass bg-white/5 border-white/10/50 p-3 rounded-[var(--radius-card)]">
                  <div className="ds-meta font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Pax
                  </div>
                  <div className="font-medium text-sm">{rfp.pax_count} pessoas</div>
                </div>
                <div className="glass bg-white/5 border-white/10/50 p-3 rounded-[var(--radius-card)]">
                  <div className="ds-meta font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Budget Estimado
                  </div>
                  <div className="font-medium text-sm">
                    {rfp.budget_estimated ? `R$ ${rfp.budget_estimated}` : "Aberto"}
                  </div>
                </div>
                <div className="glass bg-white/5 border-white/10/50 p-3 rounded-[var(--radius-card)]">
                  <div className="ds-meta font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Viagem
                  </div>
                  <div className="font-medium text-sm truncate">
                    {rfp.travel_dates ? JSON.stringify(rfp.travel_dates) : "—"}
                  </div>
                </div>
              </div>

              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed p-4 glass bg-white/5 border-white/10/30 rounded-[var(--radius-card)] border-none/50">
                {typeof rfp.requirements === "string"
                  ? rfp.requirements
                  : JSON.stringify(rfp.requirements, null, 2)}
              </div>
            </div>

            <div className="glass-card border-none border-none p-6 rounded-[var(--radius-card)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-brand" /> Opções Propostas
                </h3>
                {!addingOption && rfp.status !== "approved" && (
                  <GhostButton
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setAddingOption(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Opção
                  </GhostButton>
                )}
              </div>

              {addingOption && (
                <div className="glass bg-white/5 border-white/10/50 border border-brand/30 p-4 rounded-[var(--radius-card)] mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="ds-meta uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                        Título da Opção
                      </label>
                      <Input
                        value={newOptTitle}
                        onChange={(e) => setNewOptTitle(e.target.value)}
                        placeholder="Ex: Voo LATAM + Hotel Ibis"
                      />
                    </div>
                    <div>
                      <label className="ds-meta uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                        Valor Total
                      </label>
                      <Input
                        type="number"
                        value={newOptPrice}
                        onChange={(e) => setNewOptPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ds-meta uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                      Detalhes
                    </label>
                    <Textarea
                      value={newOptDesc}
                      onChange={(e) => setNewOptDesc(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <GhostButton className="h-8 text-xs" onClick={() => setAddingOption(false)}>
                      Cancelar
                    </GhostButton>
                    <PrimaryButton className="h-8 text-xs" onClick={addOption}>
                      Adicionar
                    </PrimaryButton>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {options.length === 0 && !addingOption && (
                  <div className="text-center p-6 border-2 border-dashed border-border rounded-[var(--radius-card)] text-muted-foreground text-sm font-medium">
                    Nenhuma cotação adicionada ainda.
                  </div>
                )}
                {options.map((opt: any) => (
                  <div
                    key={opt.id}
                    className={`p-4 rounded-[var(--radius-card)] border ${rfp.approved_option_id === opt.id ? "bg-success/5 border-success/30 ring-1 ring-success/20" : "glass-card border-none border-border"} relative group`}
                  >
                    {rfp.approved_option_id === opt.id && (
                      <div className="absolute top-4 right-4 text-success font-bold ds-meta uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
                      </div>
                    )}
                    <div className="font-bold text-base mb-1 pr-24">{opt.title}</div>
                    <div className="text-brand font-semibold text-sm mb-3">
                      R$ {opt.price?.toLocaleString("pt-BR")}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {opt.description}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => removeOption(opt.id)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Remover
                      </Button>
                      {rfp.status !== "approved" && (
                        <Button
                          onClick={() =>
                            updateMut.mutate({ approved_option_id: opt.id, status: "approved" })
                          }
                          className="text-xs font-medium text-success hover:underline"
                        >
                          Marcar como Aprovada
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card border-none border-none p-5 rounded-[var(--radius-card)]">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Anotações Internas
              </h3>
              <Textarea
                placeholder="Anotações visíveis apenas para a agência..."
                className="w-full h-40 resize-none glass bg-white/5 border-white/10 focus:ring-brand"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
