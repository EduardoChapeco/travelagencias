import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  Globe,
  User,
  Clock,
} from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";

const STEPS = ["Requerente", "Logística", "Upload Seguro", "Revisão"];

type DocumentUpload = {
  file: File;
  title: string;
};

export function NewVisaWizard({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clientId, setClientId] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("Turismo");
  const [expectedDate, setExpectedDate] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [notes, setNotes] = useState("");

  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const clientsQ = useQuery({
    queryKey: ["clients-minimal", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agencyId)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const stagesQ = useQuery({
    queryKey: ["visa-stages", agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("visa_stages")
        .select("*")
        .eq("agency_id", agencyId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const handleNext = () => {
    if (step === 0 && (!clientId || !country)) {
      toast.error("Preencha o cliente e destino para continuar.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newDocs = Array.from(e.target.files).map((file) => ({
        file,
        title: file.name,
      }));
      setDocuments([...documents, ...newDocs]);
    }
  };

  const removeDoc = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocTitle = (index: number, title: string) => {
    setDocuments(documents.map((d, i) => (i === index ? { ...d, title } : d)));
  };

  async function submit() {
    if (!clientId || !country) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const firstStageId = stagesQ.data?.[0]?.id;
    if (!firstStageId) {
      toast.error("Nenhum estágio configurado. Recarregue a página.");
      return;
    }

    setSubmitting(true);

    // 1. Criar Visto
    const { data: visaData, error: visaError } = await (supabase as any)
      .from("visas")
      .insert({
        agency_id: agencyId,
        client_id: clientId,
        stage_id: firstStageId,
        country,
        category,
        expected_date: expectedDate || null,
        interview_date: interviewDate || null,
        notes,
      })
      .select("id")
      .single();

    if (visaError || !visaData) {
      toast.error(visaError?.message || "Erro ao criar visto");
      setSubmitting(false);
      return;
    }

    // 1.5 Auto-create Lead for this Visa
    try {
      const { data: crmStages } = await supabase
        .from("lead_stages")
        .select("id")
        .eq("agency_id", agencyId)
        .order("position")
        .limit(1);

      if (crmStages && crmStages.length > 0) {
        const client = clientsQ.data?.find((c) => c.id === clientId);
        const { data: userData } = await supabase.auth.getUser();

        await supabase.from("leads").insert({
          agency_id: agencyId,
          stage_id: crmStages[0].id,
          owner_id: userData.user?.id,
          client_id: clientId,
          name: client?.full_name || "Novo Cliente (Visto)",
          destination: country,
          pax_count: 1,
          interest_type: "visa",
          source: "internal",
          notes: `Lead criado automaticamente via Solicitação de Visto (${category}).\n${notes}`,
        });
      }
    } catch (err) {
      console.warn("Falha ao criar lead automático:", err);
    }

    // 2. Upload Documentos
    if (documents.length > 0) {
      setUploading(true);
      for (const doc of documents) {
        const fileExt = doc.file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${agencyId}/${visaData.id}/${fileName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("visa_documents")
            .upload(filePath, doc.file);

          if (!uploadError) {
            await (supabase as any).from("visa_documents").insert({
              agency_id: agencyId,
              visa_id: visaData.id,
              title: doc.title,
              file_url: filePath, // Gravamos o caminho, a app deve gerar URL assinada ou baixar
            });
          }
        } catch (e) {
          console.error("Erro no upload do doc", e);
        }
      }
    }

    setSubmitting(false);
    toast.success("Processo consular iniciado com sucesso!");
    onCreated();
  }

  const selectedClient = clientsQ.data?.find((c) => c.id === clientId);

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Novo Processo Consular"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="px-6 pt-4 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          Gestão profissional de vistos e passaportes.
        </p>
      </div>

      {/* Stepper progress */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-8 py-3 shrink-0">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 ${i === step ? "opacity-100" : "opacity-40"}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                    ? "bg-brand text-brand-foreground"
                    : "bg-surface-alt text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-semibold uppercase tracking-widest hidden md:block ${
                i < step ? "text-success" : i === step ? "text-brand" : "text-muted-foreground"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface/30 min-h-0">
        <div className="mx-auto max-w-xl space-y-6">
          {/* STEP 0: Requerente */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Field label="Cliente (Requerente) *">
                <SearchableSelect
                  value={clientId}
                  onChange={setClientId}
                  placeholder="Buscar cliente da agência..."
                  searchPlaceholder="Nome, CPF..."
                  options={clientsQ.data?.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    sublabel: c.document ?? undefined,
                  }))}
                  loading={clientsQ.isLoading}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="País de Destino *">
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Ex: Estados Unidos"
                  />
                </Field>
                <Field label="Categoria do Visto">
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Turismo">Turismo</option>
                    <option value="Estudante">Estudante</option>
                    <option value="Trabalho / Negócios">Trabalho / Negócios</option>
                    <option value="Residência">Residência</option>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1: Logística */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Data Esperada da Viagem (Opcional)">
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </Field>
                <Field label="Data Agendada da Entrevista (Opcional)">
                  <Input
                    type="datetime-local"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Observações e Histórico Consular">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Ex: Cliente teve visto negado em 2018. Precisa de assessoria reforçada de DS-160."
                />
              </Field>
            </div>
          )}

          {/* STEP 2: Uploads Seguros */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-[24px] border border-warning/30 bg-warning/5 p-4 text-sm text-warning-foreground">
                <strong>Aviso LGPD:</strong> O upload de passaportes e documentos sensíveis é
                protegido. Os arquivos serão enviados para um cofre digital isolado e restrito
                apenas a membros autorizados da agência.
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label
                    htmlFor="doc-upload"
                    className="flex flex-col items-center justify-center w-full h-32 rounded-[24px] border-2 border-dashed border-border/60 bg-surface hover:border-brand/50 hover:bg-brand/5 cursor-pointer transition-colors"
                  >
                    <Upload className="h-6 w-6 text-brand mb-2" />
                    <span className="text-sm font-semibold text-brand">
                      Clique para anexar Documentos
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Passaporte, Comprovantes de Renda, Vínculo
                    </span>
                  </label>
                </div>

                <div className="space-y-2 mt-4">
                  {documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-surface-alt/50 border border-border p-3 rounded-2xl"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Input
                          value={doc.title}
                          onChange={(e) => updateDocTitle(idx, e.target.value)}
                          className="h-8 text-sm bg-surface"
                          placeholder="Nome do documento"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {(doc.file.size / 1024).toFixed(1)} KB - {doc.file.name}
                        </p>
                      </div>
                      <button
                        onClick={() => removeDoc(idx)}
                        className="text-danger hover:bg-danger/10 p-2 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Revisão */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-[24px] border border-border bg-surface-alt/20 p-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-brand" /> {country} ({category})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedClient?.full_name || "Cliente não encontrado"}
                    </span>
                  </div>
                  {expectedDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Viagem:</span>
                      <span className="font-medium">
                        {new Date(expectedDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>

                {documents.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Documentos Anexados
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {documents.map((d, i) => (
                        <span
                          key={i}
                          className="bg-surface border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                        >
                          <FileText className="h-3 w-3 text-brand" /> {d.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4 shrink-0">
        <GhostButton onClick={handleBack} disabled={step === 0} className="gap-2 w-28">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </GhostButton>

        <div className="flex gap-3">
          <GhostButton onClick={onClose} disabled={submitting}>
            Cancelar
          </GhostButton>
          {step < STEPS.length - 1 ? (
            <PrimaryButton onClick={handleNext} className="gap-2 w-32">
              Próximo <ChevronRight className="h-4 w-4" />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={submit}
              disabled={submitting || uploading}
              className="w-48 font-bold tracking-wider"
            >
              {submitting || uploading ? "PROCESSANDO..." : "INICIAR PROCESSO"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </SheetPage>
  );
}
