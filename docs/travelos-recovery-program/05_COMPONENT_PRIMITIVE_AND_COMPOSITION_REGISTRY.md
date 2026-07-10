# Registro de Componentes Primitivos e Composições

Atualizado em 2026-07-10 a partir do grafo de imports.

## Primitivas canônicas declaradas

- `src/components/ui/button.tsx`: `Button` e variantes.
- `src/components/ui/input.tsx`: input básico.
- `src/components/ui/select.tsx`: select Radix.
- `src/components/ui/textarea.tsx`: textarea básico.
- `src/components/ui/card.tsx`: card e subcomponentes.
- `src/components/ui/dialog.tsx`: dialog Radix.
- `src/components/ui/sheet.tsx`: sheet Radix e `SheetPage` legado.
- `src/components/ui/table.tsx` e `data-table.tsx`: tabela e composição paginada.

## Composições de shell

- `src/components/shell/PageHeader.tsx`: `PageHeader`, `ModuleActionButton` e `EmptyState`.
- `src/components/shell/HeaderPortal.tsx`: transporte dos controles para o slot do AppShell.
- `src/components/shell/DockNavigation.tsx`: navegação compartilhada.

## Fontes paralelas conhecidas

`src/components/ui/form.tsx` ainda redefine inputs, select, textarea, botões e sheet.
Ele é legado em migração e não deve receber novas responsabilidades.

`ModuleToolbar.tsx` não existe. O contrato vigente de toolbar está embutido no
`PageHeader` e será separado em lote posterior.
