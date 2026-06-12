import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  MessageSquare,
  Trash,
  ExternalLink,
  Plus,
  Filter,
  Users,
  CalendarDays,
  X,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  fetchAgencyMeetings,
  fetchAgencyUsers,
  createLeadMeeting,
  deleteLeadMeeting,
  syncMeetingToGoogleCalendar,
  type LeadMeeting,
} from "@/services/crm";
import { Field, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/calendar")({
  head: () => ({ meta: [{ title: "Agenda · TravelOS" }] }),
  component: CalendarPage,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MEETING_TYPE_LABELS: Record<string, string> = {
  call: "Telefone / Voz",
  video: "Vídeo / Meet",
  in_person: "Presencial",
  whatsapp: "Whats / Follow",
};

const MEETING_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/30 dark:text-blue-400",
  video: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/30 dark:text-purple-400",
  in_person: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/30 dark:text-amber-400",
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/30 dark:text-emerald-400",
};

function CalendarPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/calendar" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Filters state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  // Create event form state
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    lead_id: "",
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "call",
  });

  const meetingsQ = useQuery({
    enabled: !!agency?.id,
    queryKey: ["agency-meetings", agency?.id],
    queryFn: () => fetchAgencyMeetings(agency!.id),
  });

  const usersQ = useQuery({
    enabled: !!agency?.id,
    queryKey: ["agency-users", agency?.id],
    queryFn: () => fetchAgencyUsers(agency!.id),
  });

  const leadsQ = useQuery({
    enabled: !!agency?.id,
    queryKey: ["calendar-leads", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  }, [year, month, daysInMonth, firstDayIndex, daysInPrevMonth]);

  const filteredMeetings = useMemo(() => {
    let list = meetingsQ.data || [];
    if (filterType !== "all") {
      list = list.filter((m) => m.meeting_type === filterType);
    }
    // Note: We can filter by owner/user if needed, though meetings don't have owner_id directly.
    // They are linked to leads, so we can filter by the lead's owner_id.
    if (filterUser !== "all" && leadsQ.data) {
      list = list.filter((m) => {
        const matchingLead = (m as any).leads;
        // Fetch raw leads array to find the owner of this lead
        const leadDetails = leadsQ.data.find((l) => l.id === m.lead_id);
        return leadDetails && (leadDetails as any).owner_id === filterUser;
      });
    }
    return list;
  }, [meetingsQ.data, filterType, filterUser, leadsQ.data]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleCellClick = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}T09:00`;
    setMeetingForm((prev) => ({
      ...prev,
      scheduled_at: formattedDate,
    }));
    setNewEventOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda & Lembretes"
        description="Controle mensal de reuniões de briefing, follow-ups de cotações e compromissos"
        actions={
          <PrimaryButton onClick={() => setNewEventOpen(true)} className="rounded-full gap-1.5 text-xs font-bold h-9">
            <Plus className="h-4 w-4" /> Novo Compromisso
          </PrimaryButton>
        }
      />

      {/* Filters & Navigation Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-alt/45 border border-border/50 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Filtros:</span>
          </div>

          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 text-xs bg-background border-border/80 w-40 rounded-lg"
          >
            <option value="all">Todos os tipos</option>
            <option value="call">📞 Telefone / Voz</option>
            <option value="video">💻 Vídeo / Meet</option>
            <option value="in_person">👤 Presencial</option>
            <option value="whatsapp">💬 WhatsApp / Follow</option>
          </Select>

          {usersQ.data && (
            <Select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="h-8 text-xs bg-background border-border/80 w-44 rounded-lg"
            >
              <option value="all">Todos os agentes</option>
              {usersQ.data.map((u: any) => (
                <option key={u.user_id} value={u.user_id || ""}>
                  👤 {u.user_name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Calendar Nav */}
        <div className="flex items-center gap-2.5 self-center">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 border border-border/80 hover:border-brand/40 bg-surface rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleToday}
            className="h-8 px-3 border border-border/80 hover:border-brand/40 bg-surface text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <span className="text-sm font-bold min-w-[120px] text-center text-foreground">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 border border-border/80 hover:border-brand/40 bg-surface rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-surface border border-border/70 rounded-xl overflow-hidden">
        {/* Day name headers */}
        <div className="grid grid-cols-7 border-b border-border bg-surface-alt/10">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-r border-border/40 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 grid-rows-6 divide-y divide-x divide-border/50 bg-border/20">
          {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
            const dateMeetings = getMeetingsForDate(date, filteredMeetings);
            const today = isToday(date);
            return (
              <div
                key={idx}
                onClick={() => handleCellClick(date)}
                className={`min-h-[100px] lg:min-h-[120px] bg-surface p-2 transition-colors hover:bg-surface-alt/15 relative flex flex-col justify-between cursor-pointer group ${
                  !isCurrentMonth ? "opacity-35" : ""
                } ${today ? "bg-brand/[0.02]" : ""}`}
              >
                {/* Day label */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                      today
                        ? "bg-brand text-brand-foreground font-black"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {dateMeetings.length > 0 && (
                    <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-brand/5 border border-brand/10 text-brand">
                      {dateMeetings.length}
                    </span>
                  )}
                </div>

                {/* Meetings list */}
                <div className="flex-1 mt-2.5 space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar">
                  {dateMeetings.slice(0, 3).map((meeting: any) => {
                    const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type] || "bg-muted text-muted-foreground border-border";
                    const isGoogle = !!meeting.google_event_id;
                    return (
                      <div
                        key={meeting.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMeeting(meeting);
                        }}
                        className={`text-[9px] font-bold p-1 rounded border truncate flex items-center justify-between gap-1 transition-all ${typeColor}`}
                        title={`${meeting.title} - ${meeting.leads?.name || "Sem Nome"}`}
                      >
                        <span className="truncate flex-1">
                          {meeting.title} ({meeting.leads?.name || "Lead"})
                        </span>
                        {isGoogle && (
                          <span className="shrink-0 text-[7px] font-bold px-0.5 rounded bg-success/10 text-success border border-success/20">
                            G
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {dateMeetings.length > 3 && (
                    <div className="text-[8px] font-bold text-muted-foreground text-center pt-0.5">
                      + {dateMeetings.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onPointerDown={() => setSelectedMeeting(null)}>
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 space-y-4" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">{selectedMeeting.title}</h3>
                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border inline-block mt-1.5 ${MEETING_TYPE_COLORS[selectedMeeting.meeting_type]}`}>
                  {MEETING_TYPE_LABELS[selectedMeeting.meeting_type] || selectedMeeting.meeting_type}
                </span>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {selectedMeeting.description && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Notas / Descrição</span>
                  <p className="bg-surface-alt/20 p-2.5 rounded-lg border border-border/50 text-foreground/80 leading-relaxed">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Data & Hora</span>
                  <span className="font-bold text-foreground">
                    {new Date(selectedMeeting.scheduled_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duração</span>
                  <span className="font-bold text-foreground">{selectedMeeting.duration_minutes} minutos</span>
                </div>
              </div>

              <div className="bg-surface-alt/10 border border-border p-3.5 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Lead Associado</span>
                  <span className="font-extrabold text-foreground text-sm block mt-0.5">
                    {selectedMeeting.leads?.name || "Não informado"}
                  </span>
                </div>
                {selectedMeeting.lead_id && (
                  <Link
                    to="/agency/$slug/crm/$lead_id"
                    params={{ slug, lead_id: selectedMeeting.lead_id }}
                    className="inline-flex h-8 items-center gap-1 px-3 bg-brand/5 hover:bg-brand/10 text-brand text-xs font-bold rounded-lg border border-brand/15 transition-colors"
                  >
                    Abrir Lead <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={async () => {
                    const toastId = toast.loading("Sincronizando com Google Agenda...");
                    try {
                      await syncMeetingToGoogleCalendar(selectedMeeting.id);
                      qc.invalidateQueries({ queryKey: ["agency-meetings", agency?.id] });
                      toast.success("Sincronizado com sucesso!", { id: toastId });
                      setSelectedMeeting(null);
                    } catch (err: any) {
                      toast.error(err.message || "Erro na sincronização", { id: toastId });
                    }
                  }}
                  className={`flex-1 h-9 rounded-lg font-bold text-xs uppercase border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMeeting.google_event_id
                      ? "bg-success/5 text-success border-success/25 cursor-default"
                      : "bg-surface border-border hover:border-brand/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {selectedMeeting.google_event_id ? "✓ Sincronizado com Google" : <><RefreshCw className="h-3.5 w-3.5" /> Sincronizar Google Agenda</>}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
              <GhostButton onClick={() => setSelectedMeeting(null)} className="h-8 text-xs font-bold">
                Fechar
              </GhostButton>
              <button
                onClick={async () => {
                  if (!confirm("Remover este compromisso permanentemente?")) return;
                  try {
                    await deleteLeadMeeting(selectedMeeting.id);
                    qc.invalidateQueries({ queryKey: ["agency-meetings", agency?.id] });
                    toast.success("Compromisso removido.");
                    setSelectedMeeting(null);
                  } catch (e) {
                    toast.error("Falha ao remover compromisso.");
                  }
                }}
                className="inline-flex h-8 items-center gap-1 px-3 bg-danger/5 hover:bg-danger/10 border border-danger/20 text-danger text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Trash className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {newEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onPointerDown={() => setNewEventOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!meetingForm.title || !meetingForm.scheduled_at || !meetingForm.lead_id) {
                toast.error("Título, data/hora e lead são obrigatórios.");
                return;
              }
              try {
                await createLeadMeeting({
                  lead_id: meetingForm.lead_id,
                  agency_id: agency!.id,
                  title: meetingForm.title,
                  description: meetingForm.description || null,
                  scheduled_at: new Date(meetingForm.scheduled_at).toISOString(),
                  duration_minutes: Number(meetingForm.duration_minutes),
                  meeting_type: meetingForm.meeting_type,
                });
                setMeetingForm({ lead_id: "", title: "", description: "", scheduled_at: "", duration_minutes: 30, meeting_type: "call" });
                setNewEventOpen(false);
                qc.invalidateQueries({ queryKey: ["agency-meetings", agency?.id] });
                toast.success("Compromisso agendado com sucesso!");
              } catch (err) {
                toast.error("Falha ao agendar compromisso.");
              }
            }}
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold text-foreground">Novo Compromisso</h3>
              <button
                type="button"
                onClick={() => setNewEventOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Associar ao Lead *">
                <Select
                  required
                  value={meetingForm.lead_id}
                  onChange={(e) => setMeetingForm({ ...meetingForm, lead_id: e.target.value })}
                  className="h-9 text-xs bg-background border-border/80 w-full"
                >
                  <option value="">Selecione um lead...</option>
                  {leadsQ.data?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Título do Compromisso *">
                <Input
                  required
                  placeholder="Ex: Reunião de Briefing"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </Field>

              <Field label="Descrição / Notas">
                <Input
                  placeholder="Ex: Alinhar destinos preferidos e orçamento"
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  className="h-9 text-xs"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data & Horário *">
                  <Input
                    type="datetime-local"
                    required
                    value={meetingForm.scheduled_at}
                    onChange={(e) => setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })}
                    className="h-9 text-xs"
                  />
                </Field>
                <Field label="Duração (minutos)">
                  <Input
                    type="number"
                    min={5}
                    value={meetingForm.duration_minutes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, duration_minutes: parseInt(e.target.value) || 30 })}
                    className="h-9 text-xs"
                  />
                </Field>
              </div>

              <Field label="Tipo de Evento">
                <Select
                  value={meetingForm.meeting_type}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}
                  className="h-9 text-xs bg-background border-border/80"
                >
                  <option value="call">📞 Chamada de Voz / Telefone</option>
                  <option value="video">💻 Vídeochamada (Meet / Zoom)</option>
                  <option value="in_person">👤 Reunião Presencial</option>
                  <option value="whatsapp">💬 WhatsApp / Follow-up</option>
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
              <GhostButton type="button" onClick={() => setNewEventOpen(false)} className="h-8 text-xs font-bold">
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit" className="h-8 text-xs font-bold px-4">
                Agendar Evento
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function getMeetingsForDate(date: Date, meetingsList: any[]) {
  return meetingsList.filter((m) => {
    const mDate = new Date(m.scheduled_at);
    return (
      mDate.getFullYear() === date.getFullYear() &&
      mDate.getMonth() === date.getMonth() &&
      mDate.getDate() === date.getDate()
    );
  });
}
