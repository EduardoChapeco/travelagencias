# 00_CURRENT_TRUTH.md — Status Atual do TravelOS

## Status de Estabilização
- **Layout de Sidebar/Dock (Desktop)**: Estabilizado. O sidebar (`AppSidebar`) agora organiza de forma unificada 3 elementos separados verticalmente que não se tocam: o Botão de Ação Primária no topo, o `DockNavigation` (com altura fluida `h-auto` e barra de rolagem interna) no centro, e o Assistente de IA (`AIFloatingWidget inline`) na base.
- **Ações Contextuais**: O `useLayoutStore` centraliza o estado do botão principal. O componente `PageHeader` detecta a ação declarada pela página, normaliza para a interface `PrimaryActionConfig` e atualiza o store global.
- **Header e Island Direita**: Altura de todos os controles (busca, container de filtros, ferramentas e relógio) padronizada em `32px` (`h-8`), garantindo alinhamento vertical perfeito.
- **Ocultação de Ação**: No desktop, a ação principal no cabeçalho superior é ocultada (`md:hidden`) quando o sidebar está ativo para evitar duplicidade. No mobile, ela é mostrada no portal do cabeçalho superior.
- **Duplicação de IA**: O Assistente de IA é montado em modo `inline` no sidebar (desktop) e em modo `fixed` apenas na Home ou no Mobile. No mobile de módulos, ele flutua no canto inferior direito (`bottom-20 right-4`), posicionado acima da barra de navegação inferior horizontal para evitar qualquer colisão.
- **Rota Inexistente**: A rota `/daily-tasks/support` é interceptada e redirecionada de forma transparente para `/support` através da nova rota TanStack Router.
