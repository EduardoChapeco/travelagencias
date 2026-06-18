import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Map,
  Plane,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
  fmtDate,
  money,
} from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STEPS = ["Essencial", "Data & Vagas", "Valores & Inclusos", "Itinerário & Mídia", "Revisão"];

type ItineraryDay = { day: number; title: string; description: string };

const tourWizardSchema = z
  .object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    destination: z.string().min(2, "Destino é obrigatório"),
    transportType: z.string().default("air"),
    slug: z.string().min(2, "Slug inválido ou curto"),
    departure: z.string().min(1, "Data de saída é obrigatória"),
    ret: z.string().optional().nullable(),
    regDeadline: z.string().optional().nullable(),
    seats: z.number({ invalid_type_error: "Deve ser um número" }).min(1, "Mínimo 1 vaga"),
    busLayout: z.string().optional().nullable(),
    price: z
      .number({ invalid_type_error: "Insira um valor válido" })
      .min(0, "O preço base não pode ser negativo"),
    includes: z.array(z.string()).default([]),
    excludes: z.array(z.string()).default([]),
    hasFlights: z.boolean().default(false),
    coverUrl: z.string().optional().nullable(),
    itinerary: z
      .array(
        z.object({
          day: z.number(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .default([]),
    isPublic: z.boolean().default(false),
    status: z.string().default("draft"),
  })
  .refine(
    (data) => {
      if (data.departure && data.ret) {
        return new Date(data.ret) >= new Date(data.departure);
      }
      return true;
    },
    {
      message: "Retorno deve ser posterior ou igual à saída",
      path: ["ret"],
    },
  )
  .refine(
    (data) => {
      if (data.departure && data.regDeadline) {
        return new Date(data.regDeadline) <= new Date(data.departure);
      }
      return true;
    },
    {
      message: "Prazo de inscrição deve ser anterior ou igual à saída",
      path: ["regDeadline"],
    },
  );

type TourWizardFormData = z.infer<typeof tourWizardSchema>;

export function NewGroupTourWizard({
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
  const [uploading, setUploading] = useState(false);

  // Aux state for adding elements
  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<TourWizardFormData>({
    resolver: zodResolver(tourWizardSchema) as any,
    defaultValues: {
      title: "",
      destination: "",
      transportType: "air",
      slug: "",
      departure: "",
      ret: "",
      regDeadline: "",
      seats: 20,
      busLayout: "",
      price: 0,
      includes: [],
      excludes: [],
      hasFlights: false,
      coverUrl: "",
      itinerary: [],
      isPublic: false,
      status: "draft",
    },
  });

  const watchTitle = watch("title");
  const watchDestination = watch("destination");
  const watchTransportType = watch("transportType");
  const watchSlug = watch("slug");
  const watchDeparture = watch("departure");
  const watchRet = watch("ret");
  const watchRegDeadline = watch("regDeadline");
  const watchSeats = watch("seats");
  const watchBusLayout = watch("busLayout");
  const watchPrice = watch("price");
  const watchIncludes = watch("includes");
  const watchExcludes = watch("excludes");
  const watchHasFlights = watch("hasFlights");
  const watchCoverUrl = watch("coverUrl");
  const watchItinerary = watch("itinerary");
  const watchIsPublic = watch("isPublic");
  const watchStatus = watch("status");

  const busesQ = useQuery({
    queryKey: ["bus-layouts", agencyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bus_layouts")
        .select("id, name")
        .eq("agency_id", agencyId);
      return data ?? [];
    },
  });

  const generateSlug = () => {
    if (!watchTitle) return;
    setValue("slug", slugify(watchTitle) + "-" + Math.random().toString(36).slice(2, 6), {
      shouldValidate: true,
    });
  };

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof TourWizardFormData> = [];
    if (step === 0) {
      fieldsToValidate = ["title", "destination", "transportType", "slug"];
      if (!watchSlug) generateSlug();
    } else if (step === 1) {
      fieldsToValidate = ["departure", "ret", "regDeadline", "seats", "busLayout"];
    } else if (step === 2) {
      fieldsToValidate = ["price", "includes", "excludes", "hasFlights"];
    } else if (step === 3) {
      fieldsToValidate = ["coverUrl", "itinerary"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${agencyId}/tours/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("agency_media_bucket")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("agency_media_bucket").getPublicUrl(filePath);
      setValue("coverUrl", data.publicUrl, { shouldValidate: true });
      toast.success("Imagem carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da imagem.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: TourWizardFormData) {
    setSubmitting(true);
    try {
      const payload = {
        agency_id: agencyId,
        title: data.title,
        slug: data.slug || slugify(data.title) + "-" + Math.random().toString(36).slice(2, 6),
        destination: data.destination || null,
        transport_type: data.transportType,
        departure_date: data.departure || null,
        return_date: data.ret || null,
        registration_deadline: data.regDeadline || null,
        total_seats: data.seats,
        base_price: data.price,
        includes: data.includes,
        excludes: data.excludes,
        itinerary: data.itinerary,
        cover_image_url: data.coverUrl || null,
        is_public: data.isPublic,
        status: data.status,
        bus_layout_id: data.busLayout || null,
      };

      const { error } = await supabase.from("group_tours").insert(payload);
      if (error) {
        throw error;
      }
      toast.success("Excursão criada com sucesso!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar excursão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Nova Excursão em Grupo"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="px-6 pt-4 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          Configure as informações do seu pacote passo a passo.
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
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 bg-surface/30 min-h-0">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* STEP 0: ESSENTIALS */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Título do Pacote *" error={errors.title?.message}>
                  <Input
                    {...register("title")}
                    placeholder="Ex: Réveillon Mágico em Gramado 2027"
                    className="text-lg font-medium"
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Destino Principal *" error={errors.destination?.message}>
                    <Input {...register("destination")} placeholder="Ex: Gramado, RS" />
                  </Field>
                  <Field label="Meio de Transporte" error={errors.transportType?.message}>
                    <Select {...register("transportType")}>
                      <option value="air">Aéreo</option>
                      <option value="bus">Rodoviário</option>
                      <option value="cruise">Marítimo / Cruzeiro</option>
                      <option value="train">Trem</option>
                      <option value="mixed">Misto</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Slug (URL Amigável)" error={errors.slug?.message}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground bg-surface-alt px-3 py-2 rounded-md border border-border text-sm">
                      /tour/
                    </span>
                    <Input {...register("slug")} placeholder="reveillon-gramado-2027" />
                    <GhostButton type="button" onClick={generateSlug} className="shrink-0 h-9">
                      Gerar
                    </GhostButton>
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 1: DATES & SEATS */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data de Saída *" error={errors.departure?.message}>
                    <Input type="date" {...register("departure")} />
                  </Field>
                  <Field label="Data de Retorno" error={errors.ret?.message}>
                    <Input type="date" {...register("ret")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prazo limite p/ inscrição" error={errors.regDeadline?.message}>
                    <Input type="date" {...register("regDeadline")} />
                  </Field>
                  <Field label="Total de Vagas *" error={errors.seats?.message}>
                    <Input type="number" min={1} {...register("seats", { valueAsNumber: true })} />
                  </Field>
                </div>
                {watchTransportType === "bus" && (
                  <Field
                    label="Mapa de Assentos (Frota de Ônibus)"
                    error={errors.busLayout?.message}
                  >
                    <Select {...register("busLayout")}>
                      <option value="">Sem ônibus atrelado (Não controlar mapa)</option>
                      {busesQ.data?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Ao atrelar um ônibus, as vendas permitirão a escolha da poltrona.
                    </p>
                  </Field>
                )}
              </div>
            )}

            {/* STEP 2: PRICING & INCLUSIONS */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Preço Base por Pessoa (R$) *" error={errors.price?.message}>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register("price", { valueAsNumber: true })}
                    className="text-lg font-mono text-brand"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm mt-8">
                  <input
                    type="checkbox"
                    {...register("hasFlights")}
                    className="rounded border-border text-brand focus:ring-brand"
                  />
                  Incluir Voos no Pacote Base
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Includes */}
                  <div className="space-y-3">
                    <Field label="O que está incluso" error={errors.includes?.message}>
                      <div className="flex gap-2">
                        <Input
                          value={newInclude}
                          onChange={(e) => setNewInclude(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newInclude.trim()) {
                                setValue("includes", [...watchIncludes, newInclude.trim()], {
                                  shouldValidate: true,
                                });
                                setNewInclude("");
                              }
                            }
                          }}
                          placeholder="Ex: Café da manhã"
                        />
                        <GhostButton
                          type="button"
                          onClick={() => {
                            if (newInclude.trim()) {
                              setValue("includes", [...watchIncludes, newInclude.trim()], {
                                shouldValidate: true,
                              });
                              setNewInclude("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </GhostButton>
                      </div>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      {watchIncludes.map((inc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-success/10 text-success text-xs py-1.5 px-3 rounded-md border border-success/20"
                        >
                          <span className="flex items-center gap-1.5">
                            <Check className="h-3 w-3" /> {inc}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setValue(
                                "includes",
                                watchIncludes.filter((_, idx) => idx !== i),
                                { shouldValidate: true },
                              )
                            }
                            className="hover:text-danger"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {watchIncludes.length === 0 && (
                        <div className="text-xs text-muted-foreground italic">
                          Nenhum item adicionado.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Excludes */}
                  <div className="space-y-3">
                    <Field label="O que NÃO está incluso" error={errors.excludes?.message}>
                      <div className="flex gap-2">
                        <Input
                          value={newExclude}
                          onChange={(e) => setNewExclude(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newExclude.trim()) {
                                setValue("excludes", [...watchExcludes, newExclude.trim()], {
                                  shouldValidate: true,
                                });
                                setNewExclude("");
                              }
                            }
                          }}
                          placeholder="Ex: Taxa de turismo"
                        />
                        <GhostButton
                          type="button"
                          onClick={() => {
                            if (newExclude.trim()) {
                              setValue("excludes", [...watchExcludes, newExclude.trim()], {
                                shouldValidate: true,
                              });
                              setNewExclude("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </GhostButton>
                      </div>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      {watchExcludes.map((exc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-danger/10 text-danger text-xs py-1.5 px-3 rounded-md border border-danger/20"
                        >
                          <span className="flex items-center gap-1.5">
                            <X className="h-3 w-3" /> {exc}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setValue(
                                "excludes",
                                watchExcludes.filter((_, idx) => idx !== i),
                                { shouldValidate: true },
                              )
                            }
                            className="hover:text-danger/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {watchExcludes.length === 0 && (
                        <div className="text-xs text-muted-foreground italic">
                          Nenhum item adicionado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ITINERARY & MEDIA */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Imagem de Capa (Banner)" error={errors.coverUrl?.message}>
                  {watchCoverUrl ? (
                    <div className="relative w-full h-40 rounded-xl border border-border overflow-hidden group">
                      <img src={watchCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setValue("coverUrl", "", { shouldValidate: true })}
                          className="text-danger flex items-center gap-2 text-sm font-bold bg-surface px-4 py-2 rounded-lg border border-danger/30 hover:bg-danger hover:text-white transition-colors"
                        >
                          <Trash2 className="h-4 w-4" /> Remover Imagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                        id="cover-upload"
                      />
                      <label
                        htmlFor="cover-upload"
                        className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-border/60 bg-surface hover:border-brand/50 hover:bg-surface-alt/50 cursor-pointer transition-colors"
                      >
                        {uploading ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-2" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        )}
                        <span className="text-sm font-semibold text-muted-foreground">
                          {uploading ? "Enviando..." : "Clique para fazer upload da capa"}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                          Recomendado: 1200x800px
                        </span>
                      </label>
                    </div>
                  )}
                </Field>

                <div className="border-t border-border pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Itinerário Dia-a-Dia</h4>
                    <GhostButton
                      type="button"
                      onClick={() =>
                        setValue(
                          "itinerary",
                          [
                            ...watchItinerary,
                            { day: watchItinerary.length + 1, title: "", description: "" },
                          ],
                          { shouldValidate: true },
                        )
                      }
                      className="h-8 text-xs gap-1.5 border border-border"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Dia
                    </GhostButton>
                  </div>

                  <div className="space-y-4">
                    {watchItinerary.map((day, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 rounded-xl border border-border/60 bg-surface-alt/20"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">
                            {idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setValue(
                                "itinerary",
                                watchItinerary
                                  .filter((_, i) => i !== idx)
                                  .map((d, i) => ({ ...d, day: i + 1 })),
                                { shouldValidate: true },
                              )
                            }
                            className="text-muted-foreground/50 hover:text-danger mt-auto pb-1"
                            title="Remover dia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <Input
                            placeholder={`Título do Dia ${idx + 1} (ex: Chegada em Gramado)`}
                            value={day.title}
                            onChange={(e) =>
                              setValue(
                                "itinerary",
                                watchItinerary.map((d, i) =>
                                  i === idx ? { ...d, title: e.target.value } : d,
                                ),
                                { shouldValidate: true },
                              )
                            }
                            className="font-semibold text-sm"
                          />
                          <Textarea
                            placeholder="Descrição rica das atividades do dia..."
                            rows={3}
                            value={day.description}
                            onChange={(e) =>
                              setValue(
                                "itinerary",
                                watchItinerary.map((d, i) =>
                                  i === idx ? { ...d, description: e.target.value } : d,
                                ),
                                { shouldValidate: true },
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                    {watchItinerary.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground">
                        Nenhum dia adicionado ao itinerário.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & PUBLISH */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-border bg-surface-alt/20 p-6 flex gap-6">
                  {watchCoverUrl ? (
                    <img
                      src={watchCoverUrl}
                      alt="Cover"
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-surface flex items-center justify-center border border-dashed border-border">
                      <Map className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">
                      {watchTitle || "Sem título"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {watchDestination || "Destino não informado"}
                    </p>

                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Preço Base:</span>
                        <strong className="text-brand font-mono text-sm">
                          R$ {watchPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Vagas:</span>
                        <strong>{watchSeats} pessoas</strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Saída:</span>
                        <strong>
                          {watchDeparture
                            ? new Date(watchDeparture + "T00:00:00").toLocaleDateString("pt-BR")
                            : "A definir"}
                        </strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Retorno:</span>
                        <strong>
                          {watchRet
                            ? new Date(watchRet + "T00:00:00").toLocaleDateString("pt-BR")
                            : "A definir"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Opções de Publicação
                  </h4>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="isPublic" {...register("isPublic")} />
                    <label
                      htmlFor="isPublic"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Publicar no Portal B2C
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Se marcado, esta excursão ficará visível publicamente no site da agência para
                    clientes comprarem online.
                  </p>

                  <div className="pt-2">
                    <Field label="Status Operacional" error={errors.status?.message}>
                      <Select {...register("status")} className="max-w-xs">
                        <option value="draft">Rascunho (Não iniciada)</option>
                        <option value="open">Abertas inscrições</option>
                        <option value="confirmed">Confirmada / Lotada</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4 shrink-0">
          <GhostButton
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-2 w-28"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </GhostButton>

          <div className="flex gap-3">
            <GhostButton type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </GhostButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton type="button" onClick={handleNext} className="gap-2 w-32">
                Próximo <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="submit"
                disabled={submitting}
                className="w-40 font-bold tracking-wider"
              >
                {submitting ? "SALVANDO..." : "CRIAR EXCURSÃO"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </form>
    </SheetPage>
  );
}
