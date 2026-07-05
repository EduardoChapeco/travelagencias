---
# TravelOS — Design System
# Machine-readable tokens para agentes (Antigravity, Cursor, Claude Code)
# Fonte de verdade: src/styles.css
# Nunca inventar valores ad-hoc. Sempre referenciar estes tokens.

tokens:
  # ---
  # PALETA — Modo Claro (light)
  # ---
  color:
    # Fundos e superfícies
    background:      "#ffffff"
    surface:         "#ffffff"
    surface-alt:     "#f8f7f4"
    surface-muted:   "#f2f0ea"

    # Texto
    foreground:      "#151515"
    muted-fg:        "#777168"
    muted-2:         "#a39b90"

    # Primário / Secundário
    primary:         "#151515"
    primary-fg:      "#ffffff"
    secondary:       "#f8f7f4"
    secondary-fg:    "#151515"

    # Accent
    accent:          "#151515"
    accent-fg:       "#ffffff"
    accent-soft:     "#f8f7f4"

    # Bordas
    border:          "#e8e4dc"
    border-strong:   "#d9d3c8"

    # Estados semânticos (NUNCA usar red/green crus — usar estes)
    success:         "#157f3d"
    success-bg:      "#edf8f1"
    warning:         "#a85b14"
    warning-bg:      "#fff4e6"
    danger:          "#b42318"
    danger-bg:       "#fff1ef"
    info:            "#2452c6"
    info-bg:         "#eef4ff"

    # Brand da agência (sobrescrito em runtime via CSS var)
    brand:           "var(--agency-brand, #151515)"
    brand-light:     "var(--agency-brand-light, #f8f7f4)"
    brand-fg:        "var(--agency-brand-fg, #ffffff)"

    # Highlights animados (somente em UI do design system — não decorativo)
    highlight-a:     "#2452c6"
    highlight-b:     "#6d36c8"
    highlight-c:     "#157f3d"

    # Sidebar
    sidebar:         "#ffffff"
    sidebar-fg:      "#151515"
    sidebar-accent:  "#f8f7f4"
    sidebar-border:  "#e8e4dc"

  # ---
  # PALETA — Modo Escuro (dark)
  # ---
  color-dark:
    background:      "#151515"
    surface:         "#151515"
    surface-alt:     "#1f1e1b"
    surface-muted:   "#292825"
    foreground:      "#f8f7f4"
    muted-fg:        "#a39b90"
    border:          "#2d2b27"
    border-strong:   "#3f3c38"

  # ---
  # TIPOGRAFIA
  # ---
  typography:
    font-sans:  "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    font-mono:  "JetBrains Mono, Fira Code, monospace"
    base-size:  "14px"
    line-height: "1.5"

    # Escala de texto (via classes .ds-*)
    display:
      size:    "clamp(48px, 8vw, 92px)"
      weight:  790
      leading: 0.9
      tracking: "-0.094em"
    h1:
      size:    "clamp(36px, 5vw, 60px)"
      weight:  780
      leading: 0.94
      tracking: "-0.085em"
    h2:
      size:    "25px"
      weight:  780
      leading: 1.05
      tracking: "-0.06em"
    h3:
      size:    "18px"
      weight:  750
      leading: 1.13
      tracking: "-0.045em"
    card-title:
      size:    "17px"
      weight:  750
      tracking: "-0.04em"
    body:
      size:    "15px"
      weight:  400
      leading: 1.58
      tracking: "-0.01em"
    body-large:
      size:    "17px"
      weight:  400
      leading: 1.58
      tracking: "-0.018em"
    label-caps:
      size:    "12px"
      weight:  740
      tracking: "0.08em"
      transform: "uppercase"
    meta:
      size:    "11px"
      weight:  500
      color:   "muted-fg"

  # ---
  # ESPAÇAMENTO & LAYOUT
  # ---
  layout:
    sidebar-collapsed:  "40px"
    sidebar-expanded:   "190px"
    ai-panel-width:     "320px"
    header-height:      "58px"
    max-content-width:  "1240px"
    main-col:           "790px"
    side-col:           "360px"
    module-gap:         "18px"
    page-gap:           "32px"

  # ---
  # BORDAS & RAIOS
  # ---
  radius:
    xs:  "4px"
    sm:  "6px"
    md:  "8px"
    lg:  "12px"
    # Nota: xl, 2xl, 3xl também são 12px — máximo intencional.
    # Nunca ultrapassar 12px. Sem pill (border-radius: 9999px) em elementos de interface principal.
    max: "12px"

  # ---
  # SOMBRAS
  # ---
  shadows:
    # O sistema usa FLAT DESIGN. box-shadow decorativo é proibido.
    # As classes Tailwind .shadow-* são suprimidas globalmente via CSS.
    # Hierarquia é comunicada por cor de borda e fundo, não por sombra.
    rule: "PROIBIDO usar sombras decorativas. Usar border com border-color para hierarquia."
    allowed: "Apenas overlays/modais podem usar shadow semântica de contexto."

---

## Por que este design system

O TravelOS é uma **ferramenta profissional B2B para agências de viagem brasileiras**. A experiência visual deve comunicar precisão, confiança e eficiência — não entretenimento ou emoção.

### Filosofia: "Tool, not App"
- **Fundo quente, não branco frio:** O `#f8f7f4` (warm white) e `#f2f0ea` são propositalmente um branco ligeiramente amarelado, que reduz fadiga visual durante longas sessões de trabalho.
- **Paleta monocromática com acentos funcionais:** O primário `#151515` (quase-preto) garante legibilidade máxima. Cor é reservada para estados semânticos (verde=sucesso, laranja=alerta, vermelho=perigo, azul=info) — nunca decorativa.
- **Flat design por princípio:** Sombras decorativas são explicitamente bloqueadas no CSS global. Hierarquia é comunicada por nível de superfície (background → surface → surface-alt) e cor de borda.
- **Tipografia técnica:** Inter foi escolhida por sua legibilidade em tamanhos pequenos e sua neutralidade profissional. Os pesos extremos (780–790) em headings criam impacto sem depender de cor.

### O que é PROIBIDO (anti-"vibe coded")
1. ❌ Gradiente roxo-para-azul/indigo decorativo (o sinal mais claro de design genérico de IA)
2. ❌ Emoji como ícone de interface (emoji é para tom, não para UI)
3. ❌ Cards com apenas ícone + texto, sem imagem real ou ilustração com intenção
4. ❌ `box-shadow` decorativo — usar bordas e superfícies
5. ❌ Valores de cor, fonte ou espaçamento hardcoded em componentes — referenciar tokens acima
6. ❌ `border-radius` acima de 12px em elementos principais
7. ❌ Efeitos de blur/glow sem função semântica

### Como aplicar em componentes
```css
/* ✅ Correto: referencia token */
background-color: var(--color-surface-alt);
border: 1px solid var(--color-border);
border-radius: var(--radius-md);  /* 8px */

/* ❌ Proibido: valor solto */
background-color: #f0f0f0;
border-radius: 20px;
```

### Como o brand da agência funciona
O `--brand` é um token dinâmico injetado em runtime via JavaScript quando a agência carrega. Ele sobrescreve `--agency-brand`, `--agency-brand-light` e `--agency-brand-fg`. Todos os elementos que usam cor de marca devem referenciar `var(--color-brand)` — nunca hardcode da cor da agência.
