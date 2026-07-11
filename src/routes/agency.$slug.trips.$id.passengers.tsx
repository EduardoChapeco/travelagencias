import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  Contact2,
  ShieldCheck,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import { NewPassengerSheet } from "@/components/trips/NewPassengerSheet";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/agency/$slug/trips/$id/passengers")({
  head: ({ context }: any) => ({ meta: [{ title: `Passageiros · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { slug, id } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [activeReviewPassengerId, setActiveReviewPassengerId] = useState<string | null>(null);

  // Estados para Upload & OCR por passageiro
  const [uploadingPid, setUploadingPid] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<
    Record<string, "passport" | "visa" | "ticket" | "other">
  >({});
  const [expDates, setExpDates] = useState<Record<string, string>>({});

  // 1. Query de Passageiros
  const list = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", id)
        .is("deleted_at", null)
        .order("is_lead_passenger", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // 2. Query da Viagem (para saber a data de embarque/início e lead_id)
  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, travel_start, travel_end, proposal_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // 3. Query dos Documentos de Passageiros cadastrados na viagem
  const docsQ = useQuery({
    enabled: !!agency,
    queryKey: ["passenger-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passenger_documents")
        .select("*")
        .eq("trip_id", id);
      if (error) throw error;
      return data;
    },
  });

  // 4. Mutação para remover passageiro
  const remove = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await supabase
        .from("trip_passengers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passageiro removido.");
      qc.invalidateQueries({ queryKey: ["passengers", id] });
    },
  });

  // 5. Mutação para excluir documento
  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      const { data: doc } = await supabase
        .from("passenger_documents")
        .select("file_path")
        .eq("id", docId)
        .single();

      if (doc?.file_path) {
        await supabase.storage.from("passenger-documents").remove([doc.file_path]);
      }

      const { error } = await supabase.from("passenger_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento excluído.");
      qc.invalidateQueries({ queryKey: ["passenger-documents", id] });
      qc.invalidateQueries({ queryKey: ["passengers", id] });
      qc.invalidateQueries({ queryKey: ["boarding-cards"] });
    },
  });

  // 6. Mutação para confirmar todos os passageiros importados
  const confirmAllImported = useMutation({
    mutationFn: async () => {
      const importedPids =
        list.data
          ?.filter((p: any) => p.notes?.includes("Importado automaticamente"))
          .map((p: any) => p.id) ?? [];

      if (importedPids.length === 0) return;

      const { error } = await supabase
        .from("trip_passengers")
        .update({ notes: "Passageiro revisado e confirmado." } as any)
        .in("id", importedPids);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todos os passageiros foram confirmados!");
      qc.invalidateQueries({ queryKey: ["passengers", id] });
    },
    onError: (err: any) => {
      toast.error("Erro ao confirmar passageiros: " + err.message);
    },
  });

  // Upload & Processamento OCR
  async function handleFileUpload(
    pid: string,
    file: File,
    docType: "passport" | "visa" | "ticket" | "other",
    customExpDate?: string,
  ) {
    if (!agency) return;
    setUploadingPid(pid);
    const toastId = toast.loading("Enviando documento...");
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
      const filePath = `${agency.id}/${id}/${pid}/${filename}`;

      // A. Subir arquivo para o Storage
      const { error: uploadErr } = await supabase.storage
        .from("passenger-documents")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      toast.loading("Analisando documento (OCR)...", { id: toastId });

      // B. Converter para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const b64 = (reader.result as string).split(",")[1];
          resolve(b64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      // C. Chamar Edge Function de OCR
      let extractedData: any = {};
      let expirationDate = customExpDate || null;
      try {
        const { data: ocrData, error: ocrErr } = await supabase.functions.invoke(
          "ai-orchestrator",
          {
            body: {
              action: "completion",
              feature: "ocr_passenger",
              file_base64: fileBase64,
              mime: file.type,
              agency_id: agency.id,
            },
          },
        );
        if (!ocrErr && ocrData?.result) {
          let parsedResult = ocrData.result;
          if (typeof parsedResult === "string") {
            try {
              const cleaned = parsedResult.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
              parsedResult = JSON.parse(cleaned);
            } catch (e) {
              console.warn("Falha no parse fallback de OCR Passenger:", e);
            }
          }
          extractedData = parsedResult;
          if (extractedData.expiration_date) {
            expirationDate = extractedData.expiration_date;
          }
          toast.success("Dados extraídos do documento!", { id: toastId });
        } else {
          console.warn("OCR returned empty or error", ocrErr);
          toast.success("Documento enviado sem extração automática.", { id: toastId });
        }
      } catch (ocrErr) {
        console.warn("OCR function invocation failed", ocrErr);
        toast.success("Documento enviado. (OCR indisponível)", { id: toastId });
      }

      // D. Salvar no banco
      const { error: insertErr } = await supabase.from("passenger_documents").insert({
        trip_id: id,
        passenger_id: pid,
        agency_id: agency.id,
        document_type: docType,
        file_path: filePath,
        extracted_metadata: extractedData,
        expiration_date: expirationDate || null,
      } as any);

      if (insertErr) throw insertErr;

      // Limpar campos
      setExpDates({ ...expDates, [pid]: "" });
      qc.invalidateQueries({ queryKey: ["passenger-documents", id] });
      qc.invalidateQueries({ queryKey: ["passengers", id] });
      qc.invalidateQueries({ queryKey: ["boarding-cards"] }); // atualiza tags operacionais!
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload.", { id: toastId });
    } finally {
      setUploadingPid(null);
    }
  }

  // Visualizar / Baixar Documento Seguro
  async function handleDownloadDoc(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from("passenger-documents")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Erro ao abrir documento: " + err.message);
    }
  }

  const translateKind = (kind: string) => {
    switch (kind) {
      case "adult":
        return "Adulto";
      case "child":
        return "Criança (CHD)";
      case "infant":
        return "Infante (INF)";
      default:
        return kind;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
      <ConfirmDialog />
      {(list.isError || tripQ.isError || docsQ.isError) && (
        <div className="mb-6 flex flex-col items-center justify-center py-10 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60">
          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Passageiros</h3>
          <p className="text-xs text-red-600 mt-1">
            {(list.isError ? list.error : tripQ.isError ? tripQ.error : docsQ.error) instanceof Error
              ? ((list.isError ? list.error : tripQ.isError ? tripQ.error : docsQ.error) as Error).message
              : "Erro desconhecido."}
          </p>
        </div>
      )}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Passageiros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os passageiros vinculados a este roteiro e seus documentos operacionais.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar Passageiro
        </Button>
      </div>

      {/* ── Banner: Passageiros importados da cotação (aguardando revisão) ─── */}
      {list.data && list.data.some((p: any) => p.notes?.includes("Importado automaticamente")) && (
        <div className="mb-6 rounded-[var(--radius-card)] bg-warning/10 border border-warning/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-warning">Passageiros da Proposta</h4>
              <p className="text-xs text-warning/80 mt-0.5 leading-relaxed">
                {
                  list.data.filter((p: any) => p.notes?.includes("Importado automaticamente"))
                    .length
                }{" "}
                passageiro(s) foram associados a partir da proposta. Por favor, revise as
                informações e confirme os dados dos documentos antes do embarque.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => confirmAllImported.mutate()}
              disabled={confirmAllImported.isPending}
              className="h-9 px-4 rounded-[var(--radius-card)] bg-warning/20 border border-warning/30 text-xs font-bold text-warning hover:bg-warning/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {confirmAllImported.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Confirmar Todos
            </Button>
            <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-1 rounded whitespace-nowrap">
              Pendente de Revisão
            </span>
          </div>
        </div>
      )}

      {(list.isLoading || docsQ.isLoading || tripQ.isLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-96 rounded-[var(--radius-card)] glass bg-white/5 border-white/10 animate-pulse border-none"
            />
          ))}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border/80 glass bg-white/5 border-white/10/20 py-24 text-center">
          <Contact2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-bold text-foreground">Nenhum passageiro</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Esta viagem ainda não possui passageiros. Clique em "Adicionar Passageiro" para formar o
            grupo.
          </p>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.data.map((p: any) => (
            <div
              key={p.id}
              className={`group flex flex-col rounded-[var(--radius-card)] border glass-card border-none transition-colors hover:border-brand/40 ${p.is_lead_passenger ? "border-brand/30" : "border-border"}`}
            >
              {/* Header Card */}
              <div className="flex items-start justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${p.is_lead_passenger ? "bg-brand/10 text-brand" : "glass bg-white/5 border-white/10 text-muted-foreground"}`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-foreground">{p.full_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {translateKind(p.kind)}
                      </span>
                      {p.is_lead_passenger && (
                        <StatusBadge tone="info">Responsável pela Proposta</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    confirm({
                      title: "Remover passageiro?",
                      description: `Tem certeza que deseja remover ${p.full_name} desta viagem? Esta ação não pode ser desfeita.`,
                      variant: "destructive",
                      onConfirm: () => remove.mutate(p.id),
                    });
                  }}
                  className="rounded-full p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 hover:text-danger"
                  title="Remover passageiro"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Body Card */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Documentação */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">
                        {p.document_type
                          ? String(p.document_type).toUpperCase()
                          : "Documento Principal"}
                      </div>
                      <div className="text-xs font-mono font-medium truncate">
                        {p.document || "Não informado"}
                      </div>
                    </div>
                  </div>

                  {/* Nascimento e Nacionalidade */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">
                          Nascimento
                        </div>
                        <div className="text-xs font-medium truncate">
                          {p.birth_date ? fmtDate(p.birth_date) : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">
                          Nacionalidade
                        </div>
                        <div className="text-xs font-medium truncate">{p.nationality || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Contato (Se houver) */}
                  {(p.email || p.phone) && (
                    <div className="pt-4 border-t border-border/50 space-y-2">
                      {p.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{p.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Documentos Anexados & Upload Area */}
                <div className="pt-4 border-t border-border/50 space-y-3 mt-4">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1 flex items-center justify-between">
                    <span>Documentos Operacionais</span>
                    {uploadingPid === p.id && (
                      <span className="flex items-center gap-1 text-[10px] text-brand">
                        <Loader2 className="h-3 w-3 animate-spin" /> Leitura Inteligente...
                      </span>
                    )}
                  </div>

                  {/* List of current passenger documents */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {docsQ.data
                      ?.filter((d: any) => d.passenger_id === p.id)
                      .map((doc: any) => {
                        const daysToDeparture =
                          tripQ.data?.travel_start && doc.expiration_date
                            ? Math.ceil(
                                (new Date(doc.expiration_date).getTime() -
                                  new Date(tripQ.data.travel_start).getTime()) /
                                  (1000 * 3600 * 24),
                              )
                            : null;
                        const isExpiringSoon =
                          daysToDeparture !== null && daysToDeparture >= 0 && daysToDeparture < 180; // < 6 months
                        const isExpired = daysToDeparture !== null && daysToDeparture < 0;

                        return (
                          <div
                            key={doc.id}
                            className="flex flex-col gap-1 rounded-[var(--radius-card)] border-none/60 glass bg-white/5 border-white/10/10 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                {doc.document_type === "passport"
                                  ? "Passaporte"
                                  : doc.document_type === "visa"
                                    ? "Visto"
                                    : doc.document_type === "ticket"
                                      ? "Passagem"
                                      : "Outro"}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => handleDownloadDoc(doc.file_path)}
                                  className="text-muted-foreground hover:text-brand transition-colors p-0.5"
                                  title="Visualizar / Baixar"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    confirm({
                                      title: "Excluir documento?",
                                      description:
                                        "Tem certeza que deseja excluir permanentemente este documento?",
                                      variant: "destructive",
                                      onConfirm: () => deleteDoc.mutate(doc.id),
                                    });
                                  }}
                                  className="text-muted-foreground hover:text-danger transition-colors p-0.5"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {doc.expiration_date && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Validade:{" "}
                                {new Date(doc.expiration_date + "T12:00:00").toLocaleDateString(
                                  "pt-BR",
                                )}
                              </div>
                            )}
                            {isExpired && (
                              <div className="flex items-center gap-1 text-[10px] text-danger font-bold mt-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Expirado!
                              </div>
                            )}
                            {isExpiringSoon && !isExpired && (
                              <div className="flex items-center gap-1 text-[9px] text-danger font-bold bg-danger/5 border border-danger/10 rounded px-1.5 py-0.5 mt-1">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Expira em menos de 6 meses no embarque!
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {(!docsQ.data ||
                      docsQ.data.filter((d: any) => d.passenger_id === p.id).length === 0) && (
                      <div className="text-[10px] text-muted-foreground italic py-1">
                        Nenhum anexo cadastrado.
                      </div>
                    )}
                  </div>

                  {/* Document upload form inside the card */}
                  <div className="rounded-[var(--radius-card)] border border-dashed border-border/80 p-3 glass bg-white/5 border-white/10/5 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={selectedDocType[p.id] || "passport"}
                        onChange={(e) =>
                          setSelectedDocType({ ...selectedDocType, [p.id]: e.target.value as any })
                        }
                        className="rounded-full border-none glass-card border-none px-2 text-[10px] font-medium"
                      >
                        <option value="passport">Passaporte</option>
                        <option value="visa">Visto</option>
                        <option value="ticket">Passagem</option>
                        <option value="other">Outro</option>
                      </Select>
                      <Input
                        type="date"
                        value={expDates[p.id] || ""}
                        onChange={(e) => setExpDates({ ...expDates, [p.id]: e.target.value })}
                        placeholder="Vencimento"
                        className="rounded-full border-none glass-card border-none px-2 text-[10px]"
                      />
                    </div>
                    <label className="flex h-8 items-center justify-center gap-1.5 rounded-full border-none glass-card border-none cursor-pointer text-[10px] font-bold hover:glass bg-white/5 border-white/10 transition-colors">
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      Anexar & Identificar Dados
                      <Input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(
                              p.id,
                              e.target.files[0],
                              selectedDocType[p.id] || "passport",
                              expDates[p.id],
                            );
                          }
                        }}
                        disabled={uploadingPid === p.id}
                      />
                    </label>
                  </div>
                  <Button
                    onClick={() => setActiveReviewPassengerId(p.id)}
                    className="w-full flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10 text-xs font-bold transition-all mt-2 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" /> Conferência de Dados
                  </Button>
                </div>
              </div>
            </div>
          ))}
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

      {activeReviewPassengerId && agency && (
        <DataConferencePanel
          passengerId={activeReviewPassengerId}
          tripId={id}
          agencyId={agency.id}
          passengers={list.data || []}
          documents={docsQ.data || []}
          onClose={() => setActiveReviewPassengerId(null)}
          onSaved={() => {
            setActiveReviewPassengerId(null);
            qc.invalidateQueries({ queryKey: ["passengers", id] });
            qc.invalidateQueries({ queryKey: ["passenger-documents", id] });
          }}
        />
      )}
    </div>
  );
}

// ─── Painel Split-Screen de Conferência de Dados (Onboarding) ────────────────
interface DataConferencePanelProps {
  passengerId: string;
  tripId: string;
  agencyId: string;
  passengers: any[];
  documents: any[];
  onClose: () => void;
  onSaved: () => void;
}

function DataConferencePanel({
  passengerId,
  tripId,
  agencyId,
  passengers,
  documents,
  onClose,
  onSaved,
}: DataConferencePanelProps) {
  const passenger = passengers.find((p) => p.id === passengerId);
  const doc = documents?.find((d) => d.passenger_id === passengerId);

  const [fullName, setFullName] = useState(passenger?.full_name || "");
  const [kind, setKind] = useState(passenger?.kind || "adult");
  const [docType, setDocType] = useState(passenger?.document_type || "rg");
  const [docNumber, setDocNumber] = useState(passenger?.document || "");
  const [birthDate, setBirthDate] = useState(passenger?.birth_date || "");
  const [nationality, setNationality] = useState(passenger?.nationality || "");
  const [email, setEmail] = useState(passenger?.email || "");
  const [phone, setPhone] = useState(passenger?.phone || "");
  const [notes, setNotes] = useState(passenger?.notes || "");

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const qc = useQueryClient();

  useEffect(() => {
    if (doc?.file_path) {
      setLoadingUrl(true);
      supabase.storage
        .from("passenger-documents")
        .createSignedUrl(doc.file_path, 3600)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setSignedUrl(data.signedUrl);
          }
          setLoadingUrl(false);
        });
    } else {
      setSignedUrl(null);
    }
  }, [doc?.file_path]);

  async function handleInternalUpload(file: File) {
    setUploading(true);
    const toastId = toast.loading("Enviando documento...");
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
      const filePath = `${agencyId}/${tripId}/${passengerId}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from("passenger-documents")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      toast.loading("Lendo Documento...", { id: toastId });

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const b64 = (reader.result as string).split(",")[1];
          resolve(b64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      let extractedData: any = {};
      let expirationDate = null;
      try {
        const { data: ocrData, error: ocrErr } = await supabase.functions.invoke(
          "ai-orchestrator",
          {
            body: {
              action: "completion",
              feature: "ocr_passenger",
              file_base64: fileBase64,
              mime: file.type,
              agency_id: agencyId,
            },
          },
        );
        if (!ocrErr && ocrData?.result) {
          extractedData = ocrData.result;
          if (extractedData.expiration_date) {
            expirationDate = extractedData.expiration_date;
          }
          if (extractedData.full_name) setFullName(extractedData.full_name);
          if (extractedData.document_number) setDocNumber(extractedData.document_number);
          if (extractedData.birth_date) setBirthDate(extractedData.birth_date);
          if (extractedData.nationality) setNationality(extractedData.nationality);

          toast.success("Dados identificados e preenchidos no cadastro!", { id: toastId });
        } else {
          toast.success("Documento anexado com sucesso.", { id: toastId });
        }
      } catch (ocrErr) {
        toast.success("Documento anexado com sucesso. (Leitura automática indisponível)", {
          id: toastId,
        });
      }

      const { error: insertErr } = await supabase.from("passenger_documents").insert({
        trip_id: tripId,
        passenger_id: passengerId,
        agency_id: agencyId,
        document_type: docType || "passport",
        file_path: filePath,
        extracted_metadata: extractedData,
        expiration_date: expirationDate || null,
      } as any);

      if (insertErr) throw insertErr;
      qc.invalidateQueries({ queryKey: ["passenger-documents", tripId] });
      qc.invalidateQueries({ queryKey: ["passengers", tripId] });
    } catch (err: any) {
      toast.error(err.message || "Erro no envio.", { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("trip_passengers")
        .update({
          full_name: fullName,
          kind,
          document_type: docType,
          document: docNumber,
          birth_date: birthDate || null,
          nationality: nationality || null,
          email: email || null,
          phone: phone || null,
          notes: "Passageiro revisado e confirmado.",
        } as any)
        .eq("id", passengerId);

      if (error) throw error;
      toast.success("Passageiro conferido e salvo com sucesso!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar dados: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!passenger) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-background/90 p-4 md:p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row w-full gap-6 glass-card border-none rounded-[var(--radius-card)] border-none shadow-2xl overflow-hidden container p-0">
        {/* LADO ESQUERDO: Visualizador de Documentos */}
        <div className="flex-1 flex flex-col p-6 border-r border-border/80 glass bg-white/5 border-white/10/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" /> Documento do Passageiro
            </h3>
            {uploading && (
              <span className="text-xs text-brand flex items-center gap-1.5 font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Lendo Documento...
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border/80 glass-card border-none p-4 overflow-hidden relative">
            {loadingUrl ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                Carregando documento...
              </div>
            ) : signedUrl ? (
              doc?.file_path?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={signedUrl} className="w-full h-full rounded-[var(--radius-card)] border-none" />
              ) : (
                <img
                  src={signedUrl}
                  className="max-w-full max-h-[60vh] object-contain rounded-[var(--radius-card)] shadow-none"
                  alt="Documento"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h4 className="text-sm font-bold text-foreground">Nenhum documento anexado</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
                  Anexe o Passaporte, RG ou Visto do passageiro para visualizar aqui durante a
                  conferência.
                </p>
                <label className="flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-card)] bg-brand/10 px-4 text-xs font-bold text-brand hover:bg-brand/20 cursor-pointer transition-all">
                  <Upload className="h-4 w-4" /> Anexar Documento
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleInternalUpload(e.target.files[0]);
                      }
                    }}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>

          {doc?.extracted_metadata && Object.keys(doc.extracted_metadata).length > 0 && (
            <div className="mt-4 p-4 rounded-[var(--radius-card)] border-none glass-card border-none text-xs">
              <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Dados Identificados pela
                Inteligência Artificial
              </h4>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {Object.entries(doc.extracted_metadata).map(([key, val]) => (
                  <div key={key} className="glass bg-white/5 border-white/10/50 p-2 rounded border-none/40">
                    <span className="font-semibold text-muted-foreground block uppercase text-[8px] tracking-wider">
                      {key.replace("_", " ")}
                    </span>
                    <span className="font-mono text-foreground text-xs">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: Form de CRUD/CMS (Edição) */}
        <div className="w-full md:w-[480px] flex flex-col p-6 glass-card border-none overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Conferência de Cadastro</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revise e corrija os dados cadastrais do passageiro.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold glass bg-white/5 border-white/10 px-3 py-1.5 rounded-[var(--radius-card)]"
            >
              Fechar
            </Button>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Nome Completo
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Tipo de Passageiro
              </label>
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
              >
                <option value="adult">Adulto</option>
                <option value="child">Criança (CHD)</option>
                <option value="infant">Infante (INF)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Tipo Documento
                </label>
                <Select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                >
                  <option value="rg">RG</option>
                  <option value="cpf">CPF</option>
                  <option value="passport">Passaporte</option>
                  <option value="visa">Visto</option>
                  <option value="other">Outro</option>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Número Documento
                </label>
                <Input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Nascimento
                </label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Nacionalidade
                </label>
                <Input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Brasileira"
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Telefone
                </label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Observações Operacionais
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Necessita de cadeira de rodas para embarque"
                className="h-20 w-full rounded-[var(--radius-card)] border-none glass-card border-none p-3 focus:border-brand resize-none"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-6 flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 h-10 rounded-[var(--radius-card)] border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 h-10 rounded-[var(--radius-card)] bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Salvar & Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
