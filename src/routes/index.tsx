import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
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

      {/* ── Hero BENTO PREMIUM ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/50 bg-surface pb-24 pt-32">
        <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand/20 rounded-[100%] blur-[120px] pointer-events-none opacity-50" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand ">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span></span>
            A Nova Era do Turismo B2B
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground md:text-7xl drop- leading-[1.1]">
            O Sistema Operacional da <span className="text-brand">sua Agência.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed font-medium">
            Gerencie Leads, Operadores, Vouchers, Financeiro DRE e Embarques em um único Workspace Premium.
            Sem planilhas. Sem confusão.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register" className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-brand px-8 text-sm font-bold uppercase tracking-widest text-brand-foreground   transition-all hover:-translate-y-1 hover: hover: overflow-hidden">
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
               <span className="relative flex items-center gap-2">Criar minha agência <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link to="/auth/login" className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-border/50 bg-surface px-8 text-sm font-bold uppercase tracking-widest text-foreground transition-all hover:border-brand/50 hover:bg-brand/5">
              Acessar Painel
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
             <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand"/> Sem cartão de crédito</span>
             <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand"/> Setup instantâneo</span>
          </div>
        </div>

        {/* BENTO STATS */}
        <div className="relative z-10 mx-auto mt-20 max-w-4xl px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {stats.map((s, i) => (
               <div key={i} className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-surface/80 p-8  backdrop-blur-md transition-transform hover:-translate-y-1">
                 <div className="text-4xl font-extrabold text-foreground">{s.value}</div>
                 <div className="mt-2 text-xs uppercase tracking-widest font-bold text-muted-foreground">{s.label}</div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* ── Features Bento Grid ─────────────────────────────────────────── */}
      <section id="features" className="bg-background py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-widest text-brand mb-4">
              Módulos Nativos
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              A arquitetura perfeita para escalar suas vendas.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={cn(
                     "group relative overflow-hidden rounded-3xl border border-border/50 bg-surface p-8  transition-all hover: hover:-translate-y-1 hover:border-brand/40",
                     i === 0 || i === 3 ? "md:col-span-2 lg:col-span-2 bg-gradient-to-br from-surface to-surface-alt" : ""
                  )}
                >
                  <div className="absolute right-0 top-0 h-40 w-40 -translate-y-10 translate-x-10 rounded-full bg-brand/5 transition-transform duration-500 group-hover:scale-150" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 text-brand">
                       <Icon className="h-6 w-6" strokeWidth={2} />
                     </div>
                     <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                     <p className="text-sm leading-relaxed text-muted-foreground font-medium flex-1">
                       {f.description}
                     </p>
                     
                     <div className="mt-8 flex items-center text-xs font-bold uppercase tracking-widest text-brand opacity-0 transform translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0">
                        Saber mais <ArrowRight className="ml-2 h-4 w-4" />
                     </div>
                  </div>
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

      {/* ── CTA Final Premium ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand py-24 text-brand-foreground">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
         
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight drop- mb-6">
            O seu próximo nível em Turismo começa aqui.
          </h2>
          <p className="mt-4 text-lg font-medium opacity-90 max-w-2xl mx-auto mb-10">
            Diga adeus às planilhas. Configure sua agência em menos de 2 minutos e traga toda a sua equipe para o TravelOS.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth/register"
              className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-background px-10 text-sm font-bold uppercase tracking-widest text-brand  transition-all hover:-translate-y-1 hover:)] overflow-hidden"
            >
              Criar Conta B2B <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-14 items-center rounded-xl border-2 border-brand-foreground/30 px-10 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-brand-foreground/10"
            >
              Fazer Login
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
