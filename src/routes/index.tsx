import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  FileText,
  Luggage,
  ScrollText,
  Wallet,
  Plane,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelOS — Plataforma para Agências de Viagens" },
      {
        name: "description",
        content:
          "CRM, propostas, contratos digitais, vouchers, embarques e financeiro. Tudo o que sua agência precisa em um workspace limpo e eficiente.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "CRM Kanban",
    description:
      "Gerencie leads com arrastar e soltar. Acompanhe o pipeline de vendas, fontes de captação e valor estimado por estágio.",
  },
  {
    icon: FileText,
    title: "Cotações Digitais",
    description:
      "Crie propostas profissionais com itens, itinerários, fotos e condições de pagamento. Envie por link rastreável.",
  },
  {
    icon: Luggage,
    title: "Gestão de Viagens",
    description:
      "Central de controle de passageiros, documentos, quartos, checklist operacional e status de embarque.",
  },
  {
    icon: ScrollText,
    title: "Contratos Digitais",
    description:
      "Contratos com assinatura eletrônica, hash de integridade, certificado e verificação pública por serial.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    description:
      "DRE por viagem, fluxo de caixa, contas a receber, parcelamentos, comissões e relatórios em tempo real.",
  },
  {
    icon: Plane,
    title: "Embarques",
    description:
      "Kanban de embarque com checklists operacionais, alertas de documentação e controle de PNR por passageiro.",
  },
];

const stats = [
  { value: "6", label: "módulos integrados" },
  { value: "100%", label: "dados reais" },
  { value: "0", label: "planilhas" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
              T
            </div>
            <span className="text-sm font-semibold tracking-tight">TravelOS</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Funcionalidades
            </a>
            <a href="#why" className="transition-colors hover:text-foreground">
              Por que TravelOS
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth/login"
              className="h-8 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-surface-alt inline-flex items-center"
            >
              Entrar
            </Link>
            <Link
              to="/auth/register"
              className="h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 inline-flex items-center"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            v1.0 · Novo sistema para agências de viagens
          </div>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Sua agência,{" "}
            <span className="text-muted-foreground">organizada de verdade.</span>
          </h1>

          <p className="mt-5 text-base text-muted-foreground leading-relaxed">
            CRM, cotações, contratos digitais, embarques, vouchers e financeiro — integrados em
            um único workspace limpo. Sem planilhas, sem confusão.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth/register"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Criar minha agência <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-alt"
            >
              Já tenho conta
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Grátis para começar · Sem cartão de crédito
          </p>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-6 text-center">
              <div className="text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Funcionalidades
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Tudo que sua agência precisa
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seis módulos completos, integrados e prontos para usar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group bg-surface p-6 transition-colors hover:bg-surface-alt"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                    <Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why TravelOS ─────────────────────────────────────── */}
      <section id="why" className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Por que TravelOS
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Feito para agentes de viagem, não para TI
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Diferente de softwares genéricos, o TravelOS foi construído para o fluxo real de
              uma agência: do primeiro contato com o cliente até o embarque e pós-viagem.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              "CRM kanban com estágios configuráveis e histórico de atividades",
              "Propostas com link rastreável — saiba quando o cliente visualizou",
              "Contratos com assinatura eletrônica e validade jurídica",
              "Portal do cliente com acesso às viagens, documentos e pagamentos",
              "Financeiro com DRE por viagem e fluxo de caixa consolidado",
              "Multi-agências com controle de equipe e permissões por papel",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Comece agora, é grátis
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua agência em minutos. Sem cartão de crédito, sem burocracia.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth/register"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Criar conta gratuita <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:bg-surface-alt"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background text-[10px] font-bold">
              T
            </div>
            <span className="text-xs font-semibold">TravelOS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TravelOS · Plataforma para agências de viagens
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/auth/login" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
            <Link to="/auth/register" className="hover:text-foreground transition-colors">
              Cadastrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
