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
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";
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
  head: ({ context }: any) => ({ meta: [{ title: `Cotações · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar
          title="Cotações"
          search={{
            value: searchQuery,
            onChange: (v) => {
              setSearchQuery(v);
              setPage(1);
            },
            placeholder: "Buscar cotação...",
          }}
          actions={
            <div className="flex items-center gap-1.5">
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
                <option value="sent" className="bg-neutral-900 text-white">Enviada</option>
                <option value="viewed" className="bg-neutral-900 text-white">Visualizada</option>
                <option value="accepted" className="bg-neutral-900 text-white">Aceita</option>
                <option value="converted" className="bg-neutral-900 text-white">Convertida</option>
                <option value="rejected" className="bg-neutral-900 text-white">Recusada</option>
                <option value="expired" className="bg-neutral-900 text-white">Expirada</option>
              </select>
              {isAgencyAdmin && (
                <button
                  onClick={() => setAdminPanelOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Administrar Cotações"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          }
        />
      </HeaderPortal>

      <ModuleActionButton
        label="Nova Cotação"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setNewOpen(true)}
      />

      <div className="flex-1 overflow-hidden px-4  md:pr-6 py-4 flex flex-col min-h-0 pb-24">
        {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {list.isError && (
          <div className="p-4 rounded-[24px] border border-red-200 bg-red-50/50 text-xs text-red-800 flex items-center gap-2 m-2">
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
          <div className="flex-1 flex flex-col justify-between h-full min-h-0 space-y-4">
            <div className="flex-1 rounded-[28px] border border-border bg-surface overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground sticky top-0 bg-surface backdrop-blur-md z-10">
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

            <div className="flex items-center justify-between px-4 py-2 rounded-[28px] bg-white/5 border border-white/5 shadow-xs select-none">
              <div className="text-xs text-muted-foreground/80 font-medium">
                Página <span className="font-semibold text-foreground">{page}</span> de{" "}
                {Math.ceil((list.data?.count ?? 0) / pageSize) || 1}
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-3 text-xs rounded-full"
                >
                  Anterior
                </GhostButton>
                <GhostButton
                  disabled={page * pageSize >= (list.data?.count ?? 0)}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 px-3 text-xs rounded-full"
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
