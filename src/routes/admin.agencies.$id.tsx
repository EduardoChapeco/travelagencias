import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/admin/agencies/$id")({
  head: () => ({ meta: [{ title: "Detalhe da agência · Admin" }] }),
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/admin/agencies/$id" });

  const q = useQuery({
    queryKey: ["admin-agency", id],
    queryFn: async () => {
      const [a, p, roles, trips, fin] = await Promise.all([
        supabase.from("agencies").select("*").eq("id", id).maybeSingle(),
        supabase.from("agency_private").select("*").eq("agency_id", id).maybeSingle(),
        supabase.from("user_roles").select("user_id, role, created_at").eq("agency_id", id),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("agency_id", id),
        supabase.from("financial_records").select("amount, type, status").eq("agency_id", id),
      ]);
      const userIds = (roles.data ?? []).map((r) => r.user_id);
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("id, full_name").in("id", userIds)).data ?? []
        : [];
      const pmap = new Map(profiles.map((p) => [p.id, p]));
      const records = fin.data ?? [];
      const income = records.filter((r) => r.type === "income" && r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
      const expense = records.filter((r) => r.type === "expense" && r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
      return {
        agency: a.data, priv: p.data,
        members: (roles.data ?? []).map((r) => ({ ...r, name: pmap.get(r.user_id)?.full_name ?? "—" })),
        tripsCount: trips.count ?? 0, income, expense,
      };
    },
  });

  if (!q.data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const { agency, priv, members, tripsCount, income, expense } = q.data;
  if (!agency) return <div className="text-sm text-muted-foreground">Agência não encontrada.</div>;

  return (
    <>
      <Link to="/admin/agencies" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Voltar</Link>
      <PageHeader title={agency.name} description={`/${agency.slug} · criada em ${fmtDate(agency.created_at)}`} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Dados cadastrais</h3>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Razão social</dt><dd>{priv?.legal_name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">CNPJ/Documento</dt><dd className="font-mono">{priv?.document ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd>{priv?.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{priv?.phone ?? "—"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Operação</h3>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Membros</dt><dd>{members.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Viagens</dt><dd>{tripsCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Receita paga</dt><dd>{income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Despesa paga</dt><dd>{expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
          </dl>
        </section>
      </div>
      <section className="mt-4 rounded-lg border border-border bg-surface">
        <h3 className="border-b border-border px-4 py-2 text-sm font-semibold">Equipe</h3>
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Papel</th><th className="px-3 py-2 text-left">Desde</th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={`${m.user_id}-${m.role}`} className="border-t border-border">
                <td className="px-3 py-2.5">{m.name}</td>
                <td className="px-3 py-2.5 text-xs">{m.role}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(m.created_at)}</td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum membro.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
