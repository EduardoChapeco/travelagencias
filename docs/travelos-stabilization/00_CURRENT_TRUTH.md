# 00_CURRENT_TRUTH.md

**Status do TravelOS Dock & Header**

**O QUE FUNCIONA:**
- DockNavigation agrupa os ícones num glass pill quando está na Home (isHome=true).
- O Workspace aplica transparência total (ambient effect) adequadamente sobre o wallpaper via AppShell.
- PageHeader implementa botões, busca e filtros.

**O QUE ESTÁ QUEBRADO (Problemas de Arquitetura):**
- **Dock Lateral:** Ao invés de usar a semântica "pill flutuante" (afastamento do edge-gap), o DockNavigation (quando isHome=false) gruda na tela ocupando exatamente md:w-[72px] e border-r, agindo como uma sidebar larga legada disfarçada.
- **Header:** O header é renderizado de forma descentralizada por componentes locais. As páginas invocam PageHeader misturado com ModuleActionButton, posicionando actions massivas no grid em vez de estarem no Island Head.
- **Geometria:** AppShell gerencia colunas com um Flexbox misto, dependendo de empurrar componentes, no lugar de um CSS Grid fixo que ceda um gutter específico.
- **Duplicações:** O contexto/navbar está replicado sem padronização nas views.
