import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Clock,
  Users,
  AlertTriangle,
  Link as LinkIcon,
  CheckSquare,
  Square,
  Pencil,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton, GhostButton, fmtDate } from "@/components/ui/form";
import {
  type BoardingCard as Card,
  type ChecklistItem,
  updateBoardingCard,
  updateBoardingCardChecklist,
} from "@/services/boarding";

export function CardDetailPanel({
  card,
  onClose,
  onUpdated,
}: {
  card: Card;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { slug } = useParams({ strict: false });
  const qc = useQueryClient();

  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist ?? []);
  const [newItem, setNewItem] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  // Inline edits
  const [pnr, setPnr] = useState(card.pnr ?? "");
  const [airline, setAirline] = useState(card.airline ?? "");
  const [departureDate, setDepartureDate] = useState(card.departure_date ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [tags, setTags] = useState<string[]>(card.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Briefing
  const [briefingDate, setBriefingDate] = useState(card.briefing_date ?? "");
  const [briefingUrl, setBriefingUrl] = useState(card.briefing_url ?? "");

  // Support ticket form
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketType, setTicketType] = useState("trip");

  // Activities timeline query
  const activitiesQ = useQuery({
    queryKey: ["boarding_card_activities", card.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_card_activities")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Support tickets query
  const ticketsQ = useQuery({
    queryKey: ["support_tickets_by_trip", card.trip_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, code, title, status, priority, created_at")
        .eq("trip_id", card.trip_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create Support Ticket Mutation
  const createTicket = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: card.agency_id || (card as any).agencyId,
          trip_id: card.trip_id,
          title: ticketTitle,
          description: ticketDesc || null,
          priority: ticketPriority,
          type: ticketType,
          status: "open",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Chamado de suporte aberto!");
      setTicketTitle("");
      setTicketDesc("");
      setShowTicketForm(false);
      qc.invalidateQueries({ queryKey: ["support_tickets_by_trip", card.trip_id] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao abrir chamado"),
  });

  const PRESET_TAGS = [
    "Passaporte vencendo",
    "Visto pendente",
    "Bagagem especial",
    "Menor desacompanhado",
    "Necessita cadeira",
    "Check-in prioritário",
    "Seguro pendente",
  ];

  const daysToDeparture = departureDate
    ? Math.ceil((new Date(departureDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;

  const urgencyColor =
    daysToDeparture !== null
      ? daysToDeparture <= 0
        ? "text-danger bg-danger/10 border-danger/30"
        : daysToDeparture <= 3
          ? "text-danger bg-danger/10 border-danger/30"
          : daysToDeparture <= 7
            ? "text-warning bg-warning-bg/50 border-warning/30"
            : "text-success bg-success/10 border-success/20"
      : "";

  async function saveInlineEdits() {
    setEditSaving(true);
    try {
      await updateBoardingCard(card.id, {
        pnr: pnr || null,
        airline: airline || null,
        departure_date: departureDate || null,
        notes: notes || null,
        tags,
        briefing_date: briefingDate || null,
        briefing_url: briefingUrl || null,
      });
      toast.success("Card atualizado!");
      setEditDirty(false);
      setIsEditing(false);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleItem(i: number) {
    const next = checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const next = [...checklist, { label: newItem.trim(), done: false }];
    setChecklist(next);
    setNewItem("");
    await updateBoardingCardChecklist(card.id, next);
  }

  async function removeItem(i: number) {
    const next = checklist.filter((_, j) => j !== i);
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setNewTag("");
    setEditDirty(true);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    setEditDirty(true);
  }

  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <div className="font-mono text-sm font-bold text-foreground">{pnr || "Sem Localizador"}</div>
            <div className="text-xs text-muted-foreground">{airline || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {editDirty && (
              <button
                type="button"
                onClick={saveInlineEdits}
                disabled={editSaving}
                className="flex items-center gap-1.5 h-7 rounded-md bg-brand text-brand-foreground px-3 text-xs font-semibold"
              >
                {editSaving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded border border-border p-1 hover:bg-surface-alt ${isEditing ? "bg-brand/10 border-brand text-brand" : ""}`}
              title={isEditing ? "Visualizar Informações" : "Editar Informações"}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border p-1 hover:bg-surface-alt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Trip info */}
          {card.trip_title && (
            <div className="rounded-lg border border-border bg-surface-alt/40 p-3 text-xs">
              <div className="font-semibold text-foreground">{card.trip_title}</div>
              {card.trip_destination && (
                <div className="text-muted-foreground">{card.trip_destination}</div>
              )}
            </div>
          )}

          {/* Proposta Original Vincular */}
          {card.proposal_details && (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Proposta Original
              </div>
              <div className="text-xs font-bold text-foreground">{card.proposal_details.title}</div>

              {/* Voos da Proposta */}
              {card.proposal_details.flights && card.proposal_details.flights.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    Voos Propostos:
                  </div>
                  {card.proposal_details.flights.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs rounded border border-border/50 p-2 bg-surface-alt/10"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {f.origin} ➔ {f.destination}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {f.airline} · {f.flight_number || "Sem nº"} ·{" "}
                          {f.date ? new Date(f.date).toLocaleDateString("pt-BR") : "S/Data"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAirline(f.airline ?? "");
                          setDepartureDate(f.date ? f.date.split("T")[0] : "");
                          setEditDirty(true);
                          toast.success(
                            "Dados do voo importados! Clique em 'Salvar alterações' no topo para registrar.",
                          );
                        }}
                        className="h-6 rounded bg-brand/10 text-brand text-[10px] font-bold px-2 hover:bg-brand/20 transition-colors shrink-0"
                      >
                        Importar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hotéis da Proposta */}
              {card.proposal_details.hotels && card.proposal_details.hotels.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    Hotéis Propostos:
                  </div>
                  {card.proposal_details.hotels.map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs rounded border border-border/50 p-2 bg-surface-alt/10"
                    >
                      <div className="font-semibold text-foreground">
                        {h.name} ({h.city})
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Check-in:{" "}
                        {h.checkin ? new Date(h.checkin).toLocaleDateString("pt-BR") : "—"} ·
                        Check-out:{" "}
                        {h.checkout ? new Date(h.checkout).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prazo de embarque */}
          {daysToDeparture !== null && (
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${urgencyColor}`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {daysToDeparture <= 0
                  ? "⚠ EMBARQUE HOJE ou PASSADO!"
                  : `Embarque em ${daysToDeparture} dia${daysToDeparture !== 1 ? "s" : ""}`}
              </div>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand border-b border-border pb-2">
                Dados do Voo & Briefing
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Localizador da Reserva</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{pnr || "Pendente"}</span>
                    {tags.includes("auto_dispatch_enabled") && (
                      <span className="text-[9px] uppercase tracking-wider font-bold bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-full">
                        Auto-Release
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Cia / Operadora</span>
                  <span className="font-semibold text-foreground">{airline || "Pendente"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Data de Embarque</span>
                  <span className="font-semibold text-foreground">
                    {departureDate
                      ? new Date(departureDate + "T00:00:00").toLocaleDateString("pt-BR")
                      : "Pendente"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Reunião de Briefing</span>
                  <span className="font-semibold text-foreground">
                    {briefingDate ? new Date(briefingDate).toLocaleString("pt-BR") : "Não agendada"}
                  </span>
                </div>
                {briefingUrl && (
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Link da Reunião</span>
                    <a
                      href={briefingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline font-semibold"
                    >
                      {briefingUrl}
                    </a>
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Tags / Alertas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 text-[11px] font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Edição inline: PNR, Cia, Data */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Dados do Voo
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Localizador da Reserva
                    </label>
                    <input
                      type="text"
                      value={pnr}
                      onChange={(e) => {
                        setPnr(e.target.value);
                        setEditDirty(true);
                      }}
                      placeholder="ABC123"
                      className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Cia / Operadora
                    </label>
                    <input
                      type="text"
                      value={airline}
                      onChange={(e) => {
                        setAirline(e.target.value);
                        setEditDirty(true);
                      }}
                      placeholder="LATAM, GOL…"
                      className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">
                    Data de Embarque
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => {
                      setDepartureDate(e.target.value);
                      setEditDirty(true);
                    }}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Reunião de Briefing
                    </label>
                    <input
                      type="datetime-local"
                      value={briefingDate ? briefingDate.slice(0, 16) : ""}
                      onChange={(e) => {
                        setBriefingDate(e.target.value);
                        setEditDirty(true);
                      }}
                      className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Link da Reunião
                    </label>
                    <input
                      type="text"
                      value={briefingUrl}
                      onChange={(e) => {
                        setBriefingUrl(e.target.value);
                        setEditDirty(true);
                      }}
                      placeholder="https://meet.google.com/..."
                      className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <label className="flex items-start gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 rounded border-border text-brand focus:ring-brand"
                      checked={tags.includes("auto_dispatch_enabled")}
                      onChange={(e) => {
                        const newTags = e.target.checked
                          ? [...tags, "auto_dispatch_enabled"]
                          : tags.filter(t => t !== "auto_dispatch_enabled");
                        setTags(newTags);
                        setEditDirty(true);
                      }}
                    />
                    <div>
                      <div>Disparo Automático (Liberar embarque automático)</div>
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">
                        Se ativado, o sistema liberará os vouchers e localizadores automaticamente assim que a IA/OCR conciliar o pagamento. Desative para revisão manual (erros de loc, pendências).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Tags / Alertas
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Presets rápidos */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {PRESET_TAGS.filter((t) => !tags.includes(t))
                    .slice(0, 5)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="rounded-full border border-border bg-surface-alt px-2 py-0.5 text-[10px] text-muted-foreground hover:border-warning hover:text-warning transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(newTag);
                      }
                    }}
                    placeholder="Nova tag personalizada…"
                    className="h-8 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(newTag)}
                    className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-surface-alt text-foreground"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Web Check-in Link */}
          <PrimaryButton
            className="w-full h-9 text-xs gap-2 font-bold uppercase tracking-widest bg-brand/10 text-brand hover:bg-brand/20 border-none"
            onClick={() => {
              const url = `${window.location.origin}/m/checkin/${card.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copiado para a área de transferência!");
            }}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Link Web Check-in (Cliente)
          </PrimaryButton>

          {/* CHECKLIST */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Checklist operacional
              </h3>
              {checklist.length > 0 && (
                <span
                  className={`text-[11px] font-semibold ${
                    done === checklist.length ? "text-success" : "text-warning"
                  }`}
                >
                  {done}/{checklist.length} concluídos
                </span>
              )}
            </div>
            <div className="space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group/item">
                  <button type="button" onClick={() => toggleItem(i)} className="shrink-0">
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-success" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm text-foreground ${item.done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Novo item…"
                className="h-8 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
              />
              <button
                type="button"
                onClick={addItem}
                className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-surface-alt text-foreground"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Notas livres */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Notas do Operador
            </div>
            {!isEditing ? (
              <p className="text-xs text-foreground/80 leading-relaxed bg-surface-alt/30 p-2.5 rounded-lg border border-border/40 whitespace-pre-line">
                {notes || "Nenhuma observação cadastrada."}
              </p>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setEditDirty(true);
                }}
                placeholder="Observações internas sobre este embarque…"
                rows={3}
                className="w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-xs outline-none focus:border-border-strong resize-none text-foreground"
              />
            )}
          </div>

          {/* Alerts do sistema */}
          {card.alerts && card.alerts.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-bg p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Alertas do Sistema
              </div>
              {card.alerts.map((a, i) => (
                <div key={i} className="text-xs text-warning">
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* Passageiros */}
          {(card.passengers_count ?? 0) > 0 && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" /> Passageiros
              </div>
              <div className="text-2xl font-bold text-foreground">{card.passengers_count}</div>
            </div>
          )}

          {/* Suporte / Chamados */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Chamados de Suporte
              </div>
              {!showTicketForm && (
                <button
                  type="button"
                  onClick={() => setShowTicketForm(true)}
                  className="text-[10px] font-bold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  + Abrir Chamado
                </button>
              )}
            </div>

            {showTicketForm && (
              <div className="rounded-xl border border-border p-3 space-y-3 bg-surface-alt/20 text-xs">
                <div className="font-semibold text-foreground">Abrir Novo Chamado</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    placeholder="Título do chamado (ex: Atraso no voo)"
                    className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                  />
                  <textarea
                    rows={2}
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Descrição / Detalhes..."
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs outline-none focus:border-border-strong resize-none text-foreground"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface text-xs px-2 text-foreground"
                    >
                      <option value="trip">Viagem</option>
                      <option value="financial">Financeiro</option>
                      <option value="complaint">Reclamação</option>
                      <option value="refund">Reembolso</option>
                    </select>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface text-xs px-2 text-foreground"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    disabled={createTicket.isPending || !ticketTitle}
                    onClick={() => createTicket.mutate()}
                    className="h-7 rounded bg-brand text-brand-foreground text-xs font-semibold px-3 hover:bg-brand/95"
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTicketForm(false);
                      setTicketTitle("");
                      setTicketDesc("");
                    }}
                    className="h-7 rounded border border-border text-xs px-3 hover:bg-surface-alt text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {ticketsQ.isLoading && (
              <p className="text-[10px] text-muted-foreground">Carregando chamados...</p>
            )}

            {ticketsQ.data && ticketsQ.data.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ticketsQ.data.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border border-border/60 rounded-lg p-2.5 text-xs bg-surface-alt/10"
                  >
                    <div>
                      <div className="font-mono text-[9px] text-muted-foreground">{t.code}</div>
                      <Link
                        to="/agency/$slug/support/$ticket_id"
                        params={{ slug: slug!, ticket_id: t.id }}
                        className="font-semibold text-foreground hover:text-brand hover:underline"
                      >
                        {t.title}
                      </Link>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          t.status === "resolved"
                            ? "bg-success/15 text-success"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {t.status === "resolved" ? "Resolvido" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Nenhum chamado de suporte aberto para esta viagem.
              </p>
            )}
          </div>

          {/* Atividades Timeline */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Atividades / Histórico
            </div>

            {activitiesQ.isLoading && (
              <p className="text-[10px] text-muted-foreground">Carregando histórico...</p>
            )}

            {activitiesQ.data && activitiesQ.data.length > 0 ? (
              <div className="relative border-l border-border/60 pl-3.5 space-y-3.5 ml-1.5 max-h-52 overflow-y-auto">
                {activitiesQ.data.map((act: any) => (
                  <div key={act.id} className="relative text-[10px] text-foreground/80">
                    <div className="absolute -left-[20px] top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" />
                    <div className="font-semibold text-foreground">{act.description}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                      {new Date(act.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Nenhuma atividade registrada ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
