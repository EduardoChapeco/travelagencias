import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { fmtDate, StatusBadge } from "@/components/ui/form";
import { NewPassengerSheet } from "@/components/trips/NewPassengerSheet";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";

export const Route = createFileRoute("/agency/$slug/trips/$id/passengers")({
  head: () => ({ meta: [{ title: "Passageiros · TravelOS" }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { slug, id } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);

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
          "ocr-passenger-document",
          {
            body: {
              file_base64: fileBase64,
              mime: file.type,
              agency_id: agency.id,
            },
          },
        );
        if (!ocrErr && ocrData?.result) {
          extractedData = ocrData.result;
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Rooming List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os passageiros vinculados a este roteiro e seus documentos operacionais.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-brand-foreground hover:bg-brand/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Adicionar Passageiro
        </button>
      </div>

      {/* ── Banner: Passageiros importados da cotação (aguardando revisão) ─── */}
      {list.data && list.data.some((p: any) => p.notes?.includes("Importado automaticamente")) && (
        <div className="mb-6 rounded-2xl bg-warning/10 border border-warning/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-warning">Passageiros importados da cotação</h4>
              <p className="text-xs text-warning/80 mt-0.5 leading-relaxed">
                {
                  list.data.filter((p: any) => p.notes?.includes("Importado automaticamente"))
                    .length
                }{" "}
                passageiro(s) foram importados automaticamente a partir do formulário do lead.
                Revise os dados, corrija se necessário, e confirme antes do embarque.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => confirmAllImported.mutate()}
              disabled={confirmAllImported.isPending}
              className="h-9 px-4 rounded-xl bg-warning/20 border border-warning/30 text-xs font-bold text-warning hover:bg-warning/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {confirmAllImported.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Confirmar Todos
            </button>
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
              className="h-96 rounded-2xl bg-surface-alt animate-pulse border border-border"
            />
          ))}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface-alt/20 py-24 text-center">
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
              className={`group flex flex-col rounded-2xl border bg-surface transition-colors hover:border-brand/40 ${p.is_lead_passenger ? "border-brand/30" : "border-border"}`}
            >
              {/* Header Card */}
              <div className="flex items-start justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${p.is_lead_passenger ? "bg-brand/10 text-brand" : "bg-surface-alt text-muted-foreground"}`}
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
                        <StatusBadge tone="info">Líder da Reserva</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    confirm({
                      title: "Remover passageiro?",
                      description: `Tem certeza que deseja remover ${p.full_name} desta viagem? Esta ação não pode ser desfeita.`,
                      variant: "destructive",
                      onConfirm: () => remove.mutate(p.id),
                    });
                  }}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 hover:text-danger"
                  title="Remover passageiro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Body Card */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Documentação */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
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
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
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
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
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
                        <Loader2 className="h-3 w-3 animate-spin" /> OCR Ativo...
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
                            className="flex flex-col gap-1 rounded-lg border border-border/60 bg-surface-alt/10 p-2.5 text-xs"
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
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDoc(doc.file_path)}
                                  className="text-muted-foreground hover:text-brand transition-colors p-0.5"
                                  title="Visualizar / Baixar"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
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
                                </button>
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
                  <div className="rounded-xl border border-dashed border-border/80 p-3 bg-surface-alt/5 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={selectedDocType[p.id] || "passport"}
                        onChange={(e) =>
                          setSelectedDocType({ ...selectedDocType, [p.id]: e.target.value as any })
                        }
                        className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] font-medium outline-none text-foreground"
                      >
                        <option value="passport">Passaporte</option>
                        <option value="visa">Visto</option>
                        <option value="ticket">Passagem</option>
                        <option value="other">Outro</option>
                      </select>
                      <input
                        type="date"
                        value={expDates[p.id] || ""}
                        onChange={(e) => setExpDates({ ...expDates, [p.id]: e.target.value })}
                        placeholder="Vencimento"
                        className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] outline-none text-foreground"
                      />
                    </div>
                    <label className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface cursor-pointer text-[10px] font-bold hover:bg-surface-alt transition-colors">
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      Anexar & Extrair Dados
                      <input
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
    </div>
  );
}
