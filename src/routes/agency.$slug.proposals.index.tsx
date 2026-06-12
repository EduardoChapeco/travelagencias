import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Edit2, Eye, MoreHorizontal, Copy, Trash2, PencilLine } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate, GhostButton } from "@/components/ui/form";
import {
  fetchProposalsList,
  duplicateProposal,
  deleteProposal,
  updateProposal,
} from "@/services/proposals";
import { NewProposalSheet } from "@/components/proposals/NewProposalSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";
import { toast } from "sonner";

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
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals/" });
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(!!search.new);
  const pageSize = 20;

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["proposals", agency?.id, page],
    queryFn: () => fetchProposalsList(agency!.id, page, pageSize),
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

  const renMut = useMutation({
    mutationFn: (args: { id: string; title: string }) =>
      updateProposal(args.id, { title: args.title }),
    onSuccess: () => {
      toast.success("Cotação renomeada!");
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = window.prompt("Digite o novo nome para a cotação:", currentTitle);
    if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
      renMut.mutate({ id, title: newTitle.trim() });
    }
  };

  return (
    <>
      <PageHeader
        title="Cotações"
        description="Propostas comerciais enviadas a clientes e leads."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Nova cotação
          </button>
        }
      />

      {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {list.data && list.data.data.length === 0 && (
        <EmptyState
          title="Nenhuma cotação ainda"
          description="Crie sua primeira proposta comercial."
        />
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Destino</th>
                  <th className="px-3 py-2 font-medium">Viagem</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.data.data.map((p) => (
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
                            onClick={() => window.open(`/m/proposal/${p.public_token}`, "_blank")}
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
                            onClick={() => handleRename(p.id, p.title)}
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (window.confirm("Tem certeza que deseja excluir esta cotação?")) {
                                delMut.mutate(p.id);
                              }
                            }}
                            className="cursor-pointer text-rose-600 focus:text-rose-600"
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

          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="text-xs text-muted-foreground">
              Página <span className="font-medium text-foreground">{page}</span> de{" "}
              {Math.ceil(list.data.count / pageSize) || 1}
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
                disabled={page * pageSize >= list.data.count}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 text-xs"
              >
                Próxima
              </GhostButton>
            </div>
          </div>
        </>
      )}

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
    </>
  );
}
