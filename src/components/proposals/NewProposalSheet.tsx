import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { SheetPage } from "@/components/ui/sheet";
import { createProposal, fetchClientsPick, fetchLeadsPick } from "@/services/proposals";
import {
  Search,
  X,
  Plus,
  User,
  UserPlus,
  ChevronDown,
  Check,
  Upload,
  Sparkles,
  Loader2,
} from "lucide-react";

type NewProposalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  preSelectedLeadId?: string;
};

// ─── Combobox de busca para cliente ────────────────────────────────────────────
function ClientCombobox({
  agencyId,
  value,
  onChange,
}: {
  agencyId: string;
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-pick", agencyId],
    queryFn: () => fetchClientsPick(agencyId),
  });

  const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleQuickCreate() {
    if (!quickName.trim()) return toast.error("Nome é obrigatório");
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          agency_id: agencyId,
          full_name: quickName.trim(),
          email: quickEmail.trim() || null,
          phone: quickPhone.trim() || null,
          kind: "individual",
        })
        .select("id, full_name")
        .single();
      if (error) throw error;
      onChange(data.id, data.full_name);
      setSelectedName(data.full_name);
      setShowQuickCreate(false);
      setOpen(false);
      toast.success("Cliente criado com sucesso!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="flex h-9 w-full items-center justify-between rounded-full border border-border bg-surface-alt px-3 text-xs text-left hover:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <span className={selectedName ? "text-foreground" : "text-muted-foreground"}>
          {selectedName || "— selecionar cliente —"}
        </span>
        {value ? (
          <X
            className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange("", "");
              setSelectedName("");
            }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-border bg-surface">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              className="flex-1"
              placeholder="Buscar por nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum cliente encontrado
              </div>
            )}
            {filtered.map((c) => (
              <Button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id, c.full_name);
                  setSelectedName(c.full_name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-surface-alt"
              >
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{c.full_name}</span>
                {c.id === value && <Check className="h-3.5 w-3.5 text-brand" />}
              </Button>
            ))}
          </div>

          {/* Quick create */}
          {!showQuickCreate ? (
            <div className="border-t border-border">
              <Button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-brand hover:bg-brand/5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Criar cliente rápido
              </Button>
            </div>
          ) : (
            <div className="border-t border-border p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Novo cliente
              </div>
              <Input
                autoFocus
                className="w-full rounded px-2 focus:border-brand"
                placeholder="Nome completo *"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
              <Input
                className="w-full rounded px-2 focus:border-brand"
                placeholder="Email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
              />
              <Input
                className="w-full rounded px-2 focus:border-brand"
                placeholder="WhatsApp / Telefone"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
              />
              <div className="flex gap-2 pt-1">
                <GhostButton
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex-1 h-8 text-xs"
                >
                  Cancelar
                </GhostButton>
                <PrimaryButton
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={creating || !quickName.trim()}
                  className="flex-1 h-8 text-xs"
                >
                  {creating ? "Criando…" : "Criar"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Combobox de busca para lead ────────────────────────────────────────────
function LeadCombobox({
  agencyId,
  value,
  onChange,
}: {
  agencyId: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-pick", agencyId],
    queryFn: () => fetchLeadsPick(agencyId),
  });

  const filtered = leads.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="flex h-9 w-full items-center justify-between rounded-full border border-border bg-surface-alt px-3 text-xs text-left hover:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <span className={selectedName ? "text-foreground" : "text-muted-foreground"}>
          {selectedName || "— nenhum lead —"}
        </span>
        {value ? (
          <X
            className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setSelectedName("");
            }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              className="flex-1"
              placeholder="Buscar lead por nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            <Button
              type="button"
              onClick={() => {
                onChange("");
                setSelectedName("");
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-2 text-xs text-muted-foreground hover:bg-surface-alt"
            >
              — nenhum —
            </Button>
            {filtered.length === 0 && query && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum lead encontrado
              </div>
            )}
            {filtered.map((l) => (
              <Button
                key={l.id}
                type="button"
                onClick={() => {
                  onChange(l.id);
                  setSelectedName(l.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-surface-alt"
              >
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{l.name}</span>
                {l.id === value && <Check className="h-3.5 w-3.5 text-brand" />}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sheet Principal ─────────────────────────────────────────────────────────
export function NewProposalSheet({
  isOpen,
  onClose,
  onCreated,
  preSelectedLeadId,
}: NewProposalSheetProps) {
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [currency, setCurrency] = useState("BRL");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"private" | "agency" | "public">("private");
  const [submitting, setSubmitting] = useState(false);

  // OCR/AI import states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStep, setOcrStep] = useState("");
  const [extractedItems, setExtractedItems] = useState<any | null>(null);

  // Template clone states
  const [cloneTemplateId, setCloneTemplateId] = useState("");

  const templatesQ = useQuery({
    enabled: !!agency && isOpen,
    queryKey: ["proposal-templates", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, destination")
        .eq("agency_id", agency!.id)
        .eq("is_public_template", true)
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  async function handleOcrFile(file: File) {
    if (!agency) return;
    setOcrLoading(true);
    setOcrStep("Carregando arquivo original...");
    try {
      setOcrStep("IA lendo PDF e imagens...");
      const { processOcrFile } = await import("@/services/proposals");
      const data = await processOcrFile(file, undefined, agency.id);

      setOcrStep("Estruturando voos, hotéis e roteiro...");
      if (data.destination) {
        setDestination(data.destination);
        setTitle(`Cotação inteligente: ${data.destination}`);
      } else {
        setTitle(`Cotação importada: ${file.name.replace(/\.[^/.]+$/, "")}`);
      }

      // Dates
      if (data.flights && data.flights.length > 0) {
        const sortedFlights = [...data.flights].sort(
          (a, b) =>
            new Date(a.date || a.departure_time).getTime() -
            new Date(b.date || b.departure_time).getTime(),
        );
        if (sortedFlights[0]?.date || sortedFlights[0]?.departure_time) {
          setTravelStart(
            new Date(sortedFlights[0].date || sortedFlights[0].departure_time)
              .toISOString()
              .split("T")[0],
          );
        }
        if (
          sortedFlights[sortedFlights.length - 1]?.date ||
          sortedFlights[sortedFlights.length - 1]?.departure_time
        ) {
          setTravelEnd(
            new Date(
              sortedFlights[sortedFlights.length - 1].date ||
                sortedFlights[sortedFlights.length - 1].departure_time,
            )
              .toISOString()
              .split("T")[0],
          );
        }
      } else if (data.hotels && data.hotels.length > 0) {
        const sortedHotels = [...data.hotels].sort(
          (a, b) => new Date(a.checkin).getTime() - new Date(b.checkin).getTime(),
        );
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
    if (isOpen && preSelectedLeadId) {
      setLeadId(preSelectedLeadId);
      // Fetch details from the leads table to pre-populate the form
      supabase
        .from("leads")
        .select("*")
        .eq("id", preSelectedLeadId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTitle(`Cotação para ${data.name} - ${data.destination || ""}`);
            setDestination(data.destination || "");
            if (data.client_id) setClientId(data.client_id);
            setTravelStart(data.travel_start || "");
            setTravelEnd(data.travel_end || "");
            setAdults(data.pax_adults || data.pax_count || 2);
            setChildren(data.pax_children || 0);
            setInfants(data.pax_infants || 0);
            setNotes(data.notes || "");
          }
        });
    } else if (isOpen) {
      setTitle("");
      setDestination("");
      setClientId("");
      setLeadId("");
      setTravelStart("");
      setTravelEnd("");
      setAdults(2);
      setChildren(0);
      setInfants(0);
      setNotes("");
      setVisibility("private");
      setCloneTemplateId("");
      setExtractedItems(null);
    }
  }, [isOpen, preSelectedLeadId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    if (!title.trim()) return toast.error("O título é obrigatório.");
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();

      // Fetch template items if cloning
      let cloneItems = {};
      if (cloneTemplateId) {
        const { data: tplData, error: tplError } = await supabase
          .from("proposals")
          .select("flights, hotels, transfers, tours, itinerary, includes, excludes")
          .eq("id", cloneTemplateId)
          .single();
        if (tplError) throw new Error("Erro ao carregar dados do template: " + tplError.message);
        if (tplData) {
          cloneItems = {
            flights: tplData.flights ?? [],
            hotels: tplData.hotels ?? [],
            transfers: tplData.transfers ?? [],
            tours: tplData.tours ?? [],
            itinerary: tplData.itinerary ?? [],
            includes: tplData.includes ?? [],
            excludes: tplData.excludes ?? [],
          };
        }
      }

      const payload = {
        title: title.trim(),
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
        visibility,
      };

      const { id } = await createProposal(agency.id, payload, u.user?.id);

      // Update with cloned items if we cloned a template
      if (cloneTemplateId && Object.keys(cloneItems).length > 0) {
        const { updateProposal } = await import("@/services/proposals");
        await updateProposal(id, cloneItems);
      }

      // Save extracted OCR items
      if (extractedItems) {
        const { updateProposal } = await import("@/services/proposals");
        await updateProposal(id, extractedItems);
      }

      toast.success("Cotação criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["proposals", agency.id] });
      onCreated(id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar cotação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!agency) return null;

  return (
    <SheetPage isOpen={isOpen} onClose={onClose} title="Nova Cotação">
      <p className="text-xs text-muted-foreground mb-4">
        Preencha os dados básicos para iniciar a montagem da proposta. Você poderá adicionar voos,
        hotéis e itinerário no editor.
      </p>

      {/* OCR Drag-and-Drop Area */}
      <div className="mb-5 rounded-[var(--radius-card)] border border-dashed border-border bg-surface-alt/40 p-4 text-center transition-all hover:border-brand/40">
        {ocrLoading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <div className="text-xs font-semibold text-foreground">{ocrStep}</div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer group py-1">
            <div className="mb-2 rounded-full bg-brand/10 p-2.5 text-brand group-hover:bg-brand/20 transition-colors">
              <Upload className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground text-xs flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> Importar Orçamento com IA (OCR)
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
              Arraste um PDF/Imagem ou clique para selecionar. A IA extrairá e preencherá tudo
              automaticamente.
            </p>
            <Input
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
          <div className="mt-3 rounded-2xl bg-success/5 border border-success/20 p-2 text-[10px] text-success flex items-center justify-between">
            <div className="text-left">
              <span className="font-bold">✨ Dados extraídos com sucesso!</span>
              <p className="text-[9px] text-muted-foreground">
                {extractedItems.flights?.length ?? 0} voos, {extractedItems.hotels?.length ?? 0}{" "}
                hotéis e {extractedItems.itinerary?.length ?? 0} dias de roteiro serão aplicados.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setExtractedItems(null)}
              className="text-muted-foreground hover:text-danger border border-border rounded px-1.5 py-0.5 hover:bg-surface transition-colors"
            >
              Descartar
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Título */}
        <Field label="Título da cotação *">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Lua de mel em Maldivas"
          />
        </Field>

        {/* Destino */}
        <Field label="Destino">
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Maldivas, Maldive Islands"
          />
        </Field>

        {/* Template Cloner (Only if agency templates exist) */}
        {templatesQ.data && templatesQ.data.length > 0 && (
          <Field label="Clonar itens de Template existente (opcional)">
            <Select
              value={cloneTemplateId}
              onChange={(e) => setCloneTemplateId(e.target.value)}
              disabled={ocrLoading || !!extractedItems}
            >
              <option value="">— iniciar em branco —</option>
              {templatesQ.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.destination ? `(${t.destination})` : ""}
                </option>
              ))}
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Copia voos, hotéis, traslados, passeios, roteiro e inclusões deste template.
            </p>
          </Field>
        )}

        {/* Cliente + Lead */}
        <div className="grid grid-cols-1 gap-3">
          <Field label="Cliente (opcional - cotação avulsa)">
            <ClientCombobox
              agencyId={agency.id}
              value={clientId}
              onChange={(id) => setClientId(id)}
            />
          </Field>
          <Field label="Lead do CRM (opcional)">
            <LeadCombobox agencyId={agency.id} value={leadId} onChange={setLeadId} />
          </Field>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início da Viagem">
            <Input
              type="date"
              value={travelStart}
              onChange={(e) => setTravelStart(e.target.value)}
            />
          </Field>
          <Field label="Fim da Viagem">
            <Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
          </Field>
        </div>

        {/* Pax */}
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

        {/* Moeda + Validade */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moeda">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — Libra</option>
            </Select>
          </Field>
          <Field label="Válida até">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>

        {/* Visibilidade */}
        <Field label="Visibilidade da Cotação">
          <Select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="private">🔒 Privada — somente você</option>
            <option value="agency">🏢 Agência — toda a equipe vê</option>
            <option value="public">🌐 Pública — link acessível por qualquer um</option>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {visibility === "private" && "Apenas você pode ver esta cotação."}
            {visibility === "agency" && "Todos os agentes da sua equipe poderão ver e editar."}
            {visibility === "public" &&
              "O link público pode ser acessado sem login — ideal para cotações avulsas."}
          </p>
        </Field>

        {/* Observações */}
        <Field label="Observações Internas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações para controle da agência (não visíveis ao cliente)..."
          />
        </Field>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting || !title.trim() || ocrLoading}>
            {submitting ? "Criando…" : "Criar cotação →"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
