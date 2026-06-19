import { createFileRoute, useParams } from "@tanstack/react-router";
import { Clock, User, ArrowRight, Activity } from "lucide-react";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/history")({
  head: () => ({ meta: [{ title: "Histórico · TravelOS" }] }),
  component: TripHistoryPage,
});

function TripHistoryPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/history" });

  // Dummy activity logs
  const logs = [
    {
      id: "1",
      date: "2026-06-19T01:10:00Z",
      user: "Eduardo Antônio Ramos",
      action: "Alterou o status do bilhete",
      details: "Passageiro João da Silva: de Pendente para Emitido",
    },
    {
      id: "2",
      date: "2026-06-19T00:45:00Z",
      user: "Eduardo Antônio Ramos",
      action: "Adicionou cartão de embarque",
      details: "Voo LATAM LA3421 - Localizador: LA-QPWO12",
    },
    {
      id: "3",
      date: "2026-06-18T18:30:00Z",
      user: "Sistema (Automação)",
      action: "Status da viagem atualizado",
      details: "Status alterado para Planejamento na conversão da proposta",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header Informativo */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
        <Clock className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Histórico de Alterações</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Acompanhe a trilha de auditoria completa da viagem, incluindo alterações de status, emissão de documentos, envios de WhatsApp e edições de passageiros.
          </p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-border bg-surface p-4 max-w-3xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-brand" /> Atividades Recentes
        </h3>

        <div className="relative border-l border-border pl-4 ml-2 space-y-6">
          {logs.map((log) => (
            <div key={log.id} className="relative">
              {/* Bullet point */}
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-surface bg-brand" />
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">{log.action}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground font-mono">
                    {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{log.details}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                  <User className="h-3 w-3" />
                  <span>Por {log.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Upcoming */}
      <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4 text-center max-w-3xl">
        <p className="text-xs font-semibold text-brand">Histórico Determinístico & Rollback — Em Breve</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          A gravação de logs granulares para conformidade jurídica, diffs de alterações de tarifas e funcionalidade de rollback de alterações acidentais serão ativadas na Fase 12.
        </p>
      </div>
    </div>
  );
}
