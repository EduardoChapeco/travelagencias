import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { useState } from "react";
import {
  Search,
  Loader2,
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { money, GhostButton } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar } from "@/components/shell/ModuleToolbar";

export const Route = createFileRoute("/agency/$slug/financial/ledger")({
  head: ({ context }: any) => ({ meta: [{ title: `Livro-Razão Contábil · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: LedgerDashboard,
});

type LedgerEntry = {
  id: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  entry_date: string;
  description: string;
  source_event: string;
  source_id: string;
  created_at: string;
};

export function LedgerDashboard() {
  const { slug } = useParams({ from: "/agency/$slug/financial/ledger" });
  const { agency } = useAgency();

  // Filters state
  const [search, setSearch] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Query to calculate consolidated totals (for metrics card)
  const totalsQ = useQuery({
    enabled: !!agency,
    queryKey: ["ledger-totals", agency?.id, search, accountCode],
    queryFn: async () => {
      let query = supabase
        .from("financial_ledger_entries")
        .select("debit_amount, credit_amount")
        .eq("agency_id", agency!.id);

      if (search) {
        query = query.ilike("description", `%${search}%`);
      }
      if (accountCode) {
        query = query.ilike("account_code", `%${accountCode}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalDebits = (data ?? []).reduce((sum, item) => sum + Number(item.debit_amount), 0);
      const totalCredits = (data ?? []).reduce((sum, item) => sum + Number(item.credit_amount), 0);
      const balance = totalDebits - totalCredits;

      return { totalDebits, totalCredits, balance };
    },
  });

  // Query paginated ledger entries
  const ledgerQ = useQuery({
    enabled: !!agency,
    queryKey: ["ledger-entries", agency?.id, page, search, accountCode],
    queryFn: async () => {
      let query = supabase
        .from("financial_ledger_entries")
        .select("*", { count: "exact" })
        .eq("agency_id", agency!.id)
        .order("entry_date", { ascending: false });

      if (search) {
        query = query.ilike("description", `%${search}%`);
      }
      if (accountCode) {
        query = query.ilike("account_code", `%${accountCode}%`);
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await query.range(start, end);
      if (error) throw error;

      return {
        entries: (data ?? []) as LedgerEntry[],
        count: count ?? 0,
      };
    },
  });

  const totals = totalsQ.data ?? { totalDebits: 0, totalCredits: 0, balance: 0 };
  const ledgerResult = ledgerQ.data;
  const entries = ledgerResult?.entries ?? [];
  const totalCount = ledgerResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const resetFilters = () => {
    setSearch("");
    setAccountCode("");
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar title="Livro-Razão" />
      </HeaderPortal>

      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-[24px] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <ArrowDownCircle className="w-3.5 h-3.5 text-success" /> Total de Débitos (D)
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-success">
            {money(totals.totalDebits)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Aplicações de recursos registradas
          </span>
        </div>

        <div className="bg-surface border border-border rounded-[24px] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-danger" /> Total de Créditos (C)
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-danger">
            {money(totals.totalCredits)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Origens de recursos registradas
          </span>
        </div>

        <div className="bg-surface border border-border rounded-[24px] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-brand" /> Saldo Líquido do Razão
          </span>
          <strong
            className={cn(
              "text-2xl font-mono block mt-1.5",
              totals.balance === 0 ? "text-success" : "text-brand",
            )}
          >
            {money(totals.balance)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Diferença consolidada entre D e C
          </span>
        </div>
      </div>

      {/* Filter and Table Panel */}
      <div className="bg-surface border border-border rounded-[24px] overflow-hidden shadow-xs">
        {/* Filters bar */}
        <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Razão Contábil</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audite lançamentos gerados dinamicamente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search by account code */}
            <div className="relative">
              <input
                type="text"
                placeholder="Conta (ex: 1.1.01)..."
                value={accountCode}
                onChange={(e) => {
                  setAccountCode(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-full border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring w-[160px]"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Search by description */}
            <div className="relative">
              <input
                type="text"
                placeholder="Descrição do lançamento..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-full border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring w-[200px]"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Reset button */}
            {(search || accountCode) && (
              <GhostButton
                onClick={resetFilters}
                className="h-8 !px-2.5 hover:bg-surface-alt transition cursor-pointer"
                title="Limpar filtros"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </GhostButton>
            )}
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-x-auto relative min-h-[150px]">
          {ledgerQ.isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : null}

          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3">Data/Hora</th>
                <th className="px-5 py-3">Código da Conta</th>
                <th className="px-5 py-3">Descrição do Lançamento</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3 text-right">Débito (D)</th>
                <th className="px-5 py-3 text-right">Crédito (C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerQ.isError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-red-800 bg-red-50/20">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Erro ao carregar o razão contábil. Verifique suas permissões de acesso.</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Nenhum lançamento contábil encontrado para os filtros informados.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-alt/40 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(entry.entry_date).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold font-mono text-foreground whitespace-nowrap">
                      {entry.account_code}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-foreground">
                      {entry.description}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-block rounded-full bg-surface-alt border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground capitalize">
                        {entry.source_event.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-success">
                      {Number(entry.debit_amount) > 0
                        ? `+ ${money(Number(entry.debit_amount))}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-danger">
                      {Number(entry.credit_amount) > 0
                        ? `+ ${money(Number(entry.credit_amount))}`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface-alt px-5 py-3">
            <span className="text-xs text-muted-foreground font-medium">
              Mostrando {entries.length} de {totalCount} resultados
            </span>
            <div className="flex items-center gap-2">
              <GhostButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 !px-3 font-semibold text-foreground disabled:opacity-50 transition cursor-pointer"
              >
                Anterior
              </GhostButton>
              <span className="text-xs text-muted-foreground font-semibold">
                Página {page} de {totalPages}
              </span>
              <GhostButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 !px-3 font-semibold text-foreground disabled:opacity-50 transition cursor-pointer"
              >
                Próxima
              </GhostButton>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
