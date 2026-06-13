import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { createProposal, fetchClientsPick, fetchLeadsPick, updateProposal, processOcrFile } from "@/services/proposals";

export const Route = createFileRoute("/agency/$slug/proposals/new")({
  validateSearch: z.object({
    lead_id: z.string().optional(),
    client_id: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Nova cotação · TravelOS" }] }),
  component: NewProposal,
});

function NewProposal() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals/new" });
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [clientId, setClientId] = useState<string>(search.client_id || "");
  const [leadId, setLeadId] = useState<string>(search.lead_id || "");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [currency, setCurrency] = useState("BRL");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStep, setOcrStep] = useState("");
  const [extractedItems, setExtractedItems] = useState<{
    flights?: any[];
    hotels?: any[];
    transfers?: any[];
    tours?: any[];
    itinerary?: any[];
    includes?: string[];
    excludes?: string[];
  } | null>(null);

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
        setDestination(data.destination);
        setTitle(`Cotação inteligente: ${data.destination}`);
      } else {
        setTitle(`Cotação importada: ${file.name.replace(/\.[^/.]+$/, "")}`);
      }
      
      // Datas
      if (data.flights && data.flights.length > 0) {
        const sortedFlights = [...data.flights].sort((a, b) => new Date(a.date || a.departure_time).getTime() - new Date(b.date || b.departure_time).getTime());
        if (sortedFlights[0]?.date || sortedFlights[0]?.departure_time) {
          setTravelStart(new Date(sortedFlights[0].date || sortedFlights[0].departure_time).toISOString().split("T")[0]);
        }
        if (sortedFlights[sortedFlights.length - 1]?.date || sortedFlights[sortedFlights.length - 1]?.departure_time) {
          setTravelEnd(new Date(sortedFlights[sortedFlights.length - 1].date || sortedFlights[sortedFlights.length - 1].departure_time).toISOString().split("T")[0]);
        }
      } else if (data.hotels && data.hotels.length > 0) {
        const sortedHotels = [...data.hotels].sort((a, b) => new Date(a.checkin).getTime() - new Date(b.checkin).getTime());
        if (sortedHotels[0]?.checkin) {
          setTravelStart(sortedHotels[0].checkin);
        }
        if (sortedHotels[sortedHotels.length - 1]?.checkout) {
          setTravelEnd(sortedHotels[sortedHotels.length - 1].checkout);
        }
      }

      // PAX count
      if (data.pax && data.pax.length > 0) {
        setAdults(data.pax.length);
      }

      // Notes
      if (data.notes) {
        setNotes(data.notes);
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
          setTitle(`Cotação para ${data.name}`);
          setDestination(data.destination || "");
          if (data.client_id) setClientId(data.client_id);
          setTravelStart(data.travel_start || "");
          setTravelEnd(data.travel_end || "");
          setAdults(data.pax_adults || data.pax_count || 2);
          setChildren(data.pax_children || 0);
          setInfants(data.pax_infants || 0);
          setNotes(data.notes || "");
        }
      } else if (search.client_id) {
        const { data } = await supabase
          .from("clients")
          .select("*")
          .eq("id", search.client_id)
          .maybeSingle();
        if (data) {
          setTitle(`Cotação para ${data.full_name}`);
        }
      }
    }
    loadContext();
  }, [search.lead_id, search.client_id]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        title,
        destination: destination || undefined,
        client_id: clientId || undefined,
        lead_id: leadId || undefined,
        travel_start: travelStart || undefined,
        travel_end: travelEnd || undefined,
        pax_adults: adults,
        pax_children: children,
        pax_infants: infants,
        currency,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link
        to="/agency/$slug/proposals"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova cotação</h1>

      {/* OCR Dropzone */}
      <div className="mb-6 max-w-2xl rounded-2xl border border-dashed border-border bg-surface p-6 text-center transition-all hover:border-brand/40">
        {ocrLoading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand animate-pulse" />
            <div className="text-sm font-semibold text-foreground">{ocrStep}</div>
            <div className="text-xs text-muted-foreground">Isso pode levar alguns segundos dependendo do tamanho do arquivo.</div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer group py-4">
            <div className="mb-3 rounded-full bg-brand/10 p-3 text-brand group-hover:bg-brand/20 transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand" /> Importar Orçamento com Inteligência Artificial
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Arraste um PDF/Imagem aqui ou clique para selecionar. A IA criará voos, hotéis e o itinerário completo automaticamente.
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
                {(extractedItems.flights?.length ?? 0)} voo(s), {(extractedItems.hotels?.length ?? 0)} hotel(eis) e {(extractedItems.itinerary?.length ?? 0)} dia(s) de roteiro serão salvos ao criar a cotação.
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
        onSubmit={onSubmit}
        className="max-w-2xl space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <Field label="Título *">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Lua de mel em Maldivas"
          />
        </Field>
        <Field label="Destino">
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— selecionar —</option>
              {(clientsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lead (CRM)">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
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
          <Field label="Início">
            <Input
              type="date"
              value={travelStart}
              onChange={(e) => setTravelStart(e.target.value)}
            />
          </Field>
          <Field label="Volta">
            <Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Adultos">
            <Input
              type="number"
              min={0}
              value={adults}
              onChange={(e) => setAdults(+e.target.value || 0)}
            />
          </Field>
          <Field label="Crianças">
            <Input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(+e.target.value || 0)}
            />
          </Field>
          <Field label="Infantes">
            <Input
              type="number"
              min={0}
              value={infants}
              onChange={(e) => setInfants(+e.target.value || 0)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moeda">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </Select>
          </Field>
          <Field label="Válida até">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>
        <Field label="Observações">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton
            type="button"
            onClick={() => navigate({ to: "/agency/$slug/proposals", params: { slug } })}
          >
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cotação"}
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}
