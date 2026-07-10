import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, FileText, Building2, Calendar, FileSignature, ArrowRight, User, Settings2, ChevronDown, BookOpen, AlertCircle, } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { GhostButton } from "@/components/ui/button";
import { money, fmtDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ContractClauseLibrary } from "@/components/contracts/ContractClauseLibrary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/agency/$slug/contracts")({
  head: ({ context }: any) => ({ meta: [{ title: `Contratos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ContractsPage,
});

type ContractRow = {
  id: string;
  trip_id: string;
  version: string;
  status: string;
  total_value: number;
  signed_at: string | null;
  created_at: string;
  package_summary: string | null;
  client_data: { name?: string } | null;
};

const STATUS_MAP: Record<string, { label: string; tone: any }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  sent: { label: "Enviado", tone: "info" },
  viewed: { label: "Visualizado", tone: "warning" },
  signed: { label: "Assinado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

function ContractsPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/contracts" });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("list");
  const debouncedSearch = useDebounce(search, 400);
  const pageSize = 20;

  const q = useQuery({
    enabled: !!agency && activeTab === "list",
    queryKey: ["contracts", agency?.id, page, debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(
          "id, trip_id, version, status, total_value, signed_at, created_at, package_summary, client_data",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // We don't easily have 'client_name' as a top level column, but we can search in package_summary
      if (debouncedSearch.trim()) {
        query = query.ilike("package_summary", `%${debouncedSearch}%`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: (data as unknown as ContractRow[]) ?? [], count: count ?? 0 };
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Contratos"
          search={activeTab === "list" ? {
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: "Buscar por pacote...",
          } : undefined}
          filters={[
            { label: "Lista de Contratos", value: "list" },
            ...(isAgencyAdmin ? [
              { label: "Biblioteca de Cláusulas", value: "clauses" },
              { label: "Configurações", value: "admin" },
            ] : []),
          ]}
          activeFilter={activeTab}
          onFilterChange={(v) => setActiveTab(v as any)}
          actions={
            activeTab === "list" ? (
              <select
                value={statusFilter}
                onChange={(e: any) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-[11px] font-semibold bg-transparent hover:bg-white/5 rounded-full text-white/70 hover:text-white outline-none px-2 cursor-pointer transition-colors"
              >
                <option value="all" className="bg-neutral-900 text-white">Todos Status</option>
                <option value="draft" className="bg-neutral-900 text-white">Rascunho</option>
                <option value="sent" className="bg-neutral-900 text-white">Enviado</option>
                <option value="viewed" className="bg-neutral-900 text-white">Visualizado</option>
                <option value="signed" className="bg-neutral-900 text-white">Assinado</option>
                <option value="cancelled" className="bg-neutral-900 text-white">Cancelado</option>
              </select>
            ) : undefined
          }
        />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        {/* ── Visualização de Lista de Contratos (Pesquisa e Filtros) ──────────────────── */}
        {activeTab === "list" && (
          <>
            <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 flex flex-col gap-4 pb-24">
              {q.isLoading && <div className="text-sm text-muted-foreground p-4">Carregando…</div>}

              {q.isError && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60">
                  <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Contratos</h3>
                  <p className="text-xs text-red-600 mt-1">
                    {q.error instanceof Error ? q.error.message : "Erro desconhecido."}
                  </p>
                </div>
              )}

              {q.data?.data.length === 0 && !debouncedSearch && statusFilter === "all" ? (
                <EmptyState
                  title="Nenhum contrato gerado"
                  description="Acesse uma viagem confirmada e clique em 'Gerar Contrato' para iniciar o fluxo de assinaturas."
                />
              ) : q.data?.data.length === 0 ? (
                <EmptyState
                  title="Nenhum contrato encontrado"
                  description="Altere os filtros ou a busca para ver resultados."
                />
              ) : null}

        {q.data && q.data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {q.data.data.map((c) => {
                const statusInfo = STATUS_MAP[c.status] || { label: c.status, tone: "neutral" };

                return (
                  <div
                    key={c.id}
                    className="group flex flex-col rounded-[var(--radius-card)] border-none glass-card border-none p-5 transition-all hover:border-brand/40 shadow-xs"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border-none",
                            c.status === "signed"
                              ? "bg-success/10 text-success"
                              : "glass bg-white/5 border-white/10 text-muted-foreground",
                          )}
                        >
                          {c.status === "signed" ? (
                            <FileSignature className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-brand transition-colors">
                            Contrato v{c.version}
                          </h3>
                          <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                            Viagem vinculada
                          </div>
                        </div>
                      </div>
                      <StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>
                    </div>

                    {c.package_summary && (
                      <p className="text-sm text-foreground/80 leading-relaxed mb-4 line-clamp-2 min-h-[40px]">
                        {c.package_summary}
                      </p>
                    )}

                    <div className="space-y-3 mb-5 mt-auto glass bg-white/5 border-white/10/40 rounded-[var(--radius-card)] p-4 border-none/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground font-medium whitespace-nowrap">
                          <User className="h-4 w-4" /> Cliente
                        </span>
                        {(() => {
                          const clientNames = Array.isArray(c.client_data)
                            ? c.client_data.map((x: any) => x.name || x.full_name || "").filter(Boolean).join(", ")
                            : (c.client_data as any)?.name;
                          const displayNames = clientNames || "Não identificado";
                          return (
                            <span
                              className="font-semibold text-foreground truncate max-w-[150px] text-right"
                              title={displayNames}
                            >
                              {displayNames}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground font-medium">
                          <Calendar className="h-4 w-4" /> Gerado em
                        </span>
                        <span className="text-foreground">{fmtDate(c.created_at)}</span>
                      </div>
                      {c.signed_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground font-medium">
                            <FileSignature className="h-4 w-4 text-success" /> Assinado
                          </span>
                          <span className="text-foreground">{fmtDate(c.signed_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          Valor Total
                        </span>
                        <span className="font-mono text-lg font-bold text-foreground">
                          {money(Number(c.total_value))}
                        </span>
                      </div>
                      <Link
                        to="/agency/$slug/trips/$id/contract"
                        params={{ slug, id: c.trip_id }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand/10 text-brand px-4 py-2 text-xs font-bold transition-colors hover:bg-brand hover:text-brand-foreground"
                      >
                        Acessar <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
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
                  className="h-9 px-4 text-xs font-semibold rounded-full border-none"
                >
                  Anterior
                </GhostButton>
                <GhostButton
                  disabled={page * pageSize >= q.data.count}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 px-4 text-xs font-semibold rounded-full border-none"
                >
                  Próxima
                </GhostButton>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )}

        {/* ── Visualização de Biblioteca de Cláusulas Contratuais (Inline) ───────────── */}
        {activeTab === "clauses" && agency && (
          <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0">
            <ContractClauseLibrary agencyId={agency.id} isInline={true} />
          </div>
        )}
 
        {/* ── Visualização do Painel de Administrador (Inline) ───────────────────────── */}
        {activeTab === "admin" && agency && (
          <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0">
            <ModuleAdminPanel
              moduleKey="contracts"
              moduleName="Contratos"
              agencyId={agency.id}
              isInline={true}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}
