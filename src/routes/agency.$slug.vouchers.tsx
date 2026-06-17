import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Search, Plane, Download, Eye, MapPin, Calendar, Users, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { StatusBadge, fmtDate, GhostButton } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers · TravelOS" }] }),
  component: VouchersPage,
});

type Voucher = {
  id: string;
  trip_id: string;
  destination: string | null;
  source_type: string;
  template: string;
  general_locator: string | null;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
  passengers: unknown[];
};

function VouchersPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/vouchers" });
  const [page, setPage] = useState(1);
  const [qSearch, setQSearch] = useState("");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const pageSize = 12;

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["vouchers", agency?.id, page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("vouchers")
        .select(
          "id, trip_id, destination, source_type, template, general_locator, pdf_url, generated_at, created_at, passengers",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: data as unknown as Voucher[], count: count ?? 0 };
    },
  });

  const filteredVouchers = (q.data?.data || []).filter(
    (v) =>
      !qSearch ||
      v.destination?.toLowerCase().includes(qSearch.toLowerCase()) ||
      v.general_locator?.toLowerCase().includes(qSearch.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Vouchers"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            placeholder="Buscar por destino ou localizador..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pl-1 sm:pl-2">
          {q.data?.count ?? 0} vouchers
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
        {q.isLoading && <div className="text-sm text-muted-foreground p-4">Carregando vouchers…</div>}

        {q.data && q.data.data.length === 0 && (
          <EmptyState
            title="Nenhum voucher emitido"
            description="Gere vouchers manualmente ou importe PDFs da operadora a partir da tela de cada roteiro de viagem."
          />
        )}

        {q.data && q.data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVouchers.map((v) => (
                <div
                  key={v.id}
                  className="group relative flex flex-col rounded-2xl border border-border bg-surface overflow-hidden transition-all hover:border-brand/40"
                >
                  {/* Ticket "Cutouts" on the sides */}
                  <div className="absolute top-20 -left-2 w-4 h-4 bg-background border-r border-border rounded-full z-10" />
                  <div className="absolute top-20 -right-2 w-4 h-4 bg-background border-l border-border rounded-full z-10" />

                  {/* Header (Top section of ticket) */}
                  <div className="p-5 border-b border-dashed border-border/60 bg-brand/5 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                        {v.template === "flight" ? (
                          <Plane className="h-5 w-5" />
                        ) : (
                          <Ticket className="h-5 w-5" />
                        )}
                      </div>
                      <StatusBadge tone={v.source_type === "operator_pdf" ? "info" : "neutral"}>
                        {v.source_type === "operator_pdf" ? "PDF Importado" : "Gerado via OS"}
                      </StatusBadge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground line-clamp-1">
                        {v.destination ?? "Destino Indefinido"}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        <MapPin className="h-3.5 w-3.5" /> Viagem
                      </div>
                    </div>
                  </div>

                  {/* Body (Bottom section of ticket) */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Localizador Geral
                        </div>
                        <div className="font-mono text-sm font-semibold text-foreground">
                          {v.general_locator ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Emissão
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmtDate(v.generated_at ?? v.created_at)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Passageiros
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {(v.passengers ?? []).length} pax inclusos neste voucher
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                      <Link
                        to="/agency/$slug/trips/$id/vouchers"
                        params={{ slug, id: v.trip_id }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-surface-alt hover:bg-surface-alt/80 px-4 py-2.5 text-xs font-bold transition-colors"
                      >
                        <Eye className="h-4 w-4" /> Visualizar Roteiro
                      </Link>
                      {v.pdf_url && (
                        <a
                          href={v.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                          title="Baixar PDF Original"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
              <div className="text-xs text-muted-foreground font-medium">
                Mostrando página <span className="font-bold text-foreground">{page}</span> de{" "}
                {Math.ceil(q.data.count / pageSize) || 1}
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
                >
                  Anterior
                </GhostButton>
                <GhostButton
                  disabled={page * pageSize >= q.data.count}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
                >
                  Próxima
                </GhostButton>
              </div>
            </div>
          </>
        )}
      </div>

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="vouchers"
          moduleName="Vouchers"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
