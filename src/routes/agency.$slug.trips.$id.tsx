import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  ReceiptText,
  Users,
  Ticket,
  FileSignature,
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  Eye,
  Send,
  Plane,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/agency/$slug/trips/$id")({
  head: () => ({ meta: [{ title: "Viagem · TravelOS" }] }),
  component: TripLayout,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysToTrip(travelStart?: string | null): number | null {
  if (!travelStart) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(travelStart + "T00:00:00");
  const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function TripLayout() {
  const { slug, id } = useParams({ strict: false }) as { slug: string; id: string };
  const { agency } = useAgency();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paxQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_passengers").select("id").eq("trip_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Duplicar viagem ───────────────────────────────────────────
  const dupMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("duplicate_trip", { p_trip_id: id });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success("Viagem duplicada! Abrindo a cópia...");
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  // ─── Excluir viagem ────────────────────────────────────────────
  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Viagem excluída.");
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/agency/$slug/trips", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  // ─── Alterar status rápido ─────────────────────────────────────
  const statusMut = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("trips").update({ status: newStatus } as any).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (tripQ.isLoading) return <div className="text-sm text-muted-foreground p-6">Carregando…</div>;
  if (!tripQ.data)
    return <div className="text-sm text-muted-foreground p-6">Viagem não encontrada.</div>;

  const t = tripQ.data;

  const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
    planning: "neutral",
    confirmed: "info",
    in_progress: "warning",
    completed: "success",
    cancelled: "danger",
  };

  const STATUS_LABEL: Record<string, string> = {
    planning: "Planejamento",
    confirmed: "Confirmada",
    in_progress: "Em Andamento",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  const ALL_STATUSES = ["planning", "confirmed", "in_progress", "completed", "cancelled"];

  const daysToTrip = getDaysToTrip(t.travel_start);
  const isFuture = daysToTrip !== null && daysToTrip > 0;
  const isToday = daysToTrip === 0;

  // ─── "Enviar para Cliente" via WhatsApp ────────────────────────
  function handleSendToClient() {
    const url = `${window.location.origin}/client/trips/${id}`;
    const text = `Olá! Aqui está a área exclusiva da sua viagem${t.destination ? ` para ${t.destination}` : ""}. Acesse todos os seus documentos, itinerário e informações: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="flex flex-col h-full w-full pb-10">
      {/* ── Nav + Ações ──────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/agency/$slug/trips"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-surface-alt px-2.5 py-1.5 rounded-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Viagens
        </Link>

        <div className="flex items-center gap-2">
          {/* Ver como Cliente */}
          <button
            onClick={() => window.open(`/client/trips/${id}`, "_blank")}
            title="Ver como cliente"
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> Ver como Cliente
          </button>

          {/* Enviar para Cliente */}
          <button
            onClick={handleSendToClient}
            title="Enviar link da viagem ao cliente via WhatsApp"
            className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors"
          >
            <Send className="h-3.5 w-3.5" /> Enviar ao Cliente
          </button>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Alterar Status
              </div>
              {ALL_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => statusMut.mutate(s)}
                  disabled={t.status === s || statusMut.isPending}
                  className={cn(
                    "cursor-pointer text-xs capitalize",
                    t.status === s && "font-bold text-brand",
                  )}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  {STATUS_LABEL[s]}
                  {t.status === s && " ✓"}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => dupMut.mutate()}
                disabled={dupMut.isPending}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicar Viagem
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (
                    window.confirm(
                      `Excluir a viagem "${t.title}"?\nEsta ação não pode ser desfeita e remove todos os dados associados.`,
                    )
                  ) {
                    delMut.mutate();
                  }
                }}
                disabled={delMut.isPending}
                className="cursor-pointer text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir Viagem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Header da Viagem ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-brand font-bold bg-brand/10 px-2 py-0.5 rounded">
              #{t.number}
            </span>
            <StatusBadge tone={STATUS_TONE[t.status] ?? "neutral"}>
              {STATUS_LABEL[t.status] ?? t.status}
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {t.destination && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {t.destination}
              </div>
            )}
            {(t.travel_start || t.travel_end) && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {fmtDate(t.travel_start)} →{" "}
                {fmtDate(t.travel_end)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Barra de Countdown / Status Rápido ──────────────────── */}
      {t.status !== "cancelled" && daysToTrip !== null && (
        <div
          className={cn(
            "mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
            isToday
              ? "border-warning/30 bg-warning/5"
              : isFuture
                ? "border-brand/20 bg-brand/5"
                : t.status === "completed"
                  ? "border-success/20 bg-success/5"
                  : "border-border bg-surface-alt/50",
          )}
        >
          {isToday ? (
            <>
              <Plane className="h-4 w-4 text-warning animate-bounce" />
              <span className="font-bold text-warning">Embarque hoje!</span>
            </>
          ) : isFuture ? (
            <>
              <Clock className="h-4 w-4 text-brand" />
              <span className="font-semibold text-foreground">
                Faltam <span className="text-brand font-bold">{daysToTrip} dias</span> para o embarque
              </span>
            </>
          ) : t.status === "completed" ? (
            <>
              <Plane className="h-4 w-4 text-success" />
              <span className="font-semibold text-success">Viagem concluída com sucesso!</span>
            </>
          ) : (
            <>
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Viagem ocorreu há {Math.abs(daysToTrip)} dias
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="border-b border-border/60 mb-6">
        <nav className="flex gap-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
          <Link
            to="/agency/$slug/trips/$id"
            params={{ slug, id }}
            activeOptions={{ exact: true }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <ReceiptText className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Visão Geral
          </Link>
          <Link
            to="/agency/$slug/trips/$id/financial"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <span className="opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100">
              R$
            </span>{" "}
            Financeiro
          </Link>
          <Link
            to="/agency/$slug/trips/$id/passengers"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <Users className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Passageiros ({paxQ.data?.length ?? 0})
          </Link>
          <Link
            to="/agency/$slug/trips/$id/vouchers"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <Ticket className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Vouchers
          </Link>
          <Link
            to="/agency/$slug/trips/$id/contract"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <FileSignature className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Contrato Jurídico
          </Link>
        </nav>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
