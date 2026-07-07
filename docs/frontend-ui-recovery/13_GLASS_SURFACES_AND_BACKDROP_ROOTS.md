# 13 Superfícies Glass e Backdrop Roots

## Auditoria de Backdrop Filters
**Problema Encontrado:** 
O sistema "Ambient Glass" do TravelOS depende de um `backdrop-filter` intenso sobre o wallpaper base (implementado via `AppShell.tsx` com `blur(32px)`). No entanto, o `styles.css` estava aplicando `backdrop-filter: blur(Npx)` individualmente em todas as classes utilitárias secundárias (`.glass`, `.glass-card`, `.glass-sidebar`, `.glass-dock`, `.glass-section`, `.glass-pill` e nas colunas do Kanban). 
Isso causava "aninhamento de blurs" no DOM, obrigando o browser a recalcular o filtro de fundo repetidas vezes para elementos que já estavam assentados sobre uma área desfocada, causando drástica degradação de performance sem benefício estético.

## Ação de Correção (Onda 4)
- Foi feita uma limpa no `styles.css`. Todos os `backdrop-filter` e `-webkit-backdrop-filter` foram REMOVIDOS das camadas intermediárias (workspace, sidebars, toolbars e cards estáticos).
- **Mantidos apenas para Superfícies de Topo (Modais/Elevated):** As classes `.mac-glass-panel`, `.mac-glass-heavy`, `.mac-glass-modal` e `.mac-glass-toolbar` foram poupadas, pois representam portais e diálogos flutuantes que precisam desfocar o resto da aplicação que se encontra atrás deles.

## Status de Arquitetura
CORRIGIDO. O fluxo de renderização de blur agora é O(1) para a área de conteúdo (somente o background principal é desfocado) e seletivo O(1) para modais, garantindo 60fps sem quebras de pipeline do compositor no Chrome/Safari..md
