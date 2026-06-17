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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* ── Background Glow Blobs ────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[140px] animate-pulse duration-[8s]" />
        <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] bg-violet-900/15 rounded-full blur-[120px] animate-pulse duration-[10s]" />
        <div className="absolute bottom-[10%] left-[15%] w-[40vw] h-[40vw] bg-purple-900/10 rounded-full blur-[130px]" />
      </div>

      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-black">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
                TravelOS
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 leading-none">
                B2B Workspace
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-zinc-400 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-50 flex items-center gap-1">
              Recursos
            </a>
            <a href="#comparison" className="transition-colors hover:text-zinc-50">
              Antes vs Depois
            </a>
            <a href="#testimonials" className="transition-colors hover:text-zinc-50">
              Depoimentos
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/auth/login"
              className="h-10 rounded-xl px-5 text-sm font-bold text-zinc-300 transition-all hover:bg-zinc-900 hover:text-zinc-50 inline-flex items-center"
            >
              Entrar
            </Link>
            <Link
              to="/auth/register"
              className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-sm font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center"
            >
              Criar Agência Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero BENTO PREMIUM ─────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-28 text-center lg:pt-28">
        <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 animate-fadeIn">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          A ÚNICA PLATAFORMA DE VENDAS E OPERAÇÃO 100% TURISMO
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl lg:text-8xl leading-[1.05]">
          A sua Agência de Viagens operando no{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
            máximo lucro
          </span>.
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-base md:text-lg text-zinc-400 leading-relaxed font-medium">
          Diga adeus às planilhas soltas e PDFs pesados. Centralize propostas interativas que avisam quando são abertas, contratos automatizados com assinatura eletrônica na tela, controle de vistos/passaportes e fluxo de caixa real por viagem.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/auth/register"
            className="group relative inline-flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-pink-600 px-10 text-sm font-black uppercase tracking-wider text-white hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            Começar Agora Grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-10 text-sm font-bold uppercase tracking-wider text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
          >
            Ver Recursos
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-zinc-500">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400" /> Sem cartão de crédito
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400" /> Setup completo em 2 minutos
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400" /> Teste gratuito por 14 dias
          </span>
        </div>

        {/* BENTO STATS DISPLAY */}
        <div className="mx-auto mt-24 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-8 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-indigo-500/20 hover:bg-zinc-900/50 group"
              >
                <div className="text-5xl font-black bg-gradient-to-br from-indigo-400 to-violet-500 bg-clip-text text-transparent tracking-tight group-hover:scale-105 transition-transform duration-300">
                  {s.value}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-widest font-black text-zinc-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Antes vs Depois (Neuromarketing Contrast) ─────────────────────────────────── */}
      <section id="comparison" className="relative z-10 border-y border-zinc-900 bg-zinc-950/40 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">
              O Contraste do Sucesso
            </p>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white">
              Como sua agência opera hoje vs. no <span className="text-indigo-400">TravelOS</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-4 font-medium leading-relaxed">
              O amadorismo e o atraso processual cobram um preço alto na conversão. Compare a realidade operacional.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* O Jeito Doloroso */}
            <div className="rounded-3xl border border-red-950/40 bg-red-950/5 p-10 space-y-8 opacity-75 hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                O Jeito Lento (Word, PDFs e WhatsApp Solto)
              </h3>
              <ul className="space-y-5 text-sm text-zinc-400">
                <li className="flex gap-3 items-start">
                  <span className="text-red-500 font-bold shrink-0 text-base">✕</span>
                  <span>Gastar 45 minutos montando uma proposta estática que vira um PDF pesado de 15MB, que o cliente mal consegue abrir no 4G.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-500 font-bold shrink-0 text-base">✕</span>
                  <span>Não ter ideia se o cliente abriu o link ou se simplesmente ignorou seu orçamento, perdendo o momento ideal de follow-up.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-500 font-bold shrink-0 text-base">✕</span>
                  <span>Contratos impressos ou enviados por e-mail que exigem scanner, assinatura manual e demoram dias para retornar.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-500 font-bold shrink-0 text-base">✕</span>
                  <span>Esquecer de conferir a data de validade de passaporte ou vistos do passageiro, gerando cancelamentos catastróficos no check-in.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-500 font-bold shrink-0 text-base">✕</span>
                  <span>Financeiro confuso, sem controle exato do DRE real por saída, comissões de consultores ou parcelamentos pendentes.</span>
                </li>
              </ul>
            </div>

            {/* O Jeito TravelOS */}
            <div className="rounded-3xl border-2 border-indigo-500/80 bg-gradient-to-br from-indigo-950/20 to-zinc-900/50 p-10 space-y-8 relative">
              <div className="absolute -top-3.5 right-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                Fórmula de Alto Lucro
              </div>
              <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-3">
                <Sparkles className="h-6 w-6 shrink-0 text-violet-400" />
                O Jeito Inteligente TravelOS
              </h3>
              <ul className="space-y-5 text-sm text-zinc-100">
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0 text-base">✓</span>
                  <span><strong>Roteiros em 5 Minutos</strong>: crie propostas web interativas ultra-rápidas com fotos de alta qualidade e tabelas de preços claras.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0 text-base">✓</span>
                  <span><strong>Alertas de Leitura em Tempo Real</strong>: seja notificado no WhatsApp/sistema no exato instante em que o cliente abre a proposta.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0 text-base">✓</span>
                  <span><strong>Assinatura Digital em 1 Clique</strong>: contratos gerados automaticamente baseados na proposta e assinados via celular em segundos.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0 text-base">✓</span>
                  <span><strong>Alarme Inteligente de Documentação</strong>: avisos automáticos e recorrentes de vistos, passaportes ou certificados de vacina expirando.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0 text-base">✓</span>
                  <span><strong>DRE & Margem por Viagem</strong>: acompanhe centavo por centavo do lucro líquido, custos operacionais e comissões dos consultores.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ─────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">
              Arquitetura de Sucesso Integrada
            </p>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Tudo o que sua agência precisa em uma única plataforma.
            </h2>
            <p className="text-zinc-400 text-sm mt-4 font-medium leading-relaxed">
              Módulos construídos de forma integrada para evitar redigitação de informações e centralizar sua gestão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/20 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/30 hover:bg-zinc-900/40",
                    (i === 0 || i === 3) && "md:col-span-2 lg:col-span-2 bg-gradient-to-br from-indigo-950/10 to-zinc-900/30",
                  )}
                >
                  <div className="absolute right-[-20px] top-[-20px] h-32 w-32 rounded-full bg-indigo-500/5 blur-xl transition-transform duration-500 group-hover:scale-150" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                      <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white tracking-tight">{f.title}</h3>
                      {f.badge && (
                        <span className="rounded-full bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                          {f.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-400 font-semibold flex-1">
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
      <section id="testimonials" className="relative z-10 border-t border-zinc-900 bg-zinc-950/60 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">
              Resultados de Clientes
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              O que dizem os donos de agências de viagens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/20 p-8 space-y-6">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => <span key={n} className="text-amber-500 text-lg">★</span>)}
              </div>
              <p className="text-zinc-300 italic text-sm leading-relaxed">
                "O fechamento das minhas propostas subiu mais de 30% desde que comecei a usar o TravelOS. O cliente abre a proposta interativa no celular, assina ali mesmo em 1 minuto e eu recebo o aviso imediato no WhatsApp. Reduziu meu ciclo de venda de dias para minutos."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/50">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                  AP
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ana Paula Castilho</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Diretora · Castilho Operadora B2B</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/20 p-8 space-y-6">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => <span key={n} className="text-amber-500 text-lg">★</span>)}
              </div>
              <p className="text-zinc-300 italic text-sm leading-relaxed">
                "Antes vivíamos correndo o risco de embarcar cliente com passaporte vencido ou sem vistos. O robô de alertas automáticos do TravelOS salvou nossa agência de um baita prejuízo no mês passado. O financeiro integrado com a margem líquida por viagem também é fantástico."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/50">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                  RC
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ricardo Camargo</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">CEO · Camargo Viagens de Luxo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final Premium ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-violet-950 to-zinc-950 py-32 text-center border-t border-zinc-900">
        <div className="absolute inset-0 bg-zinc-950/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-8 leading-tight">
            Chega de planilhas. Comece a lucrar mais com sua agência.
          </h2>
          <p className="mt-4 text-base font-semibold text-zinc-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Elimine erros operacionais de passageiros, encante com orçamentos digitais modernos e tenha controle total do DRE financeiro em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth/register"
              className="group relative inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-10 text-sm font-black uppercase tracking-wider text-white hover:-translate-y-0.5 transition-all"
            >
              Criar Conta Grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-10 text-sm font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
            >
              Acessar Minha Agência
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 relative z-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white text-xs font-black">
              T
            </div>
            <span className="text-sm font-bold text-white tracking-tight">TravelOS</span>
          </div>
          <p className="text-xs text-zinc-500 font-semibold">
            © {new Date().getFullYear()} TravelOS. Desenvolvido exclusivamente para profissionais de turismo.
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-500 font-bold">
            <Link to="/auth/login" className="hover:text-zinc-300 transition-colors">
              Entrar
            </Link>
            <Link to="/auth/register" className="hover:text-zinc-300 transition-colors">
              Cadastrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

