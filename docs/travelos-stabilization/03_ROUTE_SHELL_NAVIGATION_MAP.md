# 03_ROUTE_SHELL_NAVIGATION_MAP.md
# Mapa de Rotas e Navegação (Navigation Map)

## 1. Registro de Navegação
O menu de contexto do sidebar é construído a partir de `buildContext` em `src/lib/navigation.config`.
O estado do menu contextual é transmitido via `useSidebarStore` e consumido pelo `AppShell` para gerenciar a geometria de visualização.
