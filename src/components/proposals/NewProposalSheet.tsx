import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
} from "@/components/ui/form";
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
} from "lucide-react";

type NewProposalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
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

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(query.toLowerCase()),
  );

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
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface-alt px-3 text-xs text-left hover:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand"
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
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-xl">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
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
              <button
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
              </button>
            ))}
          </div>

          {/* Quick create */}
          {!showQuickCreate ? (
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-brand hover:bg-brand/5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Criar cliente rápido
              </button>
            </div>
          ) : (
            <div className="border-t border-border p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Novo cliente
              </div>
              <input
                autoFocus
                className="w-full h-8 rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                placeholder="Nome completo *"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
              <input
                className="w-full h-8 rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                placeholder="Email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
              />
              <input
                className="w-full h-8 rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
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

  const filtered = leads.filter((l) =>
    l.name.toLowerCase().includes(query.toLowerCase()),
  );

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
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface-alt px-3 text-xs text-left hover:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand"
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
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Buscar lead por nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setSelectedName(""); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-xs text-muted-foreground hover:bg-surface-alt"
            >
              — nenhum —
            </button>
            {filtered.length === 0 && query && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum lead encontrado
              </div>
            )}
            {filtered.map((l) => (
              <button
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
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sheet Principal ─────────────────────────────────────────────────────────
export function NewProposalSheet({ isOpen, onClose, onCreated }: NewProposalSheetProps) {
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
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    if (!title.trim()) return toast.error("O título é obrigatório.");
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
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
      };

      const { id } = await createProposal(agency.id, payload, u.user?.id);

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
      <p className="text-xs text-muted-foreground mb-5">
        Preencha os dados básicos para iniciar a montagem da proposta. Você poderá adicionar voos, hotéis e itinerário no editor.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Título */}
        <Field label="Título da cotação *">
          <Input
            required
            autoFocus
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

        {/* Cliente + Lead */}
        <div className="grid grid-cols-1 gap-3">
          <Field label="Cliente (com busca + criação rápida)">
            <ClientCombobox
              agencyId={agency.id}
              value={clientId}
              onChange={(id) => setClientId(id)}
            />
          </Field>
          <Field label="Lead do CRM (opcional)">
            <LeadCombobox
              agencyId={agency.id}
              value={leadId}
              onChange={setLeadId}
            />
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
          <PrimaryButton type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Criando…" : "Criar cotação →"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
