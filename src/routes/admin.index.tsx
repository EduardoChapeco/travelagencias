import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Luggage, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { money } from "@/components/ui/form";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · TravelOS" }] }),
  component: Page,
});

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Page() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [{ count: agencies }, { count: users }, { count: trips }, { data: rev }] = await Promise.all([
        supabase.from("agencies").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("trips").select("id", { count: "exact", head: true }),
        supabase.from("financial_records").select("amount").eq("type", "income").eq("status", "paid"),
      ]);
      const revenue = (rev ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      return { agencies: agencies ?? 0, users: users ?? 0, trips: trips ?? 0, revenue };
    },
  });

  return (
    <>
      <PageHeader title="Visão Geral" description="Métricas globais da plataforma TravelOS." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Agências" value={String(q.data?.agencies ?? "—")} icon={Building2} />
        <Stat label="Usuários" value={String(q.data?.users ?? "—")} icon={Users} />
        <Stat label="Viagens" value={String(q.data?.trips ?? "—")} icon={Luggage} />
        <Stat label="Receita confirmada" value={q.data ? money(q.data.revenue) : "—"} icon={Wallet} />
      </div>
    </>
  );
}
