import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Plus,
  Link2,
  Edit2,
  Eye,
  MoreHorizontal,
  Copy,
  Trash2,
  PencilLine,
  History,
  Settings2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate, GhostButton, Input, Select } from "@/components/ui/form";
import {
  fetchProposalsList,
  duplicateProposal,
  deleteProposal,
  updateProposal,
} from "@/services/proposals";
import { NewProposalSheet } from "@/components/proposals/NewProposalSheet";
import { ProposalHistorySheet } from "@/components/proposals/ProposalHistorySheet";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

const proposalsSearchSchema = z.object({
  new: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
});

export const Route = createFileRoute("/agency/$slug/proposals/")({
  validateSearch: proposalsSearchSchema,
  head: () => ({ meta: [{ title: "Cotações · TravelOS" }] }),
  component: ProposalsList,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  sent: "info",
  viewed: "info",
  accepted: "success",
  converted: "success",
  rejected: "danger",
  expired: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  converted: "Convertida",
  rejected: "Recusada",
  expired: "Expirada",
};

function ProposalsList() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals/" });
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(!!search.new);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProposal, setHistoryProposal] = useState<{ id: string; title: string } | null>(
    null,
  );
  const debouncedSearch = useDebounce(searchQuery, 400);
  const pageSize = 20;

  const { confirm, ConfirmDialog } = useConfirm();
  const { prompt, PromptDialog } = usePrompt();

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["proposals", agency?.id, page, debouncedSearch, statusFilter],
    queryFn: () =>
      fetchProposalsList(agency!.id, page, pageSize, {
        search: debouncedSearch,
        status: statusFilter,
      }),
  });

  const qc = useQueryClient();

  const dupMut = useMutation({
    mutationFn: duplicateProposal,
    onSuccess: (data) => {
      toast.success("Cotação duplicada com sucesso!");
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteProposal,
    onSuccess: () => {
      toast.success("Cotação excluída!");
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; updates: any }) => updateProposal(args.id, args.updates),
    onSuccess: () => {
      toast.success("Cotação atualizada!");
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function renameProposal(id: string, currentTitle: string) {
    prompt({
      title: "Renomear Cotação",
      description: "Digite o novo nome para a cotação:",
      defaultValue: currentTitle,
      onConfirm: (newTitle) => {
        if (newTitle && newTitle !== currentTitle) {
          updateMut.mutate({ id, updates: { title: newTitle } });
        }
      },
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-8 items-center justify-center gap-1.5 rounded-sm bg-brand px-2 sm:px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
            title="Nova cotação"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova cotação</span>
          </button>
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Cotações"
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
            placeholder="Buscar cotação..."
            className="h-8 w-full rounded-sm border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="relative w-full sm:w-44">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            className="h-8 w-full appearance-none rounded-sm border border-border bg-surface pl-8 pr-8 text-xs outline-none focus:border-brand text-foreground text-[11px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviada</option>
            <option value="viewed">Visualizada</option>
            <option value="accepted">Aceita</option>
            <option value="converted">Convertida</option>
            <option value="rejected">Recusada</option>
            <option value="expired">Expirada</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 flex flex-col gap-4">
        {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {list.isError && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 text-xs text-red-800 flex items-center gap-2 m-2">
            <AlertCircle className="h-4 w-4 text-red-650 shrink-0" />
            <span>Erro ao carregar lista de propostas. Verifique sua conexão ou permissões.</span>
          </div>
        )}

        {list.data && list.data.data.length === 0 && !debouncedSearch && statusFilter === "all" && !list.isError ? (
          <EmptyState
            title="Nenhuma cotação ainda"
            description="Crie sua primeira proposta comercial."
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border border-border bg-surface">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Título</th>
                      <th className="px-3 py-2 font-medium">Destino</th>
                      <th className="px-3 py-2 font-medium">Viagem</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Visibilidade</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data?.data.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-surface-alt/30">
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          #{p.number}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            to="/agency/$slug/proposals/$id"
                            params={{ slug, id: p.id }}
                            className="font-medium hover:underline"
                          >
                            {p.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            criada em {fmtDate(p.created_at)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{p.destination ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={STATUS_TONE[p.status] ?? "neutral"}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5">
                          {p.visibility === "public" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 text-[10px] font-semibold">
                              🌐 Pública
                            </span>
                          ) : p.visibility === "agency" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-semibold">
                              🏢 Agência
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-semibold">
                              🔒 Privada
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">
                          {money(Number(p.total), p.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <GhostButton className="h-7 w-7 p-0 hover:bg-surface-alt">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </GhostButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/agency/$slug/proposals/$id"
                                  params={{ slug, id: p.id }}
                                  className="cursor-pointer"
                                >
                                  <Edit2 className="mr-2 h-4 w-4" /> Editar Proposta
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/m/proposal/${p.public_token}`, "_blank")
                                }
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" /> Ver WebView
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/m/proposal/${p.public_token}`,
                                  );
                                  toast.success("Link copiado!");
                                }}
                                className="cursor-pointer"
                              >
                                <Link2 className="mr-2 h-4 w-4" /> Copiar Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => renameProposal(p.id, p.title)}
                                className="cursor-pointer"
                              >
                                <PencilLine className="mr-2 h-4 w-4" /> Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => dupMut.mutate(p.id)}
                                className="cursor-pointer"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Duplicar Cotação
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setHistoryProposal({ id: p.id, title: p.title });
                                  setHistoryOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <History className="mr-2 h-4 w-4" /> Histórico de Edições
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: "Excluir Cotação",
                                    description: "Tem certeza que deseja excluir esta cotação?",
                                    variant: "destructive",
                                    onConfirm: () => {
                                      delMut.mutate(p.id);
                                    },
                                  });
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
              <div className="text-xs text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                {Math.ceil((list.data?.count ?? 0) / pageSize) || 1}
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs"
                >
                  Anterior
                </GhostButton>
                <GhostButton
                  disabled={page * pageSize >= (list.data?.count ?? 0)}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Próxima
                </GhostButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {newOpen && (
        <NewProposalSheet
          isOpen={newOpen}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            navigate({ to: "/agency/$slug/proposals/$id", params: { slug, id } });
          }}
        />
      )}
      {historyProposal && (
        <ProposalHistorySheet
          isOpen={historyOpen}
          onClose={() => {
            setHistoryOpen(false);
            setHistoryProposal(null);
          }}
          proposalId={historyProposal.id}
          proposalTitle={historyProposal.title}
        />
      )}
      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="proposals"
          moduleName="Cotações"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
