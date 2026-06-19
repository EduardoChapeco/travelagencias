import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Palette,
  Type,
  Layout,
  Code,
  Layers,
  Sliders,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  Settings,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/design-system")({
  head: () => ({ meta: [{ title: "Design System · TravelOS" }] }),
  component: DesignSystemPage,
});

// Color tokens from styles.css
const COLOR_TOKENS = [
  { name: "--background", desc: "Cor principal do fundo da aplicação", category: "Core" },
  {
    name: "--foreground",
    desc: "Cor principal do texto em contraste com background",
    category: "Core",
  },
  { name: "--surface", desc: "Fundo de cartões, painéis e elementos elevados", category: "Core" },
  {
    name: "--surface-alt",
    desc: "Fundo alternativo ou secundário para tabelas/linhas",
    category: "Core",
  },
  { name: "--border", desc: "Borda padrão fina de separação e inputs", category: "Borders" },
  { name: "--border-strong", desc: "Borda mais forte para realce ou foco", category: "Borders" },
  {
    name: "--brand",
    desc: "Cor primária da marca (sobrescrevível pelo cliente)",
    category: "Brand",
  },
  { name: "--brand-light", desc: "Cor brand suavizada de fundo", category: "Brand" },
  { name: "--brand-foreground", desc: "Texto contrastante sobre a cor brand", category: "Brand" },
  { name: "--primary", desc: "Cor do texto principal e botões cheios", category: "Interactive" },
  {
    name: "--primary-foreground",
    desc: "Texto sobre botões de cor primária",
    category: "Interactive",
  },
  { name: "--secondary", desc: "Cor secundária de botões e seleções", category: "Interactive" },
  {
    name: "--secondary-foreground",
    desc: "Texto sobre botões secundários",
    category: "Interactive",
  },
  { name: "--muted", desc: "Fundo desativado ou desbotado", category: "Interactive" },
  { name: "--muted-foreground", desc: "Texto desbotado de legendas e hints", category: "Core" },
  { name: "--success", desc: "Verde indicador de operações bem-sucedidas", category: "States" },
  { name: "--success-bg", desc: "Fundo suave para mensagens de sucesso", category: "States" },
  { name: "--warning", desc: "Amarelo indicador de avisos e alertas", category: "States" },
  { name: "--warning-bg", desc: "Fundo suave para avisos", category: "States" },
  { name: "--danger", desc: "Vermelho indicador de erros ou exclusões", category: "States" },
  { name: "--danger-bg", desc: "Fundo suave para erros", category: "States" },
  { name: "--info", desc: "Azul indicador de novidades ou links úteis", category: "States" },
  { name: "--info-bg", desc: "Fundo suave para informações", category: "States" },
];

// Typography scale details
const TYPO_TOKENS = [
  {
    class: "text-[10px]",
    size: "10px",
    weight: "Medium/Bold",
    desc: "Usada para legendas pequenas, badges e status.",
  },
  {
    class: "text-xs",
    size: "12px",
    weight: "Medium/SemiBold",
    desc: "Usada para labels de formulário, inputs e tabelas secundárias.",
  },
  {
    class: "text-sm",
    size: "14px",
    weight: "Regular/Medium",
    desc: "Tamanho padrão do texto corrido do sistema.",
  },
  {
    class: "text-base",
    size: "16px",
    weight: "Medium/Bold",
    desc: "Subtítulos, destaques médios e botões destacados.",
  },
  {
    class: "text-lg",
    size: "18px",
    weight: "SemiBold/Bold",
    desc: "Títulos de seções pequenas, modais e resumos.",
  },
  {
    class: "text-xl",
    size: "20px",
    weight: "Bold/Black",
    desc: "Títulos de cabeçalho principal e estatísticas.",
  },
  {
    class: "text-2xl",
    size: "24px",
    weight: "Bold/Black",
    desc: "Destaques numéricos, heroes e banners promocionais.",
  },
  {
    class: "text-3xl",
    size: "30px",
    weight: "Black",
    desc: "Grandes banners de marketing e landing pages.",
  },
  {
    class: "text-4xl",
    size: "36px",
    weight: "Black",
    desc: "Hero title principal da landing page de vendas.",
  },
];

// Presets do Page Builder (Dynamic Blocks)
const BLOCK_PRESETS = {
  gradients: [
    { name: "Sunset Glow", css: "bg-gradient-to-r from-orange-500 to-rose-500 text-white" },
    {
      name: "Violet Dreams",
      css: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white",
    },
    { name: "Ocean Breeze", css: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" },
    { name: "Neon Mint", css: "bg-gradient-to-r from-emerald-400 to-cyan-500 text-white" },
    {
      name: "Midnight Premium",
      css: "bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800",
    },
  ],
  borders: [
    { name: "Fina Padrão", class: "border border-border" },
    { name: "Vidro (Glassmorphic)", class: "border border-white/20 bg-white/5 backdrop-blur-md" },
    {
      name: "Glow Iluminada",
      class: "border border-brand/40 ring-1 ring-brand/20 shadow-none",
    },
  ],
};

type SandboxElement = {
  id: string;
  type: "header" | "paragraph" | "button" | "image" | "features";
  title?: string;
  content?: string;
  buttonText?: string;
  imageUrl?: string;
  featuresList?: string[];
};

function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<
    "principles" | "colors" | "typography" | "layouts" | "components" | "presets" | "sandbox"
  >("principles");

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // State for components catalog
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const toggleCode = (id: string) => {
    setShowCode((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // State for Sandbox
  const [sandboxBg, setSandboxBg] = useState<string>("bg-surface");
  const [sandboxBorder, setSandboxBorder] = useState<string>("border border-border");
  const [sandboxPadding, setSandboxPadding] = useState<string>("p-8");
  const [sandboxAlign, setSandboxAlign] = useState<string>("text-left");
  const [sandboxElements, setSandboxElements] = useState<SandboxElement[]>([
    { id: "1", type: "header", title: "Crie Propostas Convincentes" },
    {
      id: "2",
      type: "paragraph",
      content:
        "Nosso motor integrado permite criar propostas comerciais em menos de 5 minutos, sem usar planilhas.",
    },
    { id: "3", type: "button", buttonText: "Começar Agora" },
  ]);

  const addSandboxElement = (type: "header" | "paragraph" | "button" | "image" | "features") => {
    const newEl: SandboxElement = {
      id: Date.now().toString(),
      type,
    };
    if (type === "header") newEl.title = "Título da Seção";
    if (type === "paragraph") newEl.content = "Texto complementar da seção descritiva.";
    if (type === "button") newEl.buttonText = "Botão de Ação";
    if (type === "image")
      newEl.imageUrl =
        "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=600&auto=format&fit=crop&q=60";
    if (type === "features")
      newEl.featuresList = ["Item do recurso A", "Item do recurso B", "Item do recurso C"];

    setSandboxElements([...sandboxElements, newEl]);
  };

  const removeSandboxElement = (id: string) => {
    setSandboxElements(sandboxElements.filter((el) => el.id !== id));
  };

  const updateSandboxElement = (id: string, field: string, value: any) => {
    setSandboxElements(
      sandboxElements.map((el) => {
        if (el.id === id) {
          return { ...el, [field]: value };
        }
        return el;
      }),
    );
  };

  // Generate JSX/HTML code representation
  const generateSandboxCode = () => {
    const borderClass = sandboxBorder;
    const padClass = sandboxPadding;
    const alignClass = sandboxAlign;
    const bgClass = sandboxBg;

    let elementsMarkup = "";
    sandboxElements.forEach((el) => {
      if (el.type === "header") {
        elementsMarkup += `\n    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">${el.title}</h2>`;
      } else if (el.type === "paragraph") {
        elementsMarkup += `\n    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">${el.content}</p>`;
      } else if (el.type === "button") {
        elementsMarkup += `\n    <button className="inline-flex h-9 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground px-5 py-2 hover:bg-brand/90 transition-all select-none">${el.buttonText}</button>`;
      } else if (el.type === "image") {
        elementsMarkup += `\n    <img src="${el.imageUrl}" alt="Mockup" className="rounded-xl border border-border w-full object-cover max-h-48" />`;
      } else if (el.type === "features") {
        const listItems = (el.featuresList || [])
          .map(
            (f) =>
              `\n      <li className="flex items-center gap-2 text-xs text-foreground/80"><Check className="h-3.5 w-3.5 text-brand shrink-0" /> ${f}</li>`,
          )
          .join("");
        elementsMarkup += `\n    <ul className="space-y-2 text-left">${listItems}\n    </ul>`;
      }
    });

    return `<div className={cn(\n  "rounded-2xl flex flex-col gap-4 ${bgClass} ${borderClass} ${padClass} ${alignClass}"\n)}>${elementsMarkup}\n</div>`;
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-3">
          <StatusBadge tone="info">Documento Pétreo</StatusBadge>
        </div>
      </HeaderPortal>

      {/* Internal Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-surface flex flex-col justify-between select-none">
        <div className="p-4 border-b border-border/80 bg-surface-alt/25">
          <h2 className="text-xs font-extrabold tracking-wider text-foreground uppercase flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-brand" /> Design System Hub
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Fonte de Verdade Visual</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
          {[
            { id: "principles", label: "💡 Princípios Visuais" },
            { id: "colors", label: "🎨 Paleta de Cores" },
            { id: "typography", label: "✍️ Tipografia & Textos" },
            { id: "layouts", label: "📐 Layout, Grids & Bento" },
            { id: "components", label: "🧱 Componentes Reais" },
            { id: "presets", label: "⚙️ Presets Page Builder" },
            { id: "sandbox", label: "🔬 Sandbox de Layout" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "bg-brand/10 text-brand font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/55",
              )}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-brand" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border bg-surface-alt/10 text-[10px] text-muted-foreground leading-relaxed font-mono">
          TravelOS UI v1.2.0
          <br />
          No Shadows Mode
        </div>
      </aside>

      {/* Scrollable Contents */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin bg-background/50 space-y-8">
        {/* TAB 1: PRINCIPLES */}
        {activeTab === "principles" && (
          <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                💡 Princípios Visuais Pétreos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Diretrizes conceituais que orientam a engenharia e design do TravelOS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  1. Design Utilitário e Profissional
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O TravelOS é um workspace operacional para agências de viagens gerirem dados
                  críticos. A interface prioriza densidade de informação, facilidade de leitura e
                  agilidade. Evitamos decorações dispensáveis.
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  2. Sem Sombras Estáticas (Flat Design)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para conferir uma estética limpa, lisa e premium, removemos todas as sombras de
                  cards e tabelas. Usamos bordas finas e realces de cores de fundo
                  (`bg-surface-alt`) para criar relevo visual.
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  3. Acessibilidade e Contraste
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cores de texto (`text-foreground` e `text-muted-foreground`) foram calculadas para
                  dar contraste perfeito com os fundos de superfície em ambos os modos Claro e
                  Escuro.
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  4. Coesão Sincronizada
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Variáveis de cores e fontes são centralizadas. Alterar a marca da agência no
                  painel de identidade visual propaga automaticamente o visual por toda a plataforma
                  operacional e portais públicos.
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <strong>Atenção Desenvolvedor:</strong> Ao criar novas seções ou módulos, NUNCA
                utilize classes utilitárias de sombras como `shadow-sm`, `shadow-md`, `shadow-lg` de
                forma estática. Caso precise de relevo, prefira bordas finas (`border
                border-border`) ou cores de superfície diferenciadas.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLORS */}
        {activeTab === "colors" && (
          <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                  🎨 Paleta de Cores Dinâmicas
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis CSS centralizadas que sustentam os temas Light e Dark.
                </p>
              </div>
              <GhostButton
                onClick={() =>
                  copyToClipboard(COLOR_TOKENS.map((t) => `${t.name}: var(${t.name});`).join("\n"))
                }
                className="text-xs gap-1.5 h-8"
              >
                <Copy className="h-3 w-3" /> Copiar Todas as Variáveis
              </GhostButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {COLOR_TOKENS.map((token) => (
                <div
                  key={token.name}
                  className="p-3 bg-surface border border-border rounded-xl flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {token.name}
                      </span>
                      <StatusBadge tone="neutral">{token.category}</StatusBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{token.desc}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Visual color swatch representing current live style */}
                    <div
                      className="w-10 h-6 rounded border border-border/60 shrink-0"
                      style={{ backgroundColor: `var(${token.name})` }}
                    />
                    <button
                      onClick={() => copyToClipboard(`var(${token.name})`)}
                      className="text-[10px] text-brand hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Copy className="h-2.5 w-2.5" /> Copiar token
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY */}
        {activeTab === "typography" && (
          <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                ✍️ Tipografia e Escala de Texto
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Escalonamento de fontes padronizado na plataforma.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-alt/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Classe Tailwind</th>
                    <th className="p-4">Tamanho</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-right">Visualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs text-foreground/80 font-sans">
                  {TYPO_TOKENS.map((typo) => (
                    <tr key={typo.class} className="hover:bg-surface-alt/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-brand">{typo.class}</td>
                      <td className="p-4 font-mono text-[11px]">{typo.size}</td>
                      <td className="p-4 text-muted-foreground max-w-xs">{typo.desc}</td>
                      <td className="p-4 text-right font-semibold">
                        <span className={typo.class}>TravelOS</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase">
                Especificação de Fontes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold block text-muted-foreground">
                    Fonte Sans-Serif (Textos e Inputs)
                  </span>
                  <code className="block bg-surface-alt p-2 rounded border border-border/80 font-mono text-[11px]">
                    font-family: var(--font-sans) ("Inter", -apple-system, sans-serif)
                  </code>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold block text-muted-foreground">
                    Fonte Monoespaçada (Códigos e Logs)
                  </span>
                  <code className="block bg-surface-alt p-2 rounded border border-border/80 font-mono text-[11px]">
                    font-family: var(--font-mono) ("JetBrains Mono", monospace)
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LAYOUTS */}
        {activeTab === "layouts" && (
          <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                📐 Layout, Grids e Alinhamentos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Diretrizes estruturais para criação de dashboards e bento grids responsivos.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-surface border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase">
                  1. Margens e Paddings de Página
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Páginas administrativas comuns de formulário ou listagem utilizam paddings de
                  container responsivos para manter a harmonia em todas as telas:
                </p>
                <code className="block bg-surface-alt p-2.5 rounded border border-border/80 font-mono text-[11px] text-brand">
                  &lt;div className="px-4 md:px-6 py-4 md:py-6"&gt; ... &lt;/div&gt;
                </code>
              </div>

              <div className="p-5 bg-surface border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase">
                  2. Estrutura Bento Grid de 3 Colunas
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para painéis descritivos e cards de recursos, utilizamos o grid de 3 colunas
                  padrão com spans definidos no Tailwind:
                </p>
                <pre className="bg-surface-alt p-3 rounded border border-border/80 font-mono text-[10.5px] leading-relaxed text-brand overflow-x-auto">
                  {`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Card Comum */}
  <div className="bg-surface border border-border rounded-2xl p-5">...</div>
  {/* Card Estendido (Largura Dupla no Desktop) */}
  <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">...</div>
</div>`}
                </pre>
              </div>

              <div className="p-5 bg-surface border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase">
                  3. Cabeçalho de Página (HeaderPortal)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para manter os botões de ação e status no topo da barra de navegação global,
                  utilize o portal nativo:
                </p>
                <pre className="bg-surface-alt p-3 rounded border border-border/80 font-mono text-[10.5px] leading-relaxed text-brand overflow-x-auto">
                  {`<HeaderPortal>
  <div className="flex items-center gap-2">
    <GhostButton>Voltar</GhostButton>
    <PrimaryButton>Salvar Dados</PrimaryButton>
  </div>
</HeaderPortal>`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COMPONENTS */}
        {activeTab === "components" && (
          <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                🧱 Catálogo de Componentes Vivos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Componentes reais importados de `@/components/ui/form` prontos para renderização e
                uso.
              </p>
            </div>

            {/* Sub-component: Buttons */}
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Botões Interativos
                </h4>
                <GhostButton
                  onClick={() => toggleCode("buttons")}
                  className="h-7 text-[11px] gap-1"
                >
                  <Code className="h-3 w-3" />{" "}
                  {showCode["buttons"] ? "Ocultar Código" : "Ver Código"}
                </GhostButton>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton>Primary Button</PrimaryButton>
                <PrimaryButton disabled>Disabled Primary</PrimaryButton>
                <GhostButton>Ghost Button</GhostButton>
                <GhostButton disabled>Disabled Ghost</GhostButton>
              </div>

              {showCode["buttons"] && (
                <pre className="bg-surface-alt p-3 rounded border border-border font-mono text-[11px] text-brand overflow-x-auto">
                  {`import { PrimaryButton, GhostButton } from "@/components/ui/form";

// Uso dos botões padrão:
<PrimaryButton onClick={handleSave}>Salvar Alterações</PrimaryButton>
<PrimaryButton disabled>Salvando...</PrimaryButton>

<GhostButton onClick={handleCancel}>Voltar</GhostButton>
<GhostButton disabled>Indisponível</GhostButton>`}
                </pre>
              )}
            </div>

            {/* Sub-component: Form Fields */}
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Campos de Formulário e Validação
                </h4>
                <GhostButton onClick={() => toggleCode("forms")} className="h-7 text-[11px] gap-1">
                  <Code className="h-3 w-3" /> {showCode["forms"] ? "Ocultar Código" : "Ver Código"}
                </GhostButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome Completo" hint="Insira seu nome igual ao do passaporte.">
                  <Input placeholder="Ex: Eduardo Silveira" />
                </Field>
                <Field label="Selecione o Destino" error="Este campo é obrigatório.">
                  <Select>
                    <option value="">Escolha um país...</option>
                    <option value="br">Brasil</option>
                    <option value="us">Estados Unidos</option>
                    <option value="fr">França</option>
                  </Select>
                </Field>
              </div>

              {showCode["forms"] && (
                <pre className="bg-surface-alt p-3 rounded border border-border font-mono text-[11px] text-brand overflow-x-auto">
                  {`import { Field, Input, Select } from "@/components/ui/form";

<Field label="Nome Completo" hint="Insira seu nome igual ao do passaporte.">
  <Input placeholder="Ex: Eduardo Silveira" />
</Field>

<Field label="Selecione o Destino" error="Este campo é obrigatório.">
  <Select>
    <option value="">Escolha um país...</option>
  </Select>
</Field>`}
                </pre>
              )}
            </div>

            {/* Sub-component: Status Badges */}
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Status Badges
                </h4>
                <GhostButton onClick={() => toggleCode("badges")} className="h-7 text-[11px] gap-1">
                  <Code className="h-3 w-3" />{" "}
                  {showCode["badges"] ? "Ocultar Código" : "Ver Código"}
                </GhostButton>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone="neutral">Rascunho</StatusBadge>
                <StatusBadge tone="success">Pago / Ativo</StatusBadge>
                <StatusBadge tone="warning">Pendente / Trial</StatusBadge>
                <StatusBadge tone="danger">Atrasado / Cancelado</StatusBadge>
                <StatusBadge tone="info">Novidade</StatusBadge>
              </div>

              {showCode["badges"] && (
                <pre className="bg-surface-alt p-3 rounded border border-border font-mono text-[11px] text-brand overflow-x-auto">
                  {`import { StatusBadge } from "@/components/ui/form";

<StatusBadge tone="neutral">Rascunho</StatusBadge>
<StatusBadge tone="success">Pago / Ativo</StatusBadge>
<StatusBadge tone="warning">Pendente / Trial</StatusBadge>
<StatusBadge tone="danger">Atrasado / Cancelado</StatusBadge>
<StatusBadge tone="info">Novidade</StatusBadge>`}
                </pre>
              )}
            </div>

            {/* Sub-component: Alerts */}
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Alertas Planos (Sem Sombras)
                </h4>
                <GhostButton onClick={() => toggleCode("alerts")} className="h-7 text-[11px] gap-1">
                  <Code className="h-3 w-3" />{" "}
                  {showCode["alerts"] ? "Ocultar Código" : "Ver Código"}
                </GhostButton>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="bg-info-bg text-info border border-info/30 rounded-xl p-4 flex gap-3">
                  <Info className="h-4.5 w-4.5 shrink-0" />
                  <div>
                    <strong>Informativo:</strong> O sistema de checkout suporta parcelamento em até
                    12 vezes via cartão de crédito.
                  </div>
                </div>

                <div className="bg-success-bg text-success border border-success/30 rounded-xl p-4 flex gap-3">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <div>
                    <strong>Sucesso:</strong> Assinatura eletrônica concluída. O documento foi
                    emitido e arquivado.
                  </div>
                </div>
              </div>

              {showCode["alerts"] && (
                <pre className="bg-surface-alt p-3 rounded border border-border font-mono text-[11px] text-brand overflow-x-auto">
                  {`// Alerta Azul (Info)
<div className="bg-info-bg text-info border border-info/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed">
  <Info className="h-4.5 w-4.5 shrink-0" />
  <div>
    <strong>Informativo:</strong> Detalhe explicativo aqui.
  </div>
</div>

// Alerta Verde (Success)
<div className="bg-success-bg text-success border border-success/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed">
  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
  <div>
    <strong>Sucesso:</strong> Sucesso da operação aqui.
  </div>
</div>`}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PRESETS */}
        {activeTab === "presets" && (
          <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                ⚙️ Presets do Page Builder
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Efeitos visuais padronizados que o administrador pode aplicar nas seções dinâmicas.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase">
                  Gradientes Autorizados (Cores do Hub)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {BLOCK_PRESETS.gradients.map((grad) => (
                    <div
                      key={grad.name}
                      className={cn(
                        "p-4 rounded-xl flex flex-col justify-end h-20 shadow-none font-bold text-xs",
                        grad.css,
                      )}
                    >
                      {grad.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase font-sans">
                  Efeitos de Borda (Elevations)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {BLOCK_PRESETS.borders.map((bor) => (
                    <div
                      key={bor.name}
                      className={cn(
                        "bg-surface p-5 rounded-2xl flex flex-col justify-center text-center text-xs h-24 font-semibold text-foreground",
                        bor.class,
                      )}
                    >
                      {bor.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SANDBOX */}
        {activeTab === "sandbox" && (
          <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase">
                🔬 Sandbox do Criador de Elementos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Construa e refine layouts combinando classes e veja o código resultante na hora.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Sandbox Control Panel */}
              <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-5 space-y-5">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand" /> Parâmetros da Seção
                </h4>

                <div className="space-y-3">
                  <Field label="Cor de Fundo">
                    <Select value={sandboxBg} onChange={(e) => setSandboxBg(e.target.value)}>
                      <option value="bg-surface">Sólida: Surface (Branco/Cinza Escuro)</option>
                      <option value="bg-surface-alt/45">Sólida: Surface Alt (Cinza Suave)</option>
                      <option value="bg-brand text-brand-foreground">
                        Sólida: Brand Primary (Cor da Agência)
                      </option>
                      <option value="bg-gradient-to-r from-orange-500 to-rose-500 text-white">
                        Sunset Glow (Gradiente)
                      </option>
                      <option value="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                        Violet Dreams (Gradiente)
                      </option>
                      <option value="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                        Ocean Breeze (Gradiente)
                      </option>
                      <option value="bg-gradient-to-r from-emerald-400 to-cyan-500 text-white">
                        Neon Mint (Gradiente)
                      </option>
                      <option value="bg-gradient-to-b from-zinc-900 to-black text-white">
                        Midnight Premium
                      </option>
                    </Select>
                  </Field>

                  <Field label="Efeito de Borda">
                    <Select
                      value={sandboxBorder}
                      onChange={(e) => setSandboxBorder(e.target.value)}
                    >
                      <option value="border border-border">
                        Fina Padrão (border border-border)
                      </option>
                      <option value="border border-white/20 bg-white/5 backdrop-blur-md">
                        Vidro (Glassmorphic)
                      </option>
                      <option value="border border-brand/40 ring-1 ring-brand/20 shadow-none">
                        Glow Iluminada
                      </option>
                      <option value="border-0">Nenhuma</option>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Espaçamento (Padding)">
                      <Select
                        value={sandboxPadding}
                        onChange={(e) => setSandboxPadding(e.target.value)}
                      >
                        <option value="p-4">Compacto (p-4)</option>
                        <option value="p-6">Médio (p-6)</option>
                        <option value="p-8">Largo (p-8)</option>
                        <option value="p-12">Muito Largo (p-12)</option>
                      </Select>
                    </Field>

                    <Field label="Alinhamento">
                      <Select
                        value={sandboxAlign}
                        onChange={(e) => setSandboxAlign(e.target.value)}
                      >
                        <option value="text-left">Esquerda (text-left)</option>
                        <option value="text-center">Centralizado (text-center)</option>
                      </Select>
                    </Field>
                  </div>
                </div>

                {/* Elements Adder */}
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">
                    Incluir Elementos
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => addSandboxElement("header")}
                      className="h-8 rounded-lg bg-surface border border-border hover:border-brand/40 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Título
                    </button>
                    <button
                      onClick={() => addSandboxElement("paragraph")}
                      className="h-8 rounded-lg bg-surface border border-border hover:border-brand/40 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Parágrafo
                    </button>
                    <button
                      onClick={() => addSandboxElement("button")}
                      className="h-8 rounded-lg bg-surface border border-border hover:border-brand/40 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Botão CTA
                    </button>
                    <button
                      onClick={() => addSandboxElement("image")}
                      className="h-8 rounded-lg bg-surface border border-border hover:border-brand/40 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Imagem
                    </button>
                    <button
                      onClick={() => addSandboxElement("features")}
                      className="h-8 rounded-lg bg-surface border border-border hover:border-brand/40 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Recursos
                    </button>
                  </div>
                </div>

                {/* Elements Editor list */}
                {sandboxElements.length > 0 && (
                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Configurar Elementos ({sandboxElements.length})
                    </span>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1.5 scrollbar-thin">
                      {sandboxElements.map((el, i) => (
                        <div
                          key={el.id}
                          className="p-3 bg-surface-alt/40 border border-border/50 rounded-xl space-y-2 relative group/item"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                              #{i + 1} {el.type}
                            </span>
                            <button
                              onClick={() => removeSandboxElement(el.id)}
                              className="text-muted-foreground hover:text-danger cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {el.type === "header" && (
                            <Input
                              value={el.title}
                              onChange={(e) => updateSandboxElement(el.id, "title", e.target.value)}
                              placeholder="Título"
                              className="h-8 text-xs"
                            />
                          )}

                          {el.type === "paragraph" && (
                            <Textarea
                              value={el.content}
                              onChange={(e) =>
                                updateSandboxElement(el.id, "content", e.target.value)
                              }
                              placeholder="Conteúdo descritivo"
                              className="min-h-[50px] text-xs p-2"
                            />
                          )}

                          {el.type === "button" && (
                            <Input
                              value={el.buttonText}
                              onChange={(e) =>
                                updateSandboxElement(el.id, "buttonText", e.target.value)
                              }
                              placeholder="Texto do botão"
                              className="h-8 text-xs"
                            />
                          )}

                          {el.type === "image" && (
                            <Input
                              value={el.imageUrl}
                              onChange={(e) =>
                                updateSandboxElement(el.id, "imageUrl", e.target.value)
                              }
                              placeholder="URL da Imagem"
                              className="h-8 text-xs font-mono"
                            />
                          )}

                          {el.type === "features" && (
                            <div className="space-y-1.5">
                              {(el.featuresList || []).map((feat, fIdx) => (
                                <Input
                                  key={fIdx}
                                  value={feat}
                                  onChange={(e) => {
                                    const nextList = [...(el.featuresList || [])];
                                    nextList[fIdx] = e.target.value;
                                    updateSandboxElement(el.id, "featuresList", nextList);
                                  }}
                                  className="h-7 text-[11px]"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sandbox Render Preview & Code Export */}
              <div className="lg:col-span-7 space-y-6">
                {/* Live Preview Frame */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-brand" /> Preview em Tempo Real
                  </span>

                  <div className="rounded-2xl border border-dashed border-border p-6 bg-surface-alt/30 flex items-center justify-center min-h-[300px]">
                    <div
                      className={cn(
                        "w-full rounded-2xl flex flex-col gap-4 transition-all duration-300",
                        sandboxBg,
                        sandboxBorder,
                        sandboxPadding,
                        sandboxAlign,
                      )}
                    >
                      {sandboxElements.map((el) => {
                        if (el.type === "header") {
                          return (
                            <h2
                              key={el.id}
                              className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground"
                            >
                              {el.title}
                            </h2>
                          );
                        }
                        if (el.type === "paragraph") {
                          return (
                            <p
                              key={el.id}
                              className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto"
                            >
                              {el.content}
                            </p>
                          );
                        }
                        if (el.type === "button") {
                          return (
                            <div key={el.id}>
                              <button className="inline-flex h-9 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground px-5 py-2 hover:bg-brand/90 transition-all select-none cursor-pointer">
                                {el.buttonText}
                              </button>
                            </div>
                          );
                        }
                        if (el.type === "image") {
                          return (
                            <img
                              key={el.id}
                              src={el.imageUrl}
                              alt="Render Preview"
                              className="rounded-xl border border-border w-full object-cover max-h-48"
                            />
                          );
                        }
                        if (el.type === "features") {
                          return (
                            <ul key={el.id} className="space-y-2 inline-block text-left">
                              {(el.featuresList || []).map((feat, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center gap-2 text-xs text-foreground/80"
                                >
                                  <Check className="h-3.5 w-3.5 text-brand shrink-0" /> {feat}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return null;
                      })}

                      {sandboxElements.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                          Adicione elementos no painel esquerdo para visualizar a seção.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* React/Tailwind Code Output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Code className="w-3.5 h-3.5 text-brand" /> Código JSX (Tailwind v4)
                    </span>
                    <button
                      onClick={() => copyToClipboard(generateSandboxCode())}
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Código
                    </button>
                  </div>

                  <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-xl border border-zinc-800 font-mono text-[10.5px] leading-relaxed overflow-x-auto max-h-60 scrollbar-thin">
                    {generateSandboxCode()}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
