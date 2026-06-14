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
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Eye,
  FileCheck,
  History,
  Clock,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PrimaryButton, GhostButton, StatusBadge, money, fmtDate, Input, Field } from "@/components/ui/form";
import JSZip from "jszip";

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
  status: "draft" | "sent" | "pending_signature" | "signed" | "cancelled" | "viewed";
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
  const { slug, id: tripId } = useParams({ strict: false }) as { slug: string; id: string };
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
  const [showClauses, setShowClauses] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);
  const [newClause, setNewClause] = useState({ section: "", clause_text: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addendumTitle, setAddendumTitle] = useState("");
  const [addendumContent, setAddendumContent] = useState("");

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
          .join(" · "),
      );
    }
  }, [contractQ.data, tripQ.data]);

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
            address: client.address ? Object.values(client.address).filter(Boolean).join(", ") : "",
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

  const createAddendum = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const contract = contractQ.data;
      if (!contract) throw new Error("Sem contrato ativo");
      const { data, error } = await supabase
        .from("contract_addendums")
        .insert({
          contract_id: contract.id,
          title,
          content,
          status: "pending_signature",
        })
        .select("*")
        .single();
      if (error) throw error;

      // Cria log na cadeia de auditoria blockchain
      const { error: auditErr } = await supabase
        .from("contract_audit_chain")
        .insert({
          contract_id: contract.id,
          action: "ADDENDUM_CREATED",
          metadata: { addendum_id: data.id, title },
        });
      if (auditErr) console.warn("Erro ao registrar auditoria de aditivo:", auditErr);

      return data;
    },
    onSuccess: () => {
      toast.success("Aditivo criado com sucesso e enviado para assinatura", { id: "addendum" });
      qc.invalidateQueries({ queryKey: ["contract_addendums", contractQ.data?.id] });
      qc.invalidateQueries({ queryKey: ["contract_audit_chain", contractQ.data?.id] });
      setAddendumTitle("");
      setAddendumContent("");
      setShowAddForm(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar aditivo", { id: "addendum" }),
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
      
      // 1. Baixar PDF do Contrato
      if (contract.pdf_url) {
        try {
          const pdfBlob = await fetchBlob(contract.pdf_url);
          zip.file("contrato-assinado.pdf", pdfBlob);
        } catch (e) {
          console.error("Falha ao baixar PDF do contrato:", e);
        }
      }
      
      // 2. Baixar documentos KYC dos assinantes
      if (contract.signatures) {
        for (let i = 0; i < contract.signatures.length; i++) {
          const sig = contract.signatures[i];
          const prefix = `assinante_${i + 1}_${sig.signer_name.toLowerCase().replace(/\s+/g, "_")}`;
          
          if (sig.signature_image) {
            try {
              const blob = await fetchBlob(sig.signature_image);
              zip.file(`${prefix}_assinatura.png`, blob);
            } catch (e) { console.error(e); }
          }
          if (sig.selfie_image) {
            try {
              const blob = await fetchBlob(sig.selfie_image);
              zip.file(`${prefix}_selfie.jpg`, blob);
            } catch (e) { console.error(e); }
          }
          if (sig.doc_front) {
            try {
              const blob = await fetchBlob(sig.doc_front);
              zip.file(`${prefix}_doc_frente.jpg`, blob);
            } catch (e) { console.error(e); }
          }
          if (sig.doc_back) {
            try {
              const blob = await fetchBlob(sig.doc_back);
              zip.file(`${prefix}_doc_verso.jpg`, blob);
            } catch (e) { console.error(e); }
          }
          if (sig.video_kyc) {
            try {
              const blob = await fetchBlob(sig.video_kyc);
              zip.file(`${prefix}_video_kyc.webm`, blob);
            } catch (e) { console.error(e); }
          }
        }
      }
      
      // 3. Montar manifesto de validação (manifesto.txt)
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
              className="flex items-center gap-1.5 text-xs text-success font-semibold border border-success/30 bg-success/10 px-3 py-1.5 rounded hover:bg-success/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Pacote ZIP
            </button>
            <a
              href={`/verify/${contract.certificate?.serial}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-success font-medium hover:underline"
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
              <span className="font-semibold font-mono">
                {money(trip.total_sale, trip.currency)}
              </span>
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
                      onClick={() => {
                        setEditingCustom(false);
                        setNewClause({ section: "", clause_text: "" });
                      }}
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
              <span>Cláusulas Pétreas ({clausesQ.data?.length ?? 49} cláusulas — imutáveis)</span>
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

          {/* Aditivos do Contrato */}
          {contract && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Aditivos e Retificações</h2>
                {contract.status === "signed" && !showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Aditivo
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className="mb-4 rounded-xl border border-border p-4 space-y-4 bg-surface-alt/20">
                  <h3 className="text-xs font-bold text-foreground">Novo Aditivo ao Contrato</h3>
                  <Field label="Título do Aditivo">
                    <Input
                      placeholder="Ex: Alteração de Data de Embarque ou Upgrade de Hotel"
                      value={addendumTitle}
                      onChange={(e) => setAddendumTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="Conteúdo do Acordo (Cláusulas Adicionais)">
                    <textarea
                      rows={4}
                      placeholder="Descreva detalhadamente o acordo complementar..."
                      value={addendumContent}
                      onChange={(e) => setAddendumContent(e.target.value)}
                      className="w-full rounded-md border border-input bg-surface p-2.5 text-xs outline-none focus:border-border-strong resize-none"
                    />
                  </Field>
                  <div className="flex gap-2">
                    <PrimaryButton
                      disabled={createAddendum.isPending || !addendumTitle || !addendumContent}
                      onClick={() => createAddendum.mutate({ title: addendumTitle, content: addendumContent })}
                    >
                      {createAddendum.isPending ? "Criando..." : "Enviar Aditivo"}
                    </PrimaryButton>
                    <GhostButton onClick={() => { setShowAddForm(false); setAddendumTitle(""); setAddendumContent(""); }}>
                      Cancelar
                    </GhostButton>
                  </div>
                </div>
              )}

              {addendumsQ.isLoading && <p className="text-xs text-muted-foreground">Carregando aditivos...</p>}

              {(!addendumsQ.data || addendumsQ.data.length === 0) && (
                <p className="text-xs text-muted-foreground">Nenhum termo aditivo registrado para este contrato.</p>
              )}

              {addendumsQ.data && addendumsQ.data.length > 0 && (
                <div className="space-y-3">
                  {addendumsQ.data.map((ad: any) => (
                    <div key={ad.id} className="rounded-xl border border-border/60 bg-surface-alt/10 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{ad.title}</span>
                        <StatusBadge tone={STATUS_TONE[ad.status] || "neutral"}>
                          {STATUS_LABEL[ad.status] || ad.status}
                        </StatusBadge>
                      </div>
                      <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{ad.content}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-2 font-mono">
                        <span>Criado: {new Date(ad.created_at).toLocaleDateString("pt-BR")}</span>
                        {ad.signed_at && (
                          <span className="text-success font-semibold">Assinado: {new Date(ad.signed_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                  <div className="text-muted-foreground">
                    Passaporte: {clientQ.data.passport_number}
                  </div>
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
                      <span className="ml-1 text-muted-foreground">· {p.cpf ?? p.document}</span>
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
              <div>
                <span className="text-muted-foreground">Destino: </span>
                {trip.destination ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Embarque: </span>
                {fmtDate(trip.travel_start)}
              </div>
              <div>
                <span className="text-muted-foreground">Retorno: </span>
                {fmtDate(trip.travel_end)}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Valor total</span>
                <span className="font-mono font-semibold">
                  {money(trip.total_sale, trip.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Controle de Assinaturas */}
          {contract && (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> Controle de Assinaturas
              </h3>
              <div className="rounded-xl border border-border/50 bg-surface-alt/30 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">{contract.client_data?.name || "Cliente Contratante"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {contract.client_data?.document || contract.client_data?.cpf || "Sem doc informado"}
                    </div>
                  </div>
                  <div>
                    {contract.status === "signed" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                        Assinado
                      </span>
                    ) : contract.status === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
                        Cancelado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning animate-pulse">
                        Aguardando
                      </span>
                    )}
                  </div>
                </div>

                {contract.signatures && contract.signatures.map((sig, i) => (
                  <div key={i} className="mt-3 border-t border-border/40 pt-2.5 space-y-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>IP: <strong className="font-mono text-foreground/80">{sig.ip}</strong></span>
                      <span>{new Date(sig.signed_at).toLocaleDateString("pt-BR")} {new Date(sig.signed_at).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="truncate" title={sig.user_agent}>UA: {sig.user_agent || "Desconhecido"}</div>
                    
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sig.selfie_image && (
                        <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                          ✓ Selfie KYC
                        </span>
                      )}
                      {sig.doc_front && (
                        <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                          ✓ Doc (Frente)
                        </span>
                      )}
                      {sig.doc_back && (
                        <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                          ✓ Doc (Verso)
                        </span>
                      )}
                      {sig.video_kyc && (
                        <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                          ✓ Vídeo KYC
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cadeia de Auditoria Criptográfica (Ledger) */}
          {contract && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4" /> Cadeia de Auditoria (Ledger)
              </h3>
              
              {auditChainQ.isLoading && <p className="text-[10px] text-muted-foreground">Carregando auditoria...</p>}

              {auditChainQ.data && auditChainQ.data.length > 0 ? (
                <div className="relative border-l border-border/60 pl-3.5 space-y-4 ml-1">
                  {auditChainQ.data.map((audit: any) => {
                    let icon = <Clock className="h-3 w-3 text-muted-foreground" />;
                    let actionLabel = audit.action;
                    if (audit.action === "CONTRACT_SIGNED") {
                      icon = <UserCheck className="h-3 w-3 text-success" />;
                      actionLabel = "Contrato Assinado";
                    } else if (audit.action === "ADDENDUM_CREATED") {
                      icon = <FileText className="h-3 w-3 text-info" />;
                      actionLabel = "Aditivo Registrado";
                    } else if (audit.action === "ADDENDUM_SIGNED") {
                      icon = <FileCheck className="h-3 w-3 text-success" />;
                      actionLabel = "Aditivo Assinado";
                    } else if (audit.action === "CONTRACT_CREATED") {
                      actionLabel = "Contrato Inicial";
                    }

                    return (
                      <div key={audit.id} className="relative text-[10px]">
                        {/* Bullet */}
                        <div className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface ring-2 ring-border/50">
                          {icon}
                        </div>
                        <div className="font-semibold text-foreground/90">{actionLabel}</div>
                        <div className="text-muted-foreground font-mono text-[9px] mt-0.5">
                          Block #{audit.id} · {audit.row_hash?.slice(0, 8)}...
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {new Date(audit.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Nenhum evento registrado no livro razão.</p>
              )}
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
                    Vincule um cliente à viagem antes de gerar o contrato para preencher os dados
                    automaticamente.
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
