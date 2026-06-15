import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Search, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { fetchGroupTours } from "@/services/tours";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { NewGroupTourWizard } from "@/components/group-tours/NewGroupTourWizard";
import { Input, PrimaryButton, StatusBadge, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/group-tours")({
  head: () => ({ meta: [{ title: "Excursões em grupo · TravelOS" }] }),
  component: GroupToursPage,
});

type Tour = {
  id: string;
  title: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  base_price: number;
  total_seats: number;
  reserved_seats: number;
  status: string;
  is_public: boolean;
  slug: string;
  bus_layout_id: string | null;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function GroupToursPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/group-tours" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours", agency?.id],
    queryFn: () => fetchGroupTours(agency!.id),
  });

  const filtered = useMemo(() => {
    return (q.data ?? []).filter((t) => {
      const matchSearch =
        !qSearch ||
        t.title.toLowerCase().includes(qSearch.toLowerCase()) ||
        (t.destination ?? "").toLowerCase().includes(qSearch.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [q.data, qSearch, statusFilter]);

  return (
    <>
      <PageHeader
        title="Excursões em grupo"
        description="Pacotes recorrentes com vagas, inscrições e itinerário."
        actions={
          <PrimaryButton onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nova excursão
          </PrimaryButton>
        }
      />

      {/* Search + Filter bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            placeholder="Buscar excursão ou destino..."
            className="pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs shrink-0">
          {["all", "draft", "open", "confirmed", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1.5 font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-surface-alt text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all"
                ? "Todos"
                : s === "draft"
                  ? "Rascunho"
                  : s === "open"
                    ? "Aberta"
                    : s === "confirmed"
                      ? "Confirmada"
                      : s === "completed"
                        ? "Concluída"
                        : "Cancelada"}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {filtered.length === 0 && !q.isLoading && (
        <EmptyState title="Sem excursões" description="Crie uma excursão para abrir inscrições." />
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const occupancy = t.total_seats
              ? Math.round((t.reserved_seats / t.total_seats) * 100)
              : 0;
            return (
              <Link
                key={t.id}
                to="/agency/$slug/group-tours/$id"
                params={{ slug, id: t.id }}
                className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {t.destination ?? "—"}
                      {t.bus_layout_id && (
                        <span className="ml-2 flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h8M8 11h8m-8 4h8m-9 4h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>{" "}
                          Ônibus
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge
                    tone={
                      t.status === "open"
                        ? "success"
                        : t.status === "confirmed"
                          ? "info"
                          : t.status === "completed"
                            ? "neutral"
                            : t.status === "cancelled"
                              ? "danger"
                              : "neutral"
                    }
                  >
                    {t.status === "draft"
                      ? "Rascunho"
                      : t.status === "open"
                        ? "Aberta"
                        : t.status === "confirmed"
                          ? "Confirmada"
                          : t.status === "completed"
                            ? "Concluída"
                            : t.status === "cancelled"
                              ? "Cancelada"
                              : t.status}
                  </StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Saída</div>
                    <div>{fmtDate(t.departure_date)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Retorno</div>
                    <div>{fmtDate(t.return_date)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Preço</div>
                    <div className="font-mono">{money(Number(t.base_price))}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Vagas
                    </div>
                    <div>
                      {t.reserved_seats}/{t.total_seats}
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-alt">
                  <div className="h-full bg-primary" style={{ width: `${occupancy}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open && agency && (
        <NewGroupTourWizard
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["group-tours", agency.id] });
          }}
        />
      )}
    </>
  );
}
