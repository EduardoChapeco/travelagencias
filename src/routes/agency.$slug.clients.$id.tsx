import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Edit3, X, Merge, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/formatters";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  fetchClient,
  fetchClientsForMerge,
  fetchClientProposals,
  fetchClientTrips,
  fetchClientLegalAcceptances,
  fetchClientTickets,
  updateClientProfile,
  archiveClient,
  mergeClients,
} from "@/services/clients";


// Subcomponents
import { DocumentsPanel } from "@/components/clients/DocumentsPanel";
import { ClientLeadsPanel } from "@/components/clients/ClientLeadsPanel";
import { AIAnalysisPanel } from "@/components/clients/AIAnalysisPanel";
import { Timeline360 } from "@/components/clients/Timeline360";
import { ClientForm } from "@/components/clients/ClientForm";

export const Route = createFileRoute("/agency/$slug/clients/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Cliente · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { slug, id } = useParams({ from: "/agency/$slug/clients/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();
  const { prompt, PromptDialog } = usePrompt();

  const clientQ = useQuery({
    enabled: !!agency,
    queryKey: ["client", id],
    queryFn: () => fetchClient(id),
  });

  const allClientsQ = useQuery({
    enabled: isMerging,
    queryKey: ["clients-for-merge", agency?.id, id],
    queryFn: () => fetchClientsForMerge(agency!.id, id),
  });

  const proposalsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-proposals", id],
    queryFn: () => fetchClientProposals(id),
  });

  const tripsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-trips", id],
    queryFn: () => fetchClientTrips(id),
  });

  const lgpdQ = useQuery({
    enabled: !!id,
    queryKey: ["client-lgpd", id],
    queryFn: () => fetchClientLegalAcceptances(id),
  });

  const ticketsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-tickets", id],
    queryFn: () => fetchClientTickets(id),
  });

  const timelineEvents = [
    ...(proposalsQ.data ?? []).map((p) => ({
      type: "proposal" as const,
      date: p.created_at,
      data: p,
    })),
    ...(tripsQ.data ?? []).map((t) => ({ type: "trip" as const, date: t.created_at, data: t })),
    ...(lgpdQ.data ?? []).map((l: any) => ({
      type: "lgpd" as const,
      date: l.accepted_at,
      data: l,
    })),
    ...(ticketsQ.data ?? []).map((t) => ({ type: "ticket" as const, date: t.created_at, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [form, setForm] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    if (clientQ.data) setForm(clientQ.data);
  }, [clientQ.data]);

  const save = useMutation({
    mutationFn: (patch: Record<string, any>) => updateClientProfile(id, patch),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const softDelete = useMutation({
    mutationFn: () => archiveClient(id),
    onSuccess: () => {
      toast.success("Cliente arquivado com segurança.");
      navigate({ to: "/agency/$slug/clients", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao deletar"),
  });

  const mergeClientsMutation = useMutation({
    mutationFn: async () => {
      if (!mergeTargetId) throw new Error("Selecione o cliente para unificar.");
      await mergeClients(id, mergeTargetId);
    },
    onSuccess: () => {
      toast.success("Clientes unificados com sucesso!");
      navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: mergeTargetId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao unificar"),
  });

  if (clientQ.isLoading || !form)
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!clientQ.data)
    return <div className="p-8 text-sm text-muted-foreground">Cliente não encontrado.</div>;

  const c = form;
  const tags = c.tags || [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <ConfirmDialog />
      <PromptDialog />

              <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsMerging(true)}
                className="flex h-8 items-gap gap-1.5 rounded-full border-none glass-card border-none px-3 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
              >
                <Merge className="h-3.5 w-3.5" /> Unificar Cadastro
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" /> Editar Perfil
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex h-8 items-center gap-1.5 rounded-full border-none glass-card border-none px-3 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>
      
      <header className="pb-6 border-b border-border">
        <Link
          to="/agency/$slug/clients"
          params={{ slug }}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium hover:no-underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para {getModuleName("clients", agency)}
        </Link>

        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{c.full_name}</h1>
          <StatusBadge tone={c.kind === "company" ? "info" : "neutral"}>
            {c.kind === "company" ? "B2B" : "B2C"}
          </StatusBadge>
          {c.deleted_at && <StatusBadge tone="danger">Arquivado</StatusBadge>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tags.map((t: string) => (
            <span
              key={t}
              className="px-3 py-1 glass bg-white/5 border-white/10 border-none text-foreground text-xs font-bold rounded-full"
            >
              {t}
            </span>
          ))}
          <button
            onClick={() => {
              prompt({
                title: "Nova Tag",
                description: "Nome da nova Tag:",
                onConfirm: async (newTag) => {
                  if (newTag) {
                    try {
                      const updated = [...tags, newTag];
                      await supabase.from("clients").update({ tags: updated }).eq("id", c.id);
                      qc.invalidateQueries({ queryKey: ["client", c.id] });
                      toast.success("Tag adicionada!");
                    } catch (e) {
                      toast.error("Erro ao adicionar tag");
                    }
                  }
                },
              });
            }}
            className="px-3 py-1 border border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-semibold rounded-full transition-colors cursor-pointer bg-transparent"
          >
            + Tag
          </button>
        </div>
      </header>

      {isMerging && (
        <div className="p-6 rounded-full border border-warning/50 bg-warning/5 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-warning font-bold">
            <Merge className="w-5 h-5" /> Unificar Cadastros
          </div>
          <p className="text-sm text-muted-foreground">
            Aviso: Este cliente <strong>({c.full_name})</strong> será transferido e unido a outro
            cadastro. Todo o histórico, viagens e tickets serão movidos, e este registro será
            arquivado (Soft Delete).
          </p>
          <div className="flex items-end gap-4 max-w-xl">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">
                Mover tudo para o cliente:
              </label>
              <SearchableSelect
                value={mergeTargetId}
                onChange={setMergeTargetId}
                placeholder="Buscar cliente de destino..."
                searchPlaceholder="Nome, e-mail..."
                options={allClientsQ.data?.map((cli) => ({
                  value: cli.id,
                  label: cli.full_name,
                  sublabel: cli.email ?? undefined,
                }))}
                loading={allClientsQ.isLoading}
              />
            </div>
            <button
              onClick={() => {
                if (!mergeTargetId) return toast.error("Selecione um cliente");
                confirm({
                  title: "Confirmar Unificação",
                  description:
                    "Confirmar a unificação? Esta ação moverá todo o histórico e não poderá ser desfeita.",
                  onConfirm: async () => {
                    try {
                      await mergeClients(id, mergeTargetId);
                      toast.success("Clientes unificados!");
                      navigate({
                        to: "/agency/$slug/clients/$id",
                        params: { slug, id: mergeTargetId },
                      });
                    } catch (e: any) {
                      toast.error(e.message || "Falha na unificação");
                    }
                  },
                });
              }}
              disabled={!mergeTargetId || mergeClientsMutation.isPending}
              className="h-12 px-6 rounded-full bg-warning text-warning-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {mergeClientsMutation.isPending ? "Unificando..." : "Confirmar Unificação"}
            </button>
            <button
              onClick={() => setIsMerging(false)}
              className="h-12 px-4 rounded-full border-none text-sm font-bold cursor-pointer text-foreground bg-background"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <InfoBlock
                  label="Contato"
                  value={
                    c.phone || c.email ? (
                      <>
                        {c.phone} <br />
                        <span className="text-muted-foreground">{c.email}</span>
                      </>
                    ) : (
                      "Sem contato"
                    )
                  }
                />
                <InfoBlock
                  label="Nascimento"
                  value={c.birth_date ? fmtDate(c.birth_date) : "Não informado"}
                />
                <InfoBlock
                  label="Documentos Nacionais"
                  value={
                    c.cpf || c.rg ? (
                      <>
                        {c.cpf ? `CPF: ${c.cpf}` : ""} {c.rg ? ` / RG: ${c.rg}` : ""}
                      </>
                    ) : (
                      "Não informado"
                    )
                  }
                />
                <InfoBlock
                  label="Passaporte"
                  value={
                    c.passport_number ? (
                      <>
                        {c.passport_number} <br />
                        <span className="text-muted-foreground text-xs">
                          Vence em: {c.passport_expiry ? fmtDate(c.passport_expiry) : "?"}
                        </span>
                      </>
                    ) : (
                      "Não informado"
                    )
                  }
                />
              </div>

              <div className="rounded-full border-none glass-card border-none p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Preferências e Observações
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {c.notes || "Sem anotações internas."}
                </p>
                {c.preferences?.dietary && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-danger uppercase">
                      Restrições Alimentares:
                    </span>
                    <p className="text-sm font-medium mt-1 text-foreground">
                      {c.preferences.dietary}
                    </p>
                  </div>
                )}
                {c.preferences?.notes && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Outras Preferências:
                    </span>
                    <p className="text-sm font-medium mt-1 text-foreground">
                      {c.preferences.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ClientForm
              client={c}
              onCancel={() => setIsEditing(false)}
              onSaved={async (patch) => {
                await save.mutateAsync(patch);
              }}
              onDelete={() => {
                softDelete.mutate();
              }}
              saving={save.isPending}
            />
          )}
        </div>

        <div className="space-y-6">
          <ClientLeadsPanel clientId={id} agencyId={agency?.id ?? ""} />
          <DocumentsPanel clientId={id} agencyId={agency?.id ?? ""} />
          <AIAnalysisPanel client={c} trips={tripsQ.data ?? []} proposals={proposalsQ.data ?? []} />
          <Timeline360 timelineEvents={timelineEvents} slug={slug} />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card border-none p-5 rounded-full border-none">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="text-sm font-medium leading-relaxed text-foreground">{value}</div>
    </div>
  );
}
