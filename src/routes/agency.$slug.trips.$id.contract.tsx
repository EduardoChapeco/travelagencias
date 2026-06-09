import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, FileText, Send, CheckCircle, XCircle,
  Shield, Copy, Download, ExternalLink, AlertTriangle,
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PrimaryButton, GhostButton, StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/contract")({
  head: () => ({ meta: [{ title: "Contrato · TravelOS" }] }),
  component: TripContract,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Clause = {
  number: number;
  section: string;
  clause_text: string;
  is_immutable: boolean;
};

type Contract = {
  id: string;
  trip_id: string;
  agency_id: string;
  version: string;
  status: "draft" | "sent" | "pending_signature" | "signed" | "cancelled";
  package_summary: string | null;
  total_value: number;
  payment_terms: string | null;
  fixed_clauses: Clause[];
  custom_clauses: Clause[];
  client_data: Record<string, string>;
  passengers_data: Array<Record<string, string>>;
  agency_data: Record<string, string>;
  signatures: Array<{
    signer_name: string;
    signer_document: string;
    signed_at: string;
    ip: string;
  }>;
  certificate: { serial: string; issued_at: string } | null;
  content_hash: string | null;
  signed_hash: string | null;
  public_token: string;
  signed_at: string | null;
  created_at: string;
};

type Trip = {
  id: string;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  total_sale: number;
  currency: string;
  client_id: string | null;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  pax_seniors: number;
};

type Client = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  passport_number: string | null;
  address: Record<string, string> | null;
};

type Passenger = {
  id: string;
  full_name: string;
  document: string | null;
  cpf: string | null;
  birth_date: string | null;
  nationality: string | null;
  email: string | null;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  sent: "info",
  pending_signature: "warning",
  signed: "success",
  cancelled: "danger",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TripContract() {
  const { slug, id: tripId } = useParams({ from: "/agency/$slug/trips/$id/contract" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, destination, travel_start, travel_end, total_sale, currency, client_id, pax_adults, pax_children, pax_infants, pax_seniors")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

  const contractQ = useQuery({
    enabled: !!agency,
    queryKey: ["contract", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Contract | null;
    },
  });

  const clausesQ = useQuery({
    queryKey: ["contract_clauses_template"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contract_template_clauses");
      if (error) throw error;
      return (data ?? []) as Clause[];
    },
  });

  const clientQ = useQuery({
    enabled: !!tripQ.data?.client_id,
    queryKey: ["client", tripQ.data?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, email, phone, cpf, passport_number, address")
        .eq("id", tripQ.data!.client_id!)
        .maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
  });

  const passengersQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("id, full_name, document, cpf, birth_date, nationality, email")
        .eq("trip_id", tripId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Passenger[];
    },
  });

  const agencyQ = useQuery({
    enabled: !!agency,
    queryKey: ["agency_private", agency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_private")
        .select("email, phone, legal_name, document")
        .eq("agency_id", agency!.id)
        .maybeSingle();
      return data;
    },
  });

  // ── State ────────────────────────────────────────────────────────────────────

  const [packageSummary, setPackageSummary] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customClauses, setCustomClauses] = useState<Clause[]>([]);
  const [showClauses, setShowClauses] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);
  const [newClause, setNewClause] = useState({ section: "", clause_text: "" });

  useEffect(() => {
    if (contractQ.data) {
      setPackageSummary(contractQ.data.package_summary ?? "");
      setPaymentTerms(contractQ.data.payment_terms ?? "");
      setCustomClauses(contractQ.data.custom_clauses ?? []);
    } else if (tripQ.data) {
      // Pré-preencher com dados da viagem
      const t = tripQ.data;
      setPackageSummary(
        [
          t.destination ? `Destino: ${t.destination}` : null,
          t.travel_start ? `Partida: ${fmtDate(t.travel_start)}` : null,
          t.travel_end ? `Retorno: ${fmtDate(t.travel_end)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      );
    }
  }, [contractQ.data, tripQ.data]);

  // ── Auto-generate package summary ──────────────────────────────────────────

  const totalPax = useMemo(() => {
    const t = tripQ.data;
    if (!t) return 0;
    return (t.pax_adults ?? 0) + (t.pax_children ?? 0) + (t.pax_infants ?? 0) + (t.pax_seniors ?? 0);
  }, [tripQ.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createContract = useMutation({
    mutationFn: async () => {
      if (!agency || !tripQ.data) throw new Error("Dados insuficientes");

      const client = clientQ.data;
      const pax = passengersQ.data ?? [];
      const clauses = clausesQ.data ?? [];

      const client_data: Record<string, string> = client
        ? {
            name: client.full_name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            cpf: client.cpf ?? "",
            passport_number: client.passport_number ?? "",
            address: client.address
              ? Object.values(client.address).filter(Boolean).join(", ")
              : "",
          }
        : {};

      const agency_data: Record<string, string> = {
        name: agency.name,
        legal_name: agencyQ.data?.legal_name ?? agency.name,
        document: agencyQ.data?.document ?? "",
        email: agencyQ.data?.email ?? "",
        phone: agencyQ.data?.phone ?? "",
      };

      const passengers_data = pax.map((p) => ({
        name: p.full_name,
        document: p.document ?? p.cpf ?? "",
        nationality: p.nationality ?? "",
        birth_date: p.birth_date ?? "",
        email: p.email ?? "",
      }));

      const { data, error } = await supabase
        .from("contracts")
        .insert({
          agency_id: agency.id,
          trip_id: tripId,
          status: "draft",
          package_summary: packageSummary,
          total_value: tripQ.data.total_sale ?? 0,
          payment_terms: paymentTerms,
          fixed_clauses: clauses,
          custom_clauses: customClauses,
          client_data,
          agency_data,
          passengers_data,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Contrato criado com sucesso");
      qc.invalidateQueries({ queryKey: ["contract", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar contrato"),
  });

  const updateContract = useMutation({
    mutationFn: async (patch: Partial<Contract>) => {
      if (!contractQ.data) throw new Error("Contrato não encontrado");
      const { error } = await supabase
        .from("contracts")
        .update(patch as never)
        .eq("id", contractQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato atualizado");
      qc.invalidateQueries({ queryKey: ["contract", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const sendContract = useMutation({
    mutationFn: async () => {
      if (!contractQ.data) throw new Error("Nenhum contrato para enviar");
      const { error } = await supabase
        .from("contracts")
        .update({ status: "pending_signature" } as never)
        .eq("id", contractQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato enviado para assinatura");
      qc.invalidateQueries({ queryKey: ["contract", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const cancelContract = useMutation({
    mutationFn: async () => {
      if (!contractQ.data) throw new Error("Nenhum contrato");
      const { error } = await supabase
        .from("contracts")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
        .eq("id", contractQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato cancelado");
      qc.invalidateQueries({ queryKey: ["contract", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao cancelar"),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────

  const contract = contractQ.data;
  const isSigned = contract?.status === "signed";
  const isEditable = !contract || contract.status === "draft";
  const publicUrl = contract
    ? `${window.location.origin}/m/contract/${contract.public_token}`
    : null;

  if (tripQ.isLoading || contractQ.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!tripQ.data) {
    return <div className="p-6 text-sm text-danger">Viagem não encontrada.</div>;
  }

  const trip = tripQ.data;

  return (
    <>
      {/* ── Back ─────────────────────────────────────────────────────────────── */}
      <Link
        to="/agency/$slug/trips/$id"
        params={{ slug, id: tripId }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar à viagem
      </Link>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{trip.title}</span>
            {contract && (
              <StatusBadge tone={STATUS_TONE[contract.status]}>
                {STATUS_LABEL[contract.status]}
              </StatusBadge>
            )}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Contrato</h1>
          {contract && (
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              v{contract.version} · criado em {fmtDate(contract.created_at)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {publicUrl && (
            <>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link de assinatura
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar
              </a>
            </>
          )}

          {!contract && (
            <PrimaryButton
              onClick={() => createContract.mutate()}
              disabled={createContract.isPending}
            >
              {createContract.isPending ? "Gerando…" : "Gerar Contrato"}
            </PrimaryButton>
          )}

          {contract?.status === "draft" && (
            <>
              <GhostButton
                onClick={() =>
                  updateContract.mutate({
                    package_summary: packageSummary,
                    payment_terms: paymentTerms,
                    custom_clauses: customClauses,
                  } as Partial<Contract>)
                }
                disabled={updateContract.isPending}
              >
                Salvar rascunho
              </GhostButton>
              <PrimaryButton
                onClick={() => sendContract.mutate()}
                disabled={sendContract.isPending}
              >
                <Send className="mr-1.5 h-3.5 w-3.5 inline" />
                Enviar para assinatura
              </PrimaryButton>
            </>
          )}

          {contract?.status === "pending_signature" && (
            <GhostButton
              onClick={() => cancelContract.mutate()}
              disabled={cancelContract.isPending}
              className="text-danger border-danger hover:bg-danger-bg"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5 inline" />
              Cancelar
            </GhostButton>
          )}
        </div>
      </div>

      {/* ── Signed badge ─────────────────────────────────────────────────────── */}
      {isSigned && contract && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-success bg-success-bg px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-success">Contrato assinado digitalmente</div>
            <div className="text-xs text-success/80 mt-0.5">
              Assinado em {fmtDate(contract.signed_at)} · Hash:{" "}
              <span className="font-mono">{contract.signed_hash?.slice(0, 16)}…</span>
              {contract.certificate && (
                <> · Serial: <span className="font-mono">{contract.certificate.serial}</span></>
              )}
            </div>
          </div>
          <a
            href={`/verify/${contract.certificate?.serial}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-success font-medium hover:underline"
          >
            <Shield className="h-3.5 w-3.5" />
            Verificar autenticidade
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Left: contract editor ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Package summary */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Resumo do Pacote</h2>
            <textarea
              rows={4}
              readOnly={!isEditable}
              value={packageSummary}
              onChange={(e) => setPackageSummary(e.target.value)}
              placeholder="Descreva o pacote contratado: destino, datas, serviços incluídos…"
              className="w-full rounded-md border border-input bg-surface p-2.5 text-sm outline-none focus:border-border-strong resize-none disabled:opacity-60"
            />
          </div>

          {/* Payment terms */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Condições de Pagamento</h2>
            <div className="mb-3 rounded-md bg-surface-alt px-3 py-2 text-sm">
              <span className="text-muted-foreground">Valor total: </span>
              <span className="font-semibold font-mono">{money(trip.total_sale, trip.currency)}</span>
              {totalPax > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  · {totalPax} passageiro{totalPax !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              readOnly={!isEditable}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Ex: 50% na assinatura via Pix, saldo 30 dias antes do embarque…"
              className="w-full rounded-md border border-input bg-surface p-2.5 text-sm outline-none focus:border-border-strong resize-none disabled:opacity-60"
            />
          </div>

          {/* Cláusulas personalizadas */}
          {isEditable && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Cláusulas Personalizadas</h2>
                <button
                  onClick={() => setEditingCustom(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>

              {customClauses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sem cláusulas personalizadas. As 49 cláusulas fixas já estão inclusas.
                </p>
              )}

              <div className="space-y-2">
                {customClauses.map((c, i) => (
                  <div key={i} className="flex gap-2 rounded-md border border-border p-2.5 text-xs">
                    <div className="flex-1">
                      <div className="font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                        {c.section}
                      </div>
                      <div>{c.clause_text}</div>
                    </div>
                    <button
                      onClick={() => setCustomClauses(customClauses.filter((_, x) => x !== i))}
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {editingCustom && (
                <div className="mt-3 rounded-md border border-border p-3 space-y-2">
                  <input
                    placeholder="Seção (ex: Responsabilidade)"
                    value={newClause.section}
                    onChange={(e) => setNewClause({ ...newClause, section: e.target.value })}
                    className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong"
                  />
                  <textarea
                    rows={3}
                    placeholder="Texto da cláusula…"
                    value={newClause.clause_text}
                    onChange={(e) => setNewClause({ ...newClause, clause_text: e.target.value })}
                    className="w-full p-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!newClause.section || !newClause.clause_text) return;
                        setCustomClauses([
                          ...customClauses,
                          {
                            number: 50 + customClauses.length,
                            section: newClause.section,
                            clause_text: newClause.clause_text,
                            is_immutable: false,
                          },
                        ]);
                        setNewClause({ section: "", clause_text: "" });
                        setEditingCustom(false);
                      }}
                      className="h-7 rounded bg-primary px-3 text-xs font-medium text-primary-foreground"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => { setEditingCustom(false); setNewClause({ section: "", clause_text: "" }); }}
                      className="h-7 rounded border border-border px-3 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fixed clauses accordion */}
          <div className="rounded-lg border border-border bg-surface">
            <button
              onClick={() => setShowClauses(!showClauses)}
              className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold hover:bg-surface-alt"
            >
              <span>
                Cláusulas Pétreas ({clausesQ.data?.length ?? 49} cláusulas — imutáveis)
              </span>
              {showClauses ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showClauses && (
              <div className="divide-y divide-border border-t border-border">
                {(clausesQ.data ?? []).map((c) => (
                  <div key={c.number} className="px-5 py-3">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Art. {c.number}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {c.section}
                      </span>
                      <Shield className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{c.clause_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: summary panel ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Client info */}
          {clientQ.data && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contratante
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold">{clientQ.data.full_name}</div>
                {clientQ.data.cpf && (
                  <div className="text-muted-foreground">CPF: {clientQ.data.cpf}</div>
                )}
                {clientQ.data.passport_number && (
                  <div className="text-muted-foreground">Passaporte: {clientQ.data.passport_number}</div>
                )}
                {clientQ.data.email && (
                  <div className="text-muted-foreground">{clientQ.data.email}</div>
                )}
                {clientQ.data.phone && (
                  <div className="text-muted-foreground">{clientQ.data.phone}</div>
                )}
              </div>
            </div>
          )}

          {/* Passengers */}
          {passengersQ.data && passengersQ.data.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Passageiros ({passengersQ.data.length})
              </h3>
              <ul className="space-y-1.5">
                {passengersQ.data.map((p) => (
                  <li key={p.id} className="text-xs">
                    <span className="font-medium">{p.full_name}</span>
                    {(p.cpf || p.document) && (
                      <span className="ml-1 text-muted-foreground">
                        · {p.cpf ?? p.document}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trip summary */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Viagem
            </h3>
            <div className="space-y-1.5 text-xs">
              <div><span className="text-muted-foreground">Destino: </span>{trip.destination ?? "—"}</div>
              <div><span className="text-muted-foreground">Embarque: </span>{fmtDate(trip.travel_start)}</div>
              <div><span className="text-muted-foreground">Retorno: </span>{fmtDate(trip.travel_end)}</div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Valor total</span>
                <span className="font-mono font-semibold">{money(trip.total_sale, trip.currency)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          {contract?.signatures && contract.signatures.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assinaturas
              </h3>
              <ul className="space-y-2">
                {contract.signatures.map((s, i) => (
                  <li key={i} className="text-xs">
                    <div className="font-medium">{s.signer_name}</div>
                    <div className="text-muted-foreground">{s.signer_document}</div>
                    <div className="text-muted-foreground">{fmtDate(s.signed_at)}</div>
                    <div className="text-muted-foreground truncate">IP: {s.ip}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning: no client */}
          {!tripQ.data?.client_id && (
            <div className="rounded-lg border border-warning bg-warning-bg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="text-xs text-warning">
                  <div className="font-semibold">Sem cliente vinculado</div>
                  <div className="mt-0.5">
                    Vincule um cliente à viagem antes de gerar o contrato para preencher os dados automaticamente.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
