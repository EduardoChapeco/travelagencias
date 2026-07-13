import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Search, Settings2, AlertCircle } from "lucide-react";
import { fetchGroupTours } from "@/services/tours";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { NewGroupTourWizard } from "@/components/group-tours/NewGroupTourWizard";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/formatters";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agency/$slug/group-tours/")({
  head: ({ context }: any) => ({ meta: [{ title: `Excursões em grupo · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: GroupToursPage,
});

function GroupToursPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/group-tours" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

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
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
              <PageHeader
          title="Excursões"
          search={{
            value: qSearch,
            onChange: setQSearch,
            placeholder: "Buscar excursão...",
          }}
          filters={[
            { label: "Todos", value: "all" },
            { label: "Rascunho", value: "draft" },
            { label: "Aberta", value: "open" },
            { label: "Confirmada", value: "confirmed" },
            { label: "Concluída", value: "completed" },
            { label: "Cancelada", value: "cancelled" },
          ]}
          activeFilter={statusFilter}
          onFilterChange={(v) => setStatusFilter(v)}
          actions={
            isAgencyAdmin && (
              <Button
                onClick={() => setAdminPanelOpen(true)}
                className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Administrar Excursões"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            )
          }
          primaryAction={
            <ModuleActionButton
        label="Nova Excursão"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setOpen(true)}
            />
          }
        />

      <div className="page-content page-section dock-offset">
        {q.isLoading && <div className="text-sm text-muted-foreground animate-pulse p-4">Carregando excursões…</div>}
        {q.isError && (
          <div className="p-4 rounded-[var(--radius-card)] glass-error text-xs flex items-center gap-2 m-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Erro ao carregar lista de excursões. Verifique sua conexão ou permissões.</span>
          </div>
        )}
        {filtered.length === 0 && !q.isLoading && !q.isError && (
          <EmptyState
            title="Sem excursões"
            description="Crie uma excursão para abrir inscrições."
          />
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
                  className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 hover:border-border-strong transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="ds-card-title text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {t.destination ?? "—"}
                        {t.bus_layout_id && (
                          <span className="ml-2 flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 ds-meta font-bold text-brand">
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
                  <div className="mt-2 h-1.5 overflow-hidden rounded glass bg-white/5 border-white/10">
                    <div className="h-full bg-primary" style={{ width: `${occupancy}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

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

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="group-tours"
          moduleName="Excursões"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
