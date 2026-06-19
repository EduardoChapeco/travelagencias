import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Shield,
  Copy,
  Download,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PrimaryButton, GhostButton, StatusBadge, money, fmtDate } from "@/components/ui/form";
import JSZip from "jszip";

// Import decomposed components
import { ContractEditor, type Clause } from "@/components/trips/contract/ContractEditor";
import { ContractAddendums } from "@/components/trips/contract/ContractAddendums";
import { ContractSidebar } from "@/components/trips/contract/ContractSidebar";
import { ContractSignatureControl } from "@/components/trips/contract/ContractSignatureControl";

export const Route = createFileRoute("/agency/$slug/trips/$id/contract")({
  head: () => ({ meta: [{ title: "Contrato · TravelOS" }] }),
  component: TripContract,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Contract = {
  id: string;
  trip_id: string;
  agency_id: string;
  version: string;
  status: "draft" | "sent" | "pending_signature" | "signed" | "cancelled" | "viewed";
  package_summary: string | null;
  total_value: number;
  payment_terms: string | null;
  fixed_clauses: Clause[];
  custom_clauses: Clause[];
  client_data: any[];
  passengers_data: Array<Record<string, string>>;
  agency_data: Record<string, string>;
  signatures: Array<{
    signer_name: string;
    signer_document: string;
    signed_at: string;
    ip: string;
    user_agent?: string;
    signature_image?: string;
    selfie_image?: string;
    doc_front?: string;
    doc_back?: string;
    video_kyc?: string;
  }>;
  certificate: { serial: string; issued_at: string } | null;
  content_hash: string | null;
  signed_hash: string | null;
  public_token: string;
  signed_at: string | null;
  created_at: string;
  viewed_at?: string | null;
  last_viewed_at?: string | null;
  view_count?: number;
  pdf_url?: string | null;
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
  viewed: "Visualizado",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  sent: "info",
  viewed: "warning",
  pending_signature: "warning",
  signed: "success",
  cancelled: "danger",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TripContract() {
  const { slug, id: tripId } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, title, destination, travel_start, travel_end, total_sale, currency, client_id, pax_adults, pax_children, pax_infants, pax_seniors",
        )
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
    enabled: !!agency,
    queryKey: ["contract_clauses_template", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_clauses")
        .select("id, title, body, kind, is_default, is_active, order_index")
        .or(`agency_id.is.null,agency_id.eq.${agency!.id}`)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      // Map to the Clause format expected by ContractEditor
      return (data ?? []).map((c, idx) => ({
        number: idx + 1,
        section: c.title,
        clause_text: c.body,
        is_immutable: c.is_default && c.kind !== "custom",
      })) as Clause[];
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

  const auditChainQ = useQuery({
    enabled: !!contractQ.data?.id,
    queryKey: ["contract_audit_chain", contractQ.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_audit_chain")
        .select("*")
        .eq("contract_id", contractQ.data!.id)
        .order("id", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addendumsQ = useQuery({
    enabled: !!contractQ.data?.id,
    queryKey: ["contract_addendums", contractQ.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_addendums")
        .select("*")
        .eq("contract_id", contractQ.data!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ── State ────────────────────────────────────────────────────────────────────

  const [packageSummary, setPackageSummary] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customClauses, setCustomClauses] = useState<Clause[]>([]);
  const [clientData, setClientData] = useState<any[]>([]);

  useEffect(() => {
    if (contractQ.data) {
      setPackageSummary(contractQ.data.package_summary ?? "");
      setPaymentTerms(contractQ.data.payment_terms ?? "");
      setCustomClauses(contractQ.data.custom_clauses ?? []);

      const cData = contractQ.data.client_data;
      if (Array.isArray(cData)) {
        setClientData(cData);
      } else if (cData && typeof cData === "object") {
        setClientData([cData]);
      } else {
        setClientData([]);
      }
    } else if (tripQ.data) {
      const t = tripQ.data;
      setPackageSummary(
        [
          t.destination ? `Destino: ${t.destination}` : null,
          t.travel_start ? `Partida: ${fmtDate(t.travel_start)}` : null,
          t.travel_end ? `Retorno: ${fmtDate(t.travel_end)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      if (clientQ.data) {
        const client = clientQ.data;
        setClientData([
          {
            name: client.full_name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            cpf: client.cpf ?? "",
            passport_number: client.passport_number ?? "",
            address: client.address ? Object.values(client.address).filter(Boolean).join(", ") : "",
          },
        ]);
      }
    }
  }, [contractQ.data, tripQ.data, clientQ.data]);

  // ── Auto-generate package summary ──────────────────────────────────────────

  const totalPax = useMemo(() => {
    const t = tripQ.data;
    if (!t) return 0;
    return (
      (t.pax_adults ?? 0) + (t.pax_children ?? 0) + (t.pax_infants ?? 0) + (t.pax_seniors ?? 0)
    );
  }, [tripQ.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createContract = useMutation({
    mutationFn: async () => {
      if (!agency || !tripQ.data) throw new Error("Dados insuficientes");

      const pax = passengersQ.data ?? [];
      const clauses = clausesQ.data ?? [];

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
          client_data: clientData,
          agency_data,
          passengers_data,
          // Fase 5: snapshot imutável das cláusulas no momento da criação
          clause_snapshot: JSON.stringify({
            fixed: clauses,
            custom: customClauses,
            captured_at: new Date().toISOString(),
            clause_count: clauses.length + customClauses.length,
          }),
          is_custom_clauses: customClauses.length > 0,
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

  const fetchBlob = async (pathOrUrl: string) => {
    if (pathOrUrl.startsWith("http")) {
      const res = await fetch(pathOrUrl);
      return await res.blob();
    } else {
      const { data, error } = await supabase.storage.from("contract-pdfs").download(pathOrUrl);
      if (error) throw error;
      return data;
    }
  };

  const handleDownloadZip = async () => {
    const contract = contractQ.data;
    if (!contract) return;
    toast.loading("Preparando pacote de validação...", { id: "zip" });
    try {
      const zip = new JSZip();

      if (contract.pdf_url) {
        try {
          const pdfBlob = await fetchBlob(contract.pdf_url);
          zip.file("contrato-assinado.pdf", pdfBlob);
        } catch (e) {
          console.error("Falha ao baixar PDF do contrato:", e);
        }
      }

      if (contract.signatures) {
        for (let i = 0; i < contract.signatures.length; i++) {
          const sig = contract.signatures[i];
          const prefix = `assinante_${i + 1}_${sig.signer_name.toLowerCase().replace(/\s+/g, "_")}`;

          if (sig.signature_image) {
            try {
              const blob = await fetchBlob(sig.signature_image);
              zip.file(`${prefix}_assinatura.png`, blob);
            } catch (e) {
              console.error(e);
            }
          }
          if (sig.selfie_image) {
            try {
              const blob = await fetchBlob(sig.selfie_image);
              zip.file(`${prefix}_selfie.jpg`, blob);
            } catch (e) {
              console.error(e);
            }
          }
          if (sig.doc_front) {
            try {
              const blob = await fetchBlob(sig.doc_front);
              zip.file(`${prefix}_doc_frente.jpg`, blob);
            } catch (e) {
              console.error(e);
            }
          }
          if (sig.doc_back) {
            try {
              const blob = await fetchBlob(sig.doc_back);
              zip.file(`${prefix}_doc_verso.jpg`, blob);
            } catch (e) {
              console.error(e);
            }
          }
          if (sig.video_kyc) {
            try {
              const blob = await fetchBlob(sig.video_kyc);
              zip.file(`${prefix}_video_kyc.webm`, blob);
            } catch (e) {
              console.error(e);
            }
          }
        }
      }

      let manifestText = `==================================================\n`;
      manifestText += `MANIFESTO DE VALIDAÇÃO JURÍDICA E AUDITORIA\n`;
      manifestText += `TravelOS Digital Trust Services\n`;
      manifestText += `==================================================\n\n`;
      manifestText += `CONTRATO ID: ${contract.id}\n`;
      manifestText += `Versão: ${contract.version}\n`;
      manifestText += `Status: ${contract.status.toUpperCase()}\n`;
      manifestText += `Valor Total: ${contract.total_value}\n`;
      manifestText += `Criado em: ${new Date(contract.created_at).toLocaleString("pt-BR")}\n`;
      if (contract.signed_at) {
        manifestText += `Assinado em: ${new Date(contract.signed_at).toLocaleString("pt-BR")}\n`;
      }
      if (contract.certificate) {
        manifestText += `Serial de Autenticidade: ${contract.certificate.serial}\n`;
        manifestText += `Hash do Conteúdo: ${contract.content_hash}\n`;
      }

      manifestText += `\n--------------------------------------------------\n`;
      manifestText += `SIGNATÁRIOS E ASSINATURAS:\n`;
      manifestText += `--------------------------------------------------\n`;

      if (contract.signatures) {
        contract.signatures.forEach((sig, index) => {
          manifestText += `\n[Assinante #${index + 1}]\n`;
          manifestText += `Nome: ${sig.signer_name}\n`;
          manifestText += `Documento: ${sig.signer_document}\n`;
          manifestText += `Data/Hora: ${new Date(sig.signed_at).toLocaleString("pt-BR")}\n`;
          manifestText += `IP: ${sig.ip}\n`;
          manifestText += `Dispositivo: ${sig.user_agent || "N/A"}\n`;
        });
      } else {
        manifestText += `\nNenhuma assinatura registrada até o momento.\n`;
      }

      if (auditChainQ.data && auditChainQ.data.length > 0) {
        manifestText += `\n--------------------------------------------------\n`;
        manifestText += `CADEIA DE AUDITORIA CRIPTOGRÁFICA (LEDGER):\n`;
        manifestText += `--------------------------------------------------\n`;
        auditChainQ.data.forEach((audit: any) => {
          manifestText += `\n[ID #${audit.id}] Ação: ${audit.action}\n`;
          manifestText += `Data: ${new Date(audit.created_at).toLocaleString("pt-BR")}\n`;
          manifestText += `Metadata: ${JSON.stringify(audit.metadata)}\n`;
          manifestText += `Hash Anterior: ${audit.prev_hash || "GENESIS"}\n`;
          manifestText += `Hash do Bloco: ${audit.row_hash}\n`;
        });
      }

      zip.file("manifesto_auditoria.txt", manifestText);

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pacote-auditoria-contrato-${contract.id.slice(0, 8)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Pacote de validação ZIP baixado!", { id: "zip" });
    } catch (e: any) {
      console.error("Erro ao gerar pacote ZIP:", e);
      toast.error("Erro ao gerar pacote ZIP: " + e.message, { id: "zip" });
    }
  };

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
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
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
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Contrato</h1>
          {contract && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground font-mono">
              <span>v{contract.version}</span>
              <span>·</span>
              <span>criado em {fmtDate(contract.created_at)}</span>
              {contract.view_count !== undefined && contract.view_count > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-warning">
                    <Eye className="h-3 w-3" />
                    Visualizado {contract.view_count} {contract.view_count === 1 ? "vez" : "vezes"}
                  </span>
                </>
              )}
              {contract.last_viewed_at && (
                <>
                  <span>·</span>
                  <span>Último acesso: {fmtDate(contract.last_viewed_at)}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {publicUrl && (
            <>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copiado");
                }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-alt text-foreground bg-surface"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link de assinatura
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-alt text-foreground bg-surface animate-pulse"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar Link
              </a>
            </>
          )}

          {contract?.status === "signed" && (
            <button
              onClick={handleDownloadZip}
              className="flex h-8 items-center gap-1.5 rounded-md border border-success bg-success/10 text-success px-3 text-xs font-semibold hover:bg-success/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Pacote (ZIP)
            </button>
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
                    client_data: clientData,
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
              className="text-danger border-danger hover:bg-danger-bg font-bold"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5 inline" />
              Cancelar Contrato
            </GhostButton>
          )}
        </div>
      </div>

      {/* ── Signed badge ─────────────────────────────────────────────────────── */}
      {isSigned && contract && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-success bg-success-bg px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-success">Contrato assinado digitalmente</div>
            <div className="text-xs text-success/80 mt-0.5 font-medium">
              Assinado em {fmtDate(contract.signed_at)} · Hash:{" "}
              <span className="font-mono">{contract.signed_hash?.slice(0, 16)}…</span>
              {contract.certificate && (
                <>
                  {" "}
                  · Serial: <span className="font-mono">{contract.certificate.serial}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 text-xs text-success font-bold border border-success/30 bg-success/10 px-3 py-1.5 rounded hover:bg-success/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Pacote ZIP
            </button>
            <a
              href={`/verify/${contract.certificate?.serial}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-success font-bold hover:underline"
            >
              <Shield className="h-3.5 w-3.5" />
              Verificar autenticidade
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Left: contract editor ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <ContractEditor
            isEditable={isEditable}
            packageSummary={packageSummary}
            setPackageSummary={setPackageSummary}
            paymentTerms={paymentTerms}
            setPaymentTerms={setPaymentTerms}
            customClauses={customClauses}
            setCustomClauses={setCustomClauses}
            fixedClauses={clausesQ.data ?? []}
            tripTotal={trip.total_sale}
            tripCurrency={trip.currency}
            totalPax={totalPax}
            clientData={clientData}
            setClientData={setClientData}
          />

          {contract && (
            <ContractAddendums
              contractId={contract.id}
              contractStatus={contract.status}
              addendums={addendumsQ.data ?? []}
            />
          )}
        </div>

        {/* ── Right: summary panel ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <ContractSidebar
            client={clientQ.data}
            passengers={passengersQ.data ?? []}
            trip={trip}
            totalPax={totalPax}
          />

          {contract && (
            <ContractSignatureControl
              contract={contract}
              auditChain={auditChainQ.data ?? []}
              isLoadingAudit={auditChainQ.isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
