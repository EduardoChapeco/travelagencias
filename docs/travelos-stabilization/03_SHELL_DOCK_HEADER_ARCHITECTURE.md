# 03_SHELL_DOCK_HEADER_ARCHITECTURE.md — Arquitetura de Shell, Dock e Header

## Componente AppShell
O `AppShell` é a autoridade central de layout. Ele renderiza:
- O wallpaper e camadas de Glassmorphism com blur controlado por variáveis globais.
- A barra de status superior (`header` de `44px`) contendo a marca, a Island Direita e o portal do menu.
- A estrutura de grade do workspace (`col-start-4` no desktop), que isola o conteúdo e impede conflito visual com o sidebar.

## AppSidebar (3 Seções Verticais Separadas)
O desktop sidebar agrupa três blocos em um layout de flexbox vertical completo (`flex flex-col justify-between items-center h-full`):
1. **Action Trigger (Circular, 56px)**: Botão flutuante que executa a ação primária correspondente ao módulo atual. Não toca no Dock.
2. **Dock Central (h-auto)**: Contém os atalhos de navegação. A altura se ajusta dinamicamente baseada nos itens, com `overflow-y-auto no-scrollbar` para evitar cortes em janelas de baixa resolução.
3. **Genie Trigger (IA Floating Circle, 56px)**: Trigger da inteligência artificial configurada no modo `inline`. Não toca no Dock.

## Normalização de Ação no Header
- No desktop, o cabeçalho não renderiza a ação primária (`md:hidden`), pois o sidebar já a assume de forma proeminente.
- No mobile, a ação é mostrada diretamente na barra de topo.
