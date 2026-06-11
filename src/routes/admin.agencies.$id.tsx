import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, AlertTriangle, KeyRound, Ban, CreditCard, ShieldAlert } from "lucide-react";
import {
  fetchAdminAgencyDetail,
  logAdminAuditEvent,
  provisionAgencyTrial,
  forceChangeAgencyPlan,
  forceChangeAgencyStatus,
  sendOwnerPasswordReset,
} from "@/services/admin";
import { PageHeader } from "@/components/shell/PageHeader";
import { fmtDate, StatusBadge, PrimaryButton, GhostButton } from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/agencies/$id")({
  head: () => ({ meta: [{ title: "Detalhe da agência · Admin" }] }),
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/admin/agencies/$id" });

  const q = useQuery({
    queryKey: ["admin-agency", id],
    queryFn: () => fetchAdminAgencyDetail(id),
  });

  if (!q.data) return <div className="text-sm text-muted-foreground p-6">Carregando dados completos da agência…</div>;
  const { agency, priv, members, tripsCount, income, expense, subscription, plans } = q.data;
  if (!agency) return <div className="text-sm text-muted-foreground p-6">Agência não encontrada no sistema.</div>;

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);
  const activeMembers = members.filter(m => m.role === 'agency_admin' || m.role === 'agent').length;

  return (
    <>
      <Link to="/admin/agencies" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Voltar para lista</Link>
      <div className="flex items-start justify-between mb-4">
        <PageHeader title={agency.name} description={`/${agency.slug} · criada em ${fmtDate(agency.created_at)}`} />
        <Link 
          to="/agency/$slug" 
          params={{ slug: agency.slug }}
          target="_blank"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90 transition-colors"
        >
          Acessar Agência <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 mb-6">
        {/* Card: Dados Cadastrais */}
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            Dados Cadastrais
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Razão social</dt><dd>{priv?.legal_name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">CNPJ/Documento</dt><dd className="font-mono">{priv?.document ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">E-mail Proprietário</dt><dd>{priv?.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{priv?.phone ?? "—"}</dd></div>
          </dl>
        </section>

        {/* Card: Operação */}
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            Operação
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Membros</dt><dd>{members.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Viagens</dt><dd>{tripsCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Receita paga</dt><dd>{income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Despesa paga</dt><dd>{expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
          </dl>
        </section>

        {/* Card: Status do SaaS */}
        <section className="rounded-lg border border-brand/20 bg-brand/5 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><CreditCard className="h-16 w-16" /></div>
          <h3 className="mb-3 text-sm font-semibold text-brand flex items-center gap-2 relative z-10">
            Status do SaaS
          </h3>
          
          {subscription ? (
            <dl className="space-y-2 text-xs relative z-10">
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Status Atual</dt>
                <dd>
                  <StatusBadge tone={subscription.status === 'active' || subscription.status === 'trialing' ? 'success' : 'danger'}>
                    {subscription.status}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Plano Vigente</dt>
                <dd className="font-semibold">{currentPlan?.name ?? "Desconhecido"}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Assentos</dt>
                <dd className={currentPlan && currentPlan.max_agents !== null && activeMembers >= currentPlan.max_agents ? "text-danger font-bold" : ""}>
                  {activeMembers} / {currentPlan?.max_agents ?? "∞"}
                </dd>
              </div>
              {subscription.status === 'trialing' && subscription.trial_ends_at && (
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Trial expira em</dt>
                  <dd>{fmtDate(subscription.trial_ends_at)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="text-xs text-warning bg-warning-bg p-2 rounded border border-warning/20">
              Agência não possui registro de assinatura SaaS. Acesso da agência estará bloqueado.
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-lg border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Membros da Equipe</h3>
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

        {/* Zona de Perigo */}
        <DangerZone agency={agency} priv={priv} subscription={subscription} plans={plans} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zona de Perigo
// ─────────────────────────────────────────────────────────────────────────────
function DangerZone({ agency, priv, subscription, plans }: any) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function logAuditAction(action: string, metadata: any) {
    await logAdminAuditEvent(agency.id, action, metadata);
  }

  async function handleProvisionTrial() {
    if (!confirm("Isso criará uma assinatura Trial Essential para a agência. Continuar?")) return;
    setBusy(true);
    const freePlan = plans.find((p: any) => p.sort_order === 1) || plans[0];
    
    if (!freePlan) {
      toast.error("Nenhum plano encontrado para provisionar.");
      setBusy(false);
      return;
    }

    try {
      await provisionAgencyTrial(agency.id, freePlan.id);
      await logAuditAction("superadmin_provisioned_trial", { plan_id: freePlan.id });
      toast.success("Assinatura provisionada.");
      qc.invalidateQueries({ queryKey: ["admin-agency", agency.id] });
    } catch (error: any) {
      toast.error(error.message);
    }
    setBusy(false);
  }

  async function handleChangePlan(e: React.ChangeEvent<HTMLSelectElement>) {
    const planId = e.target.value;
    if (!planId) return;
    const planName = plans.find((p:any) => p.id === planId)?.name;
    if (!confirm(`Tem certeza que deseja forçar a troca para o plano ${planName}?`)) {
      e.target.value = ""; // reset
      return;
    }
    setBusy(true);
    try {
      await forceChangeAgencyPlan(agency.id, planId);
      await logAuditAction("superadmin_changed_plan", { new_plan_id: planId, plan_name: planName });
      toast.success("Plano atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["admin-agency", agency.id] });
    } catch (error: any) {
      toast.error(error.message);
    }
    setBusy(false);
    e.target.value = ""; // reset select
  }

  async function handleStatusChange(newStatus: string) {
    if (!confirm(`ATENÇÃO: Mudar o status para "${newStatus}" pode bloquear ou liberar o acesso de todos os agentes desta agência. Prosseguir?`)) return;
    setBusy(true);
    try {
      await forceChangeAgencyStatus(agency.id, newStatus);
      await logAuditAction("superadmin_changed_status", { new_status: newStatus });
      toast.success(`Status forçado para ${newStatus}`);
      qc.invalidateQueries({ queryKey: ["admin-agency", agency.id] });
    } catch (error: any) {
      toast.error(error.message);
    }
    setBusy(false);
  }

  async function handleResetPassword() {
    if (!priv?.email) return toast.error("Agência sem e-mail do proprietário registrado.");
    if (!confirm(`Isso enviará um link de reset de senha imediatamente para ${priv.email}. Confirma?`)) return;
    setBusy(true);
    
    try {
      await sendOwnerPasswordReset(priv.email);
      await logAuditAction("superadmin_requested_password_reset", { target_email: priv.email });
      toast.success("E-mail de recuperação enviado para o proprietário!");
    } catch (error: any) {
      toast.error(error.message);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-lg border-2 border-danger/30 bg-danger/5 p-4">
      <div className="flex items-center gap-2 mb-4 text-danger">
        <ShieldAlert className="h-5 w-5" />
        <h3 className="font-bold tracking-tight">Zona de Perigo</h3>
      </div>
      <p className="text-xs text-danger/80 mb-5 leading-relaxed">
        Ações destrutivas e forçadas. Todas as ações realizadas aqui são irreversíveis e registradas na trilha de auditoria do sistema.
      </p>

      {!subscription ? (
        <div className="space-y-3 border-b border-danger/10 pb-4 mb-4">
          <div className="text-xs font-semibold text-foreground">Resolver Assinatura Ausente</div>
          <PrimaryButton onClick={handleProvisionTrial} disabled={busy} className="w-full text-xs">
            Provisionar Trial Essencial
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Forçar Troca de Plano</label>
            <select 
              disabled={busy}
              onChange={handleChangePlan}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Selecione um novo plano...</option>
              {plans.map((p: any) => (
                <option key={p.id} value={p.id} disabled={p.id === subscription.plan_id}>
                  {p.name} {p.id === subscription.plan_id ? "(Atual)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-danger/10">
            <div className="text-xs font-semibold text-foreground mb-2">Forçar Status da Assinatura</div>
            <div className="grid grid-cols-2 gap-2">
              <GhostButton 
                onClick={() => handleStatusChange('canceled')} 
                disabled={busy || subscription.status === 'canceled'}
                className="text-xs text-danger hover:text-danger hover:bg-danger/10 justify-start"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Bloquear (Cancel)
              </GhostButton>
              <GhostButton 
                onClick={() => handleStatusChange('active')} 
                disabled={busy || subscription.status === 'active'}
                className="text-xs text-success hover:text-success hover:bg-success/10 justify-start"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Reativar
              </GhostButton>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5 pt-4 mt-4 border-t border-danger/10">
        <div className="text-xs font-semibold text-foreground mb-2">Gestão de Acesso</div>
        <GhostButton 
          onClick={handleResetPassword} 
          disabled={busy}
          className="w-full text-xs text-foreground justify-start"
        >
          <KeyRound className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> 
          Enviar Reset de Senha (Owner)
        </GhostButton>
      </div>
    </section>
  );
}
