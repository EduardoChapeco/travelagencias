import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plane, CreditCard, FileText, Gift, Shield } from "lucide-react";
import { fetchClientDashboard } from "@/services/client-area";
import { PageHeader } from "@/components/shell/PageHeader";
import { money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/client/")({
  head: ({ context }: any) => ({ meta: [{ title: `Área do cliente · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientHome,
});

function ClientHome() {
  const q = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: () => fetchClientDashboard(),
  });

  return (
    <>
      <PageHeader
        title="Bem-vindo"
        description="Suas viagens, pagamentos e documentos em um só lugar."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
        <ShortcutCard to="/client/trips" icon={<Plane className="h-4 w-4" />} label="Viagens" />
        <ShortcutCard
          to="/client/payments"
          icon={<CreditCard className="h-4 w-4" />}
          label="Pagamentos"
        />
        <ShortcutCard
          to="/client/documents"
          icon={<FileText className="h-4 w-4" />}
          label="Documentos"
        />
        <ShortcutCard to="/client/consents" icon={<Shield className="h-4 w-4" />} label="Termos" />
        <ShortcutCard to="/client/coupons" icon={<Gift className="h-4 w-4" />} label="Cupons" />
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Próximas viagens
      </h3>
      <div className="space-y-2">
        {q.data?.trips.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sem viagens.
          </div>
        )}
        {q.data?.trips.map((t) => (
          <Link
            key={t.id}
            to="/client/trips/$id"
            params={{ id: t.id }}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 hover:border-border-strong"
          >
            <div>
              <div className="text-xs text-muted-foreground">{t.code}</div>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(t.travel_start)}</div>
            </div>
            <div className="font-mono text-sm">
              {money(Number(t.total_sale ?? 0), t.currency ?? "BRL")}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function ShortcutCard({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:border-border-strong"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}
