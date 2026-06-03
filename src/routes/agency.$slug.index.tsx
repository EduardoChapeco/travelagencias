import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/")({
  head: () => ({ meta: [{ title: "Dashboard · TravelOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { agency } = useAgency();
  useParams({ from: "/agency/$slug/" });

  const statsQ = useQuery({
    enabled: !!agency,
    queryKey: ["dashboard-stats", agency?.id],
    queryFn: async () => {
      const [leads, won, stages] = await Promise.all([
        supabase.from("leads").select("id, estimated_value", { count: "exact" }).eq("agency_id", agency!.id),
        supabase
          .from("leads")
          .select("id, estimated_value, stage_id, lead_stages!inner(is_won)")
          .eq("agency_id", agency!.id)
          .eq("lead_stages.is_won", true),
        supabase.from("lead_stages").select("id", { count: "exact" }).eq("agency_id", agency!.id),
      ]);
      const totalLeads = leads.count ?? 0;
      const wonLeads = won.data?.length ?? 0;
      const pipelineValue =
        leads.data?.reduce((sum, l) => sum + Number(l.estimated_value ?? 0), 0) ?? 0;
      const wonValue =
        won.data?.reduce((sum, l) => sum + Number(l.estimated_value ?? 0), 0) ?? 0;
      return { totalLeads, wonLeads, pipelineValue, wonValue, stagesCount: stages.count ?? 0 };
    },
  });

  const s = statsQ.data;

  return (
    <>
      <PageHeader
        title={agency?.name ?? "Dashboard"}
        description="Visão geral da sua agência."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Leads" value={s?.totalLeads ?? "—"} />
        <Stat label="Fechados" value={s?.wonLeads ?? "—"} />
        <Stat label="Pipeline" value={s ? brl(s.pipelineValue) : "—"} />
        <Stat label="Ganho" value={s ? brl(s.wonValue) : "—"} />
      </div>
      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold">Próximos passos</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Vá ao <a className="text-foreground underline" href={`/agency/${agency?.slug}/crm`}>CRM</a> para criar leads.</li>
          <li>• Configure cores e logo em <a className="text-foreground underline" href={`/agency/${agency?.slug}/brand`}>Brand Kit</a>.</li>
          <li>• Convide sua equipe em <a className="text-foreground underline" href={`/agency/${agency?.slug}/team`}>Equipe</a>.</li>
        </ul>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
