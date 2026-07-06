# 08. Auditoria de Design System e Responsividade

Este documento apresenta a auditoria estética do design plano **Light Editorial SaaS** do Turis, verificando a conformidade com as restrições de sombras, o comportamento do Brand Kit e a responsividade em múltiplos viewports.

---

## 1. Presença de Sombras e Desvios Estéticos (Varredura Técnica)

A regra de design do Turis exige o uso estrito de um layout editorial limpo, plano (flat), com cores harmônicas, tipografia serifada/moderna de alto contraste e **ausência completa de sombras utilitárias**.

- **Fase 1 - Higienização:** Realizou a remoção sistemática de classes `shadow-sm`, `shadow-md`, `shadow-lg` e `shadow-xl` em componentes importantes.
- **Gargalos Remanescentes (Desvios):**
  - Fizemos uma varredura por classes de sombra no código atual. Embora a maioria das classes utilitárias estáticas tenha sido limpa, modais flutuantes (`DialogContent`), modais de autocomplete e dropdowns ainda renderizam sombras por herança padrão do Radix UI (`shadow-md`, `shadow-lg`).
  - Em `financial.reconciliation.tsx` e `boarding.tsx`, modais de inserção manual de lançamentos ou bilhetes ainda usam sombras para destaque visual sobre o canvas de fundo.
  - **Correção Recomendada:** Adicionar uma regra de override global no arquivo [styles.css](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) forçando `box-shadow: none !important;` em todos os overlays, utilizando bordas finas de alto contraste (`border border-border`) como substituto para profundidade.

---

## 2. Brand Kit e Propagação Visual (Flicker & Render)

- **Flicker de Identidade Visual:**
  - O hook `useAgency` foi otimizado com cache síncrono no `localStorage`. Ao inicializar a rota, o React injeta as cores (`--color-brand-primary`, etc.) armazenadas em sessões anteriores imediatamente, reduzindo significativamente o piscar visual antes que as chamadas HTTP assíncronas do Supabase retornem as novas configurações.
- **Injeção Dinâmica de Fontes (Google Fonts):**
  - O sistema injeta fontes customizadas de forma assíncrona gerando tags `<link>` no HEAD.
  - **Gargalo no Export ( html2canvas):** Embora tenhamos adicionado `await document.fonts.ready` antes da renderização de PDFs e histórias A4, se a conexão estiver em status instável ou lenta, a promessa pode aguardar tempo demais, ou o browser pode falhar em fazer o download da fonte externa a tempo do screenshot, gerando PDFs com fontes padrões do sistema operacional (Arial ou Times New Roman).
  - **Correção Recomendada:** Pré-carregar fontes comuns de marca diretamente no cabeçalho estático do `index.html` (ex: Outfit, Cormorant, Inter) de modo que estejam sempre prontas no cache de renderização tipográfica local do browser.

---

## 3. Responsividade em Dispositivos Móveis

- **App Shell e Sidebar:** A implementação da `SlimSidebar` e a limpeza de squeezes nas rotas administrativas garante que o admin e o CRM sejam operacionais em telas de tablets e notebooks compactos de 13 polegadas.
- **Portal do Cliente e Check-in Móvel:** As rotas `/client/trips/$id` e `/m/checkin/$token` utilizam grids responsivos de coluna única para mobile e cartões compactos de toque fácil, respeitando perfeitamente o viewport de celulares e mantendo legibilidade sem cortes horizontais.
