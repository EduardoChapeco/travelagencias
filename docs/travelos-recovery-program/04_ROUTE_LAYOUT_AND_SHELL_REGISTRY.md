# Registro de Rotas, Layouts e Shells

Atualizado em 2026-07-10 a partir do código existente.

## Shells estruturais

| Superfície | Fonte | Responsabilidade | Consumidor raiz |
|---|---|---|---|
| Agência | `src/components/shell/AppShell.tsx` | Wallpaper, status bar, workspace, navegação e região de header | `src/routes/agency.$slug.tsx` |
| Admin global | `src/components/shell/AdminShell.tsx` | Navegação e outlet administrativo | `src/routes/admin.tsx` |
| Cliente | `src/components/shell/ClientShell.tsx` | Autenticação client-side, navegação e outlet do cliente | `src/routes/client.tsx` |

## Navegação canônica

- `src/components/shell/DockNavigation.tsx`: dock compartilhado pelos três shells.
- `src/components/shell/AppSidebar.tsx`: composição de contexto da agência sobre o dock.
- `src/lib/navigation.config.ts`: registry dos módulos e submódulos da agência.

`DynamicIslandNav.tsx` não existe no código atual e não faz parte da arquitetura vigente.

## Contrato de rotas da agência

Toda rota operacional privada deve estar abaixo de `/agency/$slug`. Rotas como
`/agency/quotes`, `/agency/proposals` e `/agency/trips`, sem tenant, são proibidas.
O gate correspondente está em `tests/e2e/tenant-isolation.spec.ts`.
