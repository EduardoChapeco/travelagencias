# Registro de Ações e Handlers

Atualizado em 2026-07-10.

## Ação primária de módulo

1. A rota fornece `primaryAction` para `PageHeader`.
2. `PageHeader` normaliza o ReactNode para `PrimaryActionConfig`.
3. `useLayoutStore.setPrimaryAction` registra a ação durante o ciclo de vida da rota.
4. `AppSidebar` consome o estado e renderiza a ação no dock.
5. Em telas sem sidebar, `PageHeader` mantém a ação no fluxo da toolbar.

## Fonte atual

- Contrato: `src/hooks/use-layout-store.ts`.
- Normalização e lifecycle: `src/components/shell/PageHeader.tsx`.
- Render desktop: `src/components/shell/AppSidebar.tsx`.

`ModuleToolbar.tsx` não existe e não deve ser referenciado por novos fluxos.
