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
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlockRenderer } from "@/components/portal/BlockRenderer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelOS — O Workspace Definitivo para Agências de Viagens" },
      {
        name: "description",
        content:
          "Diga adeus às planilhas. Centralize propostas interativas, assinaturas de contratos, controle financeiro de margens e embarques em um único local.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "Acompanhamento Inteligente de Vendas",
    description:
      "Acompanhe o interesse dos seus clientes de forma visual. Saiba exatamente quem está pronto para comprar e nunca mais esqueça de dar um retorno.",
    badge: "Mais Vendas",
  },
  {
    icon: FileText,
    title: "Propostas Digitais Interativas",
    description:
      "Crie roteiros e orçamentos impecáveis com fotos e valores estruturados. Envie links rastreáveis e saiba no mesmo instante quando o cliente abrir.",
    badge: "Rastreamento em Tempo Real",
  },
  {
    icon: ScrollText,
    title: "Contratos com Assinatura Eletrônica",
    description:
      "Gere contratos automaticamente a partir das cotações. Clientes assinam pelo celular em segundos com validade jurídica e hash de segurança.",
    badge: "Agilidade Legal",
  },
  {
    icon: Wallet,
    title: "Calculadora de Lucro Real por Viagem",
    description:
      "Monitore centavo por centavo a margem líquida de cada viagem, comissões de consultores, fluxos de parcelamento e contas a pagar e receber.",
    badge: "Saúde Financeira",
  },
  {
    icon: Plane,
    title: "Gestão Operacional de Passageiros",
    description:
      "Centralize a rooming list, preferências alimentares, numeração de poltronas e detalhes dos pacotes sem duplicar nenhuma informação.",
    badge: "Sem Erros",
  },
  {
    icon: ShieldCheck,
    title: "Alerta Antecipado de Documentos",
    description:
      "O sistema avisa automaticamente se houver algum passaporte ou visto expirando antes do embarque, evitando prejuízos e cancelamentos de última hora.",
    badge: "Segurança Total",
  },
];

const stats = [
  { value: "+37%", label: "Aumento na Taxa de Conversão" },
  { value: "14 min", label: "Economizados por Proposta" },
  { value: "0", label: "Planilhas Perdidas ou Desatualizadas" },
];

function Landing() {
  const systemPageQ = useQuery({
    queryKey: ["system-landing-page"],
    queryFn: async () => {
      try {
        const { data: agency } = await supabase
          .from("agencies")
          .select("id")
          .eq("slug", "system")
          .maybeSingle();
        if (!agency) return null;

        const { data: page } = await supabase
          .from("portal_pages")
          .select("published_blocks, published_seo, template")
          .eq("agency_id", agency.id)
          .eq("slug", "home")
          .eq("is_published", true)
          .maybeSingle();

        return page || null;
      } catch (err) {
        console.warn("Failed to load dynamic system landing page:", err);
        return null;
      }
    },
  });

  const homePage = systemPageQ.data;

  if (
    homePage?.published_blocks &&
    Array.isArray(homePage.published_blocks) &&
    homePage.published_blocks.length > 0
  ) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        <BlockRenderer blocks={homePage.published_blocks as any[]} agencySlug="system" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden font-sans">
      {/* ── Background Grid Accent (Editorial style instead of neon glows) ────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[58px] max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground font-black text-xs">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground leading-none">
                TravelOS
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 leading-none">
                B2B Workspace
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 ds-label-caps text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#comparison" className="transition-colors hover:text-foreground">
              Antes vs Depois
            </a>
            <a href="#testimonials" className="transition-colors hover:text-foreground">
              Depoimentos
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/login"
              className="h-9 rounded-sm px-4 text-xs font-bold text-muted-foreground hover:text-foreground transition-all hover:bg-surface-alt inline-flex items-center ds-label-caps"
            >
              Entrar
            </Link>
            <Link
              to="/auth/register"
              className="h-9 rounded-sm bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center ds-label-caps"
            >
              Criar Agência Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero BENTO PREMIUM ─────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-24 text-center lg:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-fadeIn">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
          </span>
          A ÚNICA PLATAFORMA DE VENDAS E OPERAÇÃO 100% TURISMO
        </div>

        <h1 className="mx-auto max-w-4xl ds-display text-foreground leading-[1.05] mb-6">
          A sua Agência de Viagens operando no{" "}
          <span className="italic font-serif text-accent">máximo lucro</span>.
        </h1>

        <p className="mx-auto mt-6 max-w-3xl ds-body-large text-muted-foreground">
          Diga adeus às planilhas soltas e PDFs pesados. Centralize propostas interativas que avisam
          quando são abertas, contratos automatizados com assinatura eletrônica na tela, controle de
          vistos/passaportes e fluxo de caixa real por viagem.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth/register"
            className="group relative inline-flex h-12 w-full sm:w-auto items-center justify-center gap-3 rounded-sm bg-primary px-8 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/95 transition-all"
          >
            Começar Agora Grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-sm border border-border-strong bg-surface px-8 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-surface-alt"
          >
            Ver Recursos
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão de crédito
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Setup completo em 2 minutos
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Teste gratuito por 14 dias
          </span>
        </div>

        {/* BENTO STATS DISPLAY */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-md border border-border bg-surface-alt p-8 transition-all hover:border-border-strong hover:bg-surface-muted group"
              >
                <div className="text-4xl font-extrabold text-foreground tracking-tight group-hover:scale-105 transition-transform duration-300">
                  {s.value}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Antes vs Depois (Neuromarketing Contrast) ─────────────────────────────────── */}
      <section
        id="comparison"
        className="relative z-10 border-y border-border bg-surface-alt py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              O Contraste do Sucesso
            </p>
            <h2 className="ds-h1 text-foreground">
              Como sua agência opera hoje vs. no <span className="text-accent">TravelOS</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-3 font-medium leading-relaxed max-w-2xl mx-auto">
              O amadorismo e o atraso processual cobram um preço alto na conversão. Compare a
              realidade operacional.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* O Jeito Doloroso */}
            <div className="rounded-md border border-border bg-surface p-8 space-y-6 hover:bg-surface-alt transition-colors duration-300">
              <h3 className="text-base font-bold text-danger flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0" />O Jeito Lento (Word, PDFs e WhatsApp
                Solto)
              </h3>
              <ul className="space-y-4 text-xs text-muted-foreground font-medium">
                <li className="flex gap-2.5 items-start">
                  <span className="text-danger font-bold shrink-0">✕</span>
                  <span>
                    Gastar 45 minutos montando uma proposta estática que vira um PDF pesado de 15MB,
                    que o cliente mal consegue abrir no 4G.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-danger font-bold shrink-0">✕</span>
                  <span>
                    Não ter ideia se o cliente abriu o link ou se simplesmente ignorou seu
                    orçamento, perdendo o momento ideal de follow-up.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-danger font-bold shrink-0">✕</span>
                  <span>
                    Contratos impressos ou enviados por e-mail que exigem scanner, assinatura manual
                    e demoram dias para retornar.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-danger font-bold shrink-0">✕</span>
                  <span>
                    Esquecer de conferir a data de validade de passaporte ou vistos do passageiro,
                    gerando cancelamentos catastróficos no check-in.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-danger font-bold shrink-0">✕</span>
                  <span>
                    Financeiro confuso, sem controle exato do DRE real por saída, comissões de
                    consultores ou parcelamentos pendentes.
                  </span>
                </li>
              </ul>
            </div>

            {/* O Jeito TravelOS */}
            <div className="rounded-md border-2 border-primary bg-surface p-8 space-y-6 relative hover:border-primary transition-all duration-300">
              <div className="absolute -top-3.5 right-6 rounded-full bg-primary px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                Fórmula de Alto Lucro
              </div>
              <h3 className="text-base font-bold text-primary flex items-center gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-accent" />O Jeito Inteligente TravelOS
              </h3>
              <ul className="space-y-4 text-xs text-foreground font-semibold">
                <li className="flex gap-2.5 items-start">
                  <span className="text-success font-bold shrink-0">✓</span>
                  <span>
                    <strong>Roteiros em 5 Minutos</strong>: crie propostas web interativas
                    ultra-rápidas com fotos de alta qualidade e tabelas de preços claras.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-success font-bold shrink-0">✓</span>
                  <span>
                    <strong>Alertas de Leitura em Tempo Real</strong>: seja notificado no
                    WhatsApp/sistema no exato instante em que o cliente abre a proposta.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-success font-bold shrink-0">✓</span>
                  <span>
                    <strong>Assinatura Digital em 1 Clique</strong>: contratos gerados
                    automaticamente baseados na proposta e assinados via celular em segundos.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-success font-bold shrink-0">✓</span>
                  <span>
                    <strong>Alarme Inteligente de Documentação</strong>: avisos automáticos e
                    recorrentes de vistos, passaportes ou certificados de vacina expirando.
                  </span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-success font-bold shrink-0">✓</span>
                  <span>
                    <strong>DRE & Margem por Viagem</strong>: acompanhe centavo por centavo do lucro
                    líquido, custos operacionais e comissões dos consultores.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ─────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Arquitetura de Sucesso Integrada
            </p>
            <h2 className="ds-h1 text-foreground">
              Tudo o que sua agência precisa em uma única plataforma.
            </h2>
            <p className="text-muted-foreground text-sm mt-3 font-medium leading-relaxed">
              Módulos construídos de forma integrada para evitar redigitação de informações e
              centralizar sua gestão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={cn(
                    "group relative overflow-hidden rounded-md border border-border bg-surface p-8 transition-all duration-300 hover:border-border-strong hover:bg-surface-alt",
                    (i === 0 || i === 3) &&
                      "md:col-span-2 lg:col-span-2 bg-surface-alt hover:bg-surface-muted",
                  )}
                >
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-sm bg-surface-muted border border-border text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-base font-bold text-foreground tracking-tight">
                        {f.title}
                      </h3>
                      {f.badge && (
                        <span className="rounded-full bg-surface-muted border border-border px-2.5 py-0.5 text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                          {f.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground font-semibold flex-1">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ────────────────────────────────────────── */}
      <section
        id="testimonials"
        className="relative z-10 border-t border-border bg-surface-alt py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Resultados de Clientes
            </p>
            <h2 className="ds-h2 text-foreground text-center">
              O que dizem os donos de agências de viagens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-md border border-border bg-surface p-8 space-y-6 hover:border-border-strong transition-all">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="text-amber-500 text-sm">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground italic text-xs leading-relaxed font-semibold">
                "O fechamento das minhas propostas subiu mais de 30% desde que comecei a usar o
                TravelOS. O cliente abre a proposta interativa no celular, assina ali mesmo em 1
                minuto e eu recebo o aviso imediato no WhatsApp. Reduziu meu ciclo de venda de dias
                para minutos."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="h-8 w-8 rounded-full bg-surface-muted border border-border flex items-center justify-center font-bold text-foreground text-xs">
                  AP
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Ana Paula Castilho</h4>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    Diretora · Castilho Operadora B2B
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface p-8 space-y-6 hover:border-border-strong transition-all">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="text-amber-500 text-sm">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground italic text-xs leading-relaxed font-semibold">
                "Antes vivíamos correndo o risco de embarcar cliente com passaporte vencido ou sem
                vistos. O robô de alertas automáticos do TravelOS salvou nossa agência de um baita
                prejuízo no mês passado. O financeiro integrado com a margem líquida por viagem
                também é fantástico."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="h-8 w-8 rounded-full bg-surface-muted border border-border flex items-center justify-center font-bold text-foreground text-xs">
                  RC
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Ricardo Camargo</h4>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    CEO · Camargo Viagens de Luxo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final Premium ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-24 text-center border-t border-border">
        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-primary-foreground mb-6 leading-tight">
            Chega de planilhas. Comece a lucrar mais com sua agência.
          </h2>
          <p className="mt-3 text-sm font-semibold text-primary-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Elimine erros operacionais de passageiros, encante com orçamentos digitais modernos e
            tenha controle total do DRE financeiro em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth/register"
              className="group relative inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-sm bg-primary-foreground px-8 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary-foreground/90 transition-all"
            >
              Criar Conta Grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-primary" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-sm border border-primary-foreground/20 bg-primary/10 backdrop-blur-md px-8 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:border-primary-foreground/45 hover:bg-primary/20"
            >
              Acessar Minha Agência
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface-alt py-10 relative z-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground text-[10px] font-bold">
              T
            </div>
            <span className="text-xs font-bold text-foreground tracking-tight uppercase">
              TravelOS
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold">
            © {new Date().getFullYear()} TravelOS. Desenvolvido exclusivamente para profissionais de
            turismo.
          </p>
          <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
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
