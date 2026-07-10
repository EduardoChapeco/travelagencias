# 06_LEGACY_AND_DUPLICATION_MAP.md — Mapa de Código Legado e Duplicações

## Elementos Auditados e Consolidados

| Elemento Original | Problema Identificado | Decisão de Consolidação | Status |
| :--- | :--- | :--- | :--- |
| **Acesso ao Chat IA no Dock** | O assistente de IA era acessível como item comum de menu E também como botão flutuante. | Removido do menu de rotas e unificado exclusivamente como botão circular na base da barra lateral (`AIFloatingWidget inline`). | **CONSOLIDADO** |
| **Botão de Nova Tarefa** | Renderizado localmente como uma barra azul horizontal ocupando largura quase total no grid. | Migrado para declaração canônica no `PageHeader`, sendo exibido no topo do sidebar no desktop e no header no mobile. | **CONSOLIDADO** |
| **Alturas Diferentes no Header** | A busca e a toolbar central eram mais altas que a Island direita de data/hora. | Padronizado altura global para todos os componentes do topo em `32px` (`h-8`). | **RESOLVIDO** |
| **Paddings e Margens Duplicadas** | As subvisões aplicavam margens e `pb-24` redundantes, esmagando a área de Kanban. | Eliminado paddings locais e unificado para o contêiner principal do Shell. | **RESOLVIDO** |
