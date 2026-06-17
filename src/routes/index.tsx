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
    }
  });

  const homePage = systemPageQ.data;

  if (homePage?.published_blocks && Array.isArray(homePage.published_blocks) && homePage.published_blocks.length > 0) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        <BlockRenderer
          blocks={homePage.published_blocks as any[]}
          agencySlug="system"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand selection:text-brand-foreground">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground text-sm font-bold shadow-md shadow-brand/20">
              T
            </div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              TravelOS
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground font-medium">
              Funcionalidades
            </a>
            <a href="#comparison" className="transition-colors hover:text-foreground font-medium">
              Antes vs Depois
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/login"
              className="h-9 rounded-lg border border-border px-4 text-xs font-semibold transition-all hover:bg-surface-alt inline-flex items-center"
            >
              Entrar
            </Link>
            <Link
              to="/auth/register"
              className="h-9 rounded-lg bg-brand px-4 text-xs font-semibold text-brand-foreground shadow-lg shadow-brand/15 hover:shadow-brand/25 transition-all hover:opacity-95 inline-flex items-center"
            >
              Criar Agência Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero BENTO PREMIUM ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-surface-alt/20 to-background pb-24 pt-32">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-brand/3 backdrop-blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/10 rounded-full blur-[140px] pointer-events-none opacity-40" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            CONSTRUIDO EXCLUSIVAMENTE PARA AGÊNCIAS DE VIAGENS
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground md:text-7xl leading-[1.08] drop-shadow-sm">
            O Sistema Operacional que faz sua <span className="bg-gradient-to-r from-brand to-brand/80 bg-clip-text text-transparent">Agência Lucrar Mais</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed font-medium">
            Pare de perder vendas por demora no envio de PDFs ou bagunça em planilhas. Centralize propostas interativas, contratos eletrônicos, financeiro com DRE por viagem e embarques em um workspace premium.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth/register"
              className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-brand px-8 text-sm font-bold uppercase tracking-wider text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-brand/35 overflow-hidden"
            >
              <span className="relative flex items-center gap-2">
                Experimentar Grátis por 14 Dias{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-border/80 bg-surface px-8 text-sm font-bold uppercase tracking-wider text-foreground transition-all hover:border-brand/40 hover:bg-brand/3"
            >
              Acessar Painel
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand" /> Setup em menos de 2 minutos
            </span>
          </div>
        </div>

        {/* BENTO STATS */}
        <div className="relative z-10 mx-auto mt-24 max-w-4xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-surface/60 p-8 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-brand/20 hover:bg-surface"
              >
                <div className="text-4xl font-black text-brand tracking-tight">{s.value}</div>
                <div className="mt-2 text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground text-center">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Antes vs Depois (Neuromarketing Contrast) ─────────────────────────────────── */}
      <section id="comparison" className="bg-surface-alt/10 py-24 border-b border-border/50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand mb-3">
              O Contraste do Sucesso
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Como sua agência opera hoje vs. no TravelOS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* O Jeito Doloroso */}
            <div className="rounded-3xl border border-border bg-surface p-8 space-y-6 opacity-80 hover:opacity-100 transition-opacity">
              <h3 className="text-lg font-bold text-danger flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                O Jeito Lento (Planilhas e PDFs)
              </h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-danger font-bold">✕</span>
                  <span>Gastar 45 minutos montando uma proposta no Word que vira um PDF pesado de 15MB.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-danger font-bold">✕</span>
                  <span>Não ter ideia se o cliente abriu o arquivo ou se simplesmente ignorou o e-mail.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-danger font-bold">✕</span>
                  <span>Contratos assinados manualmente que demandam impressora, scanner e dias de atraso.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-danger font-bold">✕</span>
                  <span>Esquecer de conferir a validade do passaporte do passageiro e ter problemas no portão de embarque.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-danger font-bold">✕</span>
                  <span>Financeiro desorganizado, sem clareza da comissão real de cada consultor ou do lucro líquido.</span>
                </li>
              </ul>
            </div>

            {/* O Jeito TravelOS */}
            <div className="rounded-3xl border-2 border-brand bg-surface p-8 space-y-6 shadow-xl shadow-brand/5 relative">
              <div className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-foreground">
                Recomendado
              </div>
              <h3 className="text-lg font-bold text-brand flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0" />
                O Jeito TravelOS
              </h3>
              <ul className="space-y-4 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span><strong>Propostas em 5 minutos</strong>: monte itinerários interativos, adicione fotos e envie um link web elegante.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span><strong>Leitura rastreada</strong>: receba alertas na hora em que o cliente abre sua proposta para poder ligar de volta.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span><strong>Assinatura em 1 clique</strong>: contratos jurídicos gerados a partir do roteiro e assinados eletronicamente na tela.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span><strong>Alertas operacionais</strong>: controle de vistos, passaportes e listas de passageiros em um painel unificado.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span><strong>Financeiro sob controle</strong>: saiba exatamente a comissão e o DRE de lucro líquido de cada viagem em tempo real.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ─────────────────────────────────────────── */}
      <section id="features" className="bg-background py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand mb-4">
              Módulos Integrados e Inteligentes
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Tudo o que sua agência precisa em uma única tela.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-border/40 bg-surface p-8 transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/2",
                    (i === 0 || i === 3) && "md:col-span-2 lg:col-span-2 bg-surface-alt/30",
                  )}
                >
                  <div className="absolute right-0 top-0 h-40 w-40 -translate-y-10 translate-x-10 rounded-full bg-brand/5 transition-transform duration-500 group-hover:scale-150" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-brand">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                      {f.badge && (
                        <span className="rounded bg-brand/10 px-2 py-0.5 text-[9px] font-bold text-brand uppercase tracking-wider">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground font-medium flex-1">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Final Premium ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand py-24 text-brand-foreground">
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
            Pronto para colocar sua Agência no Piloto Automático?
          </h2>
          <p className="mt-4 text-base font-medium opacity-90 max-w-2xl mx-auto mb-10 leading-relaxed">
            Elimine erros operacionais, surpreenda seus clientes com propostas incríveis e tenha o controle financeiro na palma da mão. Comece agora sem digitar cartão de crédito.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth/register"
              className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-background px-10 text-sm font-bold uppercase tracking-wider text-brand transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10"
            >
              Criar Conta B2B Grátis{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-14 items-center rounded-xl border border-brand-foreground/30 px-10 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-brand-foreground/10"
            >
              Acessar Minha Agência
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface-alt/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground text-xs font-bold">
              T
            </div>
            <span className="text-sm font-bold tracking-tight">TravelOS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TravelOS · Desenvolvido exclusivamente para profissionais de turismo.
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
