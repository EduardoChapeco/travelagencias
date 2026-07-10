# 09_EXECUTION_LOG.md
# Diário de Execução de Engenharia

## LOTE 1 e LOTE 2 (Executado)
- **DESIGN.md / Tokens**: Removida a dependência circular (DESIGN.md dependia de var(--surface) de styles.css, criando alias). A fonte canônica real passa a ser o próprio DESIGN.md, gerando os valores estáticos no `design.css`.
- **DockNavigation**: Unificada a navegação (FloatingDock, AppSidebar, SlimSidebar, DynamicIslandNav). Agora, `DockNavigation.tsx` é a única fonte canônica para o dock pill minimalista.
- **Responsividade do Dock**: Alterada a lógica para que o DockNavigation atue como Bottom Bar no Mobile (Horizontal) estruturalmente no `AppShell` (flex-col-reverse), e como Vertical Bar (Desktop) grudada.
- **Redundâncias Deletadas**: Removidos `SlimSidebar.tsx` e `DynamicIslandNav.tsx`. Tipos transportados para a única fonte.
## LOTE 3 (Executado)
- **Consolidação de Cabeçalho (Header/Toolbar)**: Havia múltiplas formas de renderizar ações de cabeçalho: `PageHeader`, `ModuleToolbar` e um `HeaderPortal` que jogava o componente no `AppShell` usando Zustand (`useHeaderStore`).
- **Eliminação de Stores de UI**: Excluído o `header-store.ts` e removida a dependência do `AppShell` sobre o toolbar, reduzindo re-renders complexos.
- **Fusão de Contratos**: As funcionalidades de busca, filtros avançados (pills) e botões de ação do `ModuleToolbar` foram fundidas dentro do `PageHeader.tsx`. O `ModuleActionButton` foi movido para dentro do `PageHeader.tsx`.
- **Migração em Massa**: Um script atualizou automaticamente >31 consumidores em `src/routes/` para usar estritamente `<PageHeader>` ao invés de `<ModuleToolbar>` e limpou imports redundantes/duplicados.
## LOTE 4 (Executado)
- **Consolidação de Primitives Visuais (UI)**: Auditado e unificado o sistema de primitives (`src/components/ui/`) para aderir estritamente ao "Glass Ambient System" (baseado em `--os-glass-*`).
- **Cards e Tables**: `card.tsx` e `data-table.tsx` deixaram de usar `bg-surface` ou opacidades arbitrárias, assumindo `glass-card` com blur e borda translúcida.
- **Form Elements**: O `button.tsx` teve as classes customizadas confusas (`intent`, `shape`, `density`) removidas de `cva`, preservando o padrão Shadcn porém integrando formas de pílula (`--radius-button = --radius-full`) e variant `glass`. O `textarea.tsx` corrigido de `rounded-2xl` para uso semântico `var(--radius-card)`.
- **Modais e Popups**: Removido resquício despadronizado de `mac-glass-modal` em `dropdown-menu.tsx`, `popover.tsx`, `dialog.tsx` e `sheet.tsx`. Todos migraram para tailwind primitives baseadas no tema dark glass (`glass bg-black/40 backdrop-blur-2xl text-white`).
- Tudo alinhado sem criação de abstrações aninhadas ou sobrepostas (Zero cards dentro de cards ou sombras opacas falsas).

## LOTE 5 (Executado)
- **Consolidação de Layouts (Main Workspace)**: Revisão dos componentes de estruturação (grids, tabs, inputs e cards de estatísticas).
- **KPI Cards (`kpi-card.tsx`)**: As classes estáticas de backgrounds sólidos (`bg-surface`, `bg-success-bg`, etc) foram mapeadas para `glass-card text-white border-none` para neutros e `glass text-[color]-400 bg-[color]-500/10` para estados semânticos (success, danger, info, warning).
- **Tabs (`tabs.tsx`)**: Refatorado `TabsList` para `glass bg-white/5` (pílula flutuante) e `TabsTrigger` para `data-[state=active]:bg-white/15` ao invés de opacidades nativas opacas, integrando perfeitamente ao Ambient OS.
- **Searchable Select (`searchable-select.tsx`)**: O dropdown popup e as opções foram portados de `bg-surface` para `glass text-white bg-black/40 backdrop-blur-2xl`, e a pílula do select atualizada para transparent matching.

## LOTE 6 (Executado)
- **Varredura Profunda de Rotas (`src/routes/*`)**: Substituição automatizada e rigorosa em dezenas de páginas eliminando backgrounds legados e duplicados que conflitam com o Design System.
  - `bg-surface` mapeado estritamente para `glass-card border-none`.
  - `bg-surface-alt` mapeado estritamente para `glass bg-white/5 border-white/10`.
  - Radii de bordas hardcoded (`rounded-2xl`, `rounded-xl`) substituídos pela token semântica unificada `rounded-[var(--radius-card)]`.
  - Sombras nativas hardcoded (`shadow-sm`, `shadow-md`, `shadow-lg`) eliminadas (`shadow-none`) em favor da leveza intrínseca do Ambient OS (Glass não tem sombra chapada sólida).
- **Limpeza de Lixo Arquitetural (Orphan Files)**: Exclusão do `DynamicIsland.tsx` que estava não-utilizado, mas poluía a pasta de Shell, causando confusão na navegação base (agora única com `DockNavigation.tsx`).
- **Remoção de Legados Fantasmas (`mac-glass-*`)**: Excluídos últimos resquícios como `mac-glass-heavy` no AppShell e demais rotas para o token translúcido único do projeto.

## Lotes A, B, C, D, E (Executados nesta Sessão)
- **Extensão do useLayoutStore**: Adicionado o estado `primaryAction` (com tipo `PrimaryActionConfig`) ao Zustand store de layout.
- **Ajuste de Sidebar/Dock (AppSidebar & DockNavigation)**: Redesenhado o sidebar vertical no desktop para organizar 3 seções independentes e não-sobrepostas: Botão de Ação Primária no topo, `DockNavigation` (com `md:h-auto` de altura fluida e `max-h` com rolagem vertical) no centro, e Assistente de IA (`AIFloatingWidget inline`) na base.
- **Unificação de Ações Contextuais**: Refatorado `PageHeader.tsx` para normalizar automaticamente a prop `primaryAction` (JSX ou objeto) e registrá-la no `useLayoutStore` global.
- **Hiding no Top Bar**: No desktop, a ação primária do `PageHeader` é ocultada do portal do topo (`md:hidden`) já que está no sidebar, mas mantida no mobile.
- **Evitado Duplicação do Assistente de IA**: O `AIFloatingWidget` é renderizado `inline` no sidebar (desktop) e `fixed` na Home ou no Mobile. No mobile de módulos, ele flutua no canto inferior direito (`bottom-20 right-4`), acima do dock para não colidir.
- **Alturas Padronizadas**: Altura de todos os componentes superiores (busca, filtros e island direita) padronizada em `32px` (`h-8`).
- **Interceptador de Rota de Suporte**: Criada a rota `src/routes/agency.$slug.daily-tasks.support.tsx` para interceptar acessos a `/daily-tasks/support` e redirecionar para `/support` com TanStack Router.
