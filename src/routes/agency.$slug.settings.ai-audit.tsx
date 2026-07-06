import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Sparkles,
  Calendar,
  User,
  Search,
  RefreshCw,
  BarChart2,
  Shield,
  Eye,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionRegistry } from "@/lib/ai/ActionRegistry";

// @ts-ignore
export const Route = createFileRoute("/agency/$slug/settings/ai-audit")({
  head: ({ context }: any) => ({ meta: [{ title: `Auditoria de IA · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

function Page() {
  const { agency } = useAgency();
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Fetch all agency members for filtering
  const membersQuery = useQuery({
    queryKey: ["agency-members-for-audit", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("agency_id", agency!.id);
      if (error) throw error;

      // Fetch user profile names
      const userIds = data.map((r: any) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      if (profErr) throw profErr;

      return profiles || [];
    },
  });

  // Fetch IA usage metrics and logs
  const auditQuery = useQuery({
    queryKey: ["ai-audit-logs", agency?.id, selectedUser, selectedAction],
    enabled: !!agency,
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("id, actor_id, action, entity_type, entity_id, created_at, metadata")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });

      if (selectedUser !== "all") {
        q = q.eq("actor_id", selectedUser);
      }
      if (selectedAction !== "all") {
        q = q.eq("action", selectedAction);
      } else {
        const actionCodes = ["ai_chat_message", ...Object.keys(ActionRegistry)];
        q = q.in("action", actionCodes);
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  if (!agency) return null;

  const logs = (auditQuery.data || []) as any[];
  const members = membersQuery.data || [];
  const memberMap = new Map(members.map((m: any) => [m.id, m]));

  // Compute metrics
  const totalCalls = logs.length;
  const toolExecutions = logs.filter((l) => l.action !== "ai_chat_message").length;
  const failedCalls = logs.filter(
    (l) => l.metadata?.result === "failed" || l.metadata?.error,
  ).length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => auditQuery.refetch()}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-alt transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", auditQuery.isFetching && "animate-spin")} />
            Atualizar logs
          </button>
        </div>
      </HeaderPortal>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 font-sans space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" /> Painel de Auditoria de IA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitore o uso das ferramentas de inteligência artificial, logs de tool calling e ações
            comerciais executadas.
          </p>
        </div>

        {/* 1. Metrics Overview */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Total de Interações
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{totalCalls}</span>
              <span className="text-[10px] text-muted-foreground">mensagens/ações</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Ferramentas Executadas
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground text-brand">
                {toolExecutions}
              </span>
              <span className="text-[10px] text-muted-foreground">actions</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Falhas / Erros
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={cn(
                  "text-2xl font-bold",
                  failedCalls > 0 ? "text-rose-500" : "text-foreground",
                )}
              >
                {failedCalls}
              </span>
              <span className="text-[10px] text-muted-foreground">exceções</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Isolamento Multi-Tenant
            </span>
            <div className="flex items-baseline gap-1 mt-2 text-emerald-600">
              <Shield className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Ativo (RLS)</span>
            </div>
          </div>
        </div>

        {/* 2. Filter Controls */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase">Operador</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="rounded-md border border-border bg-surface-alt px-2.5 py-1 text-xs outline-none text-foreground"
            >
              <option value="all">Todos os operadores</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase">Ação</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="rounded-md border border-border bg-surface-alt px-2.5 py-1 text-xs outline-none text-foreground cursor-pointer"
            >
              <option value="all">Todas as ações</option>
              <option value="ai_chat_message">Mensagem de Chat (IA)</option>
              {Object.entries(ActionRegistry).map(([code, action]) => (
                <option key={code} value={code}>
                  {action.name} (Tool)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Log Stream */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
          <div className="border-b border-border bg-surface-alt px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Fluxo de Eventos</span>
            <span className="text-[10px] text-muted-foreground">
              Mostrando os últimos 100 registros
            </span>
          </div>

          {auditQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Carregando auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhum evento registrado com esses filtros.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {logs.map((log: any) => {
                const isMsg = log.action === "ai_chat_message";
                const isFailed = log.metadata?.result === "failed" || log.metadata?.error;
                const userObj: any = memberMap.get(log.actor_id);
                const operatorName = userObj
                  ? userObj.name || userObj.email
                  : "Sistema/Desconhecido";
                const isExpanded = expandedLog === log.id;

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-surface-alt/40",
                      isFailed && "bg-rose-500/[0.01]",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      {/* Left: action details */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold uppercase",
                            isMsg ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand",
                          )}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-foreground">{operatorName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>

                      {/* Right: triggers */}
                      <div className="flex items-center gap-2">
                        {isFailed ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                            <ShieldAlert className="h-3 w-3" /> Falha
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Sucesso
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Ver detalhes técnicos"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Explanatory text */}
                    <div className="mt-2 text-xs text-muted-foreground pl-1 border-l border-border/80">
                      {isMsg ? (
                        <span>
                          Enviou mensagem de chat (Conexão:{" "}
                          {log.metadata?.model || "Gemini 2.5 Flash"})
                        </span>
                      ) : (
                        <span>
                          Executou ferramenta de negócio:{" "}
                          {log.metadata?.message || `Simulação de ${log.action}`}
                        </span>
                      )}
                    </div>

                    {/* Expanded details container (JSON Payload) */}
                    {isExpanded && (
                      <div className="mt-3 rounded border border-border/60 bg-surface-muted p-3 font-mono text-[10px] text-muted-foreground overflow-x-auto space-y-2">
                        <div>
                          <span className="text-foreground font-semibold block uppercase text-[9px] mb-1">
                            Metadados e Payload da Ação:
                          </span>
                          <pre className="text-foreground-muted">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                        <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[9px]">
                          <span>ID do Log: {log.id}</span>
                          <span>
                            Entidade: {log.entity_type} ({log.entity_id || "null"})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
