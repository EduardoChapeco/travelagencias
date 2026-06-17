import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { cn } from "@/lib/utils";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import {
  createProposal,
  fetchClientsPick,
  fetchLeadsPick,
  updateProposal,
  processOcrFile,
} from "@/services/proposals";

export const Route = createFileRoute("/agency/$slug/proposals/new")({
  validateSearch: z.object({
    lead_id: z.string().optional(),
    client_id: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Nova cotação · TravelOS" }] }),
  component: NewProposal,
});

const proposalSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  destination: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  pax_adults: z.number().min(0).default(2),
  pax_children: z.number().min(0).default(0),
  pax_infants: z.number().min(0).default(0),
  currency: z.string().min(3).default("BRL"),
  valid_until: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

function NewProposal() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals/new" });
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStep, setOcrStep] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [extractedItems, setExtractedItems] = useState<{
    flights?: any[];
    hotels?: any[];
    transfers?: any[];
    tours?: any[];
    itinerary?: any[];
    includes?: string[];
    excludes?: string[];
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema) as any,
    defaultValues: {
      title: "",
      destination: "",
      client_id: search.client_id || "",
      lead_id: search.lead_id || "",
      travel_start: "",
      travel_end: "",
      pax_adults: 2,
      pax_children: 0,
      pax_infants: 0,
      currency: "BRL",
      valid_until: "",
      notes: "",
    },
  });

  const currencyValue = watch("currency");

  async function handleOcrFile(file: File) {
    if (!agency) return;
    setOcrLoading(true);
    setOcrStep("Carregando arquivo original...");
    try {
      setOcrStep("IA lendo PDF e imagens...");
      const data = await processOcrFile(file, undefined, agency.id);

      setOcrStep("Estruturando voos, hotéis e roteiro...");
      // Auto-preencher dados gerais
      if (data.destination) {
        setValue("destination", data.destination, { shouldValidate: true });
        setValue("title", `Cotação inteligente: ${data.destination}`, { shouldValidate: true });
      } else {
        setValue("title", `Cotação importada: ${file.name.replace(/\.[^/.]+$/, "")}`, {
          shouldValidate: true,
        });
      }

      // Datas
      if (data.flights && data.flights.length > 0) {
        const sortedFlights = [...data.flights].sort(
          (a, b) =>
            new Date(a.date || a.departure_time).getTime() -
            new Date(b.date || b.departure_time).getTime(),
        );
        if (sortedFlights[0]?.date || sortedFlights[0]?.departure_time) {
          setValue(
            "travel_start",
            new Date(sortedFlights[0].date || sortedFlights[0].departure_time)
              .toISOString()
              .split("T")[0],
            { shouldValidate: true },
          );
        }
        if (
          sortedFlights[sortedFlights.length - 1]?.date ||
          sortedFlights[sortedFlights.length - 1]?.departure_time
        ) {
          setValue(
            "travel_end",
            new Date(
              sortedFlights[sortedFlights.length - 1].date ||
                sortedFlights[sortedFlights.length - 1].departure_time,
            )
              .toISOString()
              .split("T")[0],
            { shouldValidate: true },
          );
        }
      } else if (data.hotels && data.hotels.length > 0) {
        const sortedHotels = [...data.hotels].sort(
          (a, b) => new Date(a.checkin).getTime() - new Date(b.checkin).getTime(),
        );
        if (sortedHotels[0]?.checkin) {
          setValue("travel_start", sortedHotels[0].checkin, { shouldValidate: true });
        }
        if (sortedHotels[sortedHotels.length - 1]?.checkout) {
          setValue("travel_end", sortedHotels[sortedHotels.length - 1].checkout, {
            shouldValidate: true,
          });
        }
      }

      // PAX count
      if (data.pax && data.pax.length > 0) {
        setValue("pax_adults", data.pax.length, { shouldValidate: true });
      }

      // Notes
      if (data.notes) {
        setValue("notes", data.notes, { shouldValidate: true });
      }

      // Guardar itens complexos
      setExtractedItems({
        flights: data.flights ?? [],
        hotels: data.hotels ?? [],
        transfers: data.transfers ?? [],
        tours: data.tours ?? [],
        itinerary: data.itinerary ?? [],
        includes: data.includes ?? [],
        excludes: data.excludes ?? [],
      });

      toast.success("Orçamento lido pela IA com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar arquivo com IA.");
    } finally {
      setOcrLoading(false);
      setOcrStep("");
    }
  }

  useEffect(() => {
    async function loadContext() {
      if (search.lead_id) {
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("id", search.lead_id)
          .maybeSingle();
        if (data) {
          setValue("title", `Cotação para ${data.name}`, { shouldValidate: true });
          setValue("destination", data.destination || "", { shouldValidate: true });
          if (data.client_id) {
            setValue("client_id", data.client_id, { shouldValidate: true });
          }
          setValue("travel_start", data.travel_start || "", { shouldValidate: true });
          setValue("travel_end", data.travel_end || "", { shouldValidate: true });
          setValue("pax_adults", data.pax_adults || data.pax_count || 2, { shouldValidate: true });
          setValue("pax_children", data.pax_children || 0, { shouldValidate: true });
          setValue("pax_infants", data.pax_infants || 0, { shouldValidate: true });
          setValue("notes", data.notes || "", { shouldValidate: true });
        }
      } else if (search.client_id) {
        const { data } = await supabase
          .from("clients")
          .select("*")
          .eq("id", search.client_id)
          .maybeSingle();
        if (data) {
          setValue("title", `Cotação para ${data.full_name}`, { shouldValidate: true });
        }
      }
    }
    loadContext();
  }, [search.lead_id, search.client_id, setValue]);

  const clientsQ = useQuery({
    enabled: !!agency,
    queryKey: ["clients-pick", agency?.id],
    queryFn: () => fetchClientsPick(agency!.id),
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads-pick", agency?.id],
    queryFn: () => fetchLeadsPick(agency!.id),
  });

  async function onSubmit(data: ProposalFormData) {
    if (!agency) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        title: data.title,
        destination: data.destination || undefined,
        client_id: data.client_id || undefined,
        lead_id: data.lead_id || undefined,
        travel_start: data.travel_start || undefined,
        travel_end: data.travel_end || undefined,
        pax_adults: data.pax_adults,
        pax_children: data.pax_children,
        pax_infants: data.pax_infants,
        currency: data.currency,
        valid_until: data.valid_until || undefined,
        notes: data.notes || undefined,
      };

      const { id } = await createProposal(agency.id, payload, u.user?.id);

      // Salvar os itens extras extraídos por OCR
      if (extractedItems) {
        await updateProposal(id, extractedItems);
      }

      toast.success("Cotação criada com sucesso!");
      navigate({ to: "/agency/$slug/proposals/$id", params: { slug, id } });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar cotação.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Link
          to="/agency/$slug/proposals"
          params={{ slug }}
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Nova cotação</h1>
      </div>

      {/* OCR Dropzone */}
      <div
        className={cn(
          "mb-6 max-w-2xl rounded-2xl border border-dashed p-6 text-center transition-all duration-200",
          isDragging
            ? "border-brand bg-brand/5 scale-[1.01]"
            : "border-border bg-surface hover:border-brand/40"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleOcrFile(e.dataTransfer.files[0]);
          }
        }}
      >
        {ocrLoading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand animate-pulse" />
            <div className="text-sm font-semibold text-foreground">{ocrStep}</div>
            <div className="text-xs text-muted-foreground">
              Isso pode levar alguns segundos dependendo do tamanho do arquivo.
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer group py-4">
            <div className="mb-3 rounded-full bg-brand/10 p-3 text-brand group-hover:bg-brand/20 transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand" /> Importar Orçamento com Inteligência
              Artificial
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Arraste um PDF/Imagem aqui ou clique para selecionar. A IA criará voos, hotéis e o
              itinerário completo automaticamente.
            </p>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleOcrFile(e.target.files[0]);
                }
              }}
            />
          </label>
        )}

        {extractedItems && (
          <div className="mt-4 rounded-xl bg-success/5 border border-success/20 p-3 text-xs text-success flex items-center justify-between">
            <div className="text-left">
              <span className="font-bold text-success">✨ Dados extraídos com sucesso!</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {extractedItems.flights?.length ?? 0} voo(s), {extractedItems.hotels?.length ?? 0}{" "}
                hotel(eis) e {extractedItems.itinerary?.length ?? 0} dia(s) de roteiro serão salvos
                ao criar a cotação.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExtractedItems(null)}
              className="text-muted-foreground hover:text-danger text-[10px] font-semibold border border-border rounded px-2 py-0.5 hover:bg-surface-alt transition-colors"
            >
              Descartar
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <Field label="Título *" error={errors.title?.message}>
          <Input {...register("title")} placeholder="Ex: Lua de mel em Maldivas" />
        </Field>
        <Field label="Destino" error={errors.destination?.message}>
          <Input {...register("destination")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente" error={errors.client_id?.message}>
            <Select {...register("client_id")}>
              <option value="">— selecionar —</option>
              {(clientsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lead (CRM)" error={errors.lead_id?.message}>
            <Select {...register("lead_id")}>
              <option value="">— nenhum —</option>
              {(leadsQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" error={errors.travel_start?.message}>
            <Input type="date" {...register("travel_start")} />
          </Field>
          <Field label="Volta" error={errors.travel_end?.message}>
            <Input type="date" {...register("travel_end")} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Adultos" error={errors.pax_adults?.message}>
            <Input type="number" min={0} {...register("pax_adults", { valueAsNumber: true })} />
          </Field>
          <Field label="Crianças" error={errors.pax_children?.message}>
            <Input type="number" min={0} {...register("pax_children", { valueAsNumber: true })} />
          </Field>
          <Field label="Infantes" error={errors.pax_infants?.message}>
            <Input type="number" min={0} {...register("pax_infants", { valueAsNumber: true })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moeda" error={errors.currency?.message}>
            <Select {...register("currency")}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </Select>
          </Field>
          <Field label="Válida até" error={errors.valid_until?.message}>
            <Input type="date" {...register("valid_until")} />
          </Field>
        </div>
        <Field label="Observações" error={errors.notes?.message}>
          <Textarea {...register("notes")} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton
            type="button"
            onClick={() => navigate({ to: "/agency/$slug/proposals", params: { slug } })}
          >
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando…" : "Criar cotação"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
