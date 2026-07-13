# 00 — CURRENT TRUTH (Estado Arquitetural Real do TravelOS)

> Data de auditoria: 2026-07-12  
> Commit base: `e4cb81d` (Lote 4 estabilizado)  
> Auditor: Antigravity — Revisão Arquitetural Global v2

---

## RESUMO HONESTO

O TravelOS possui uma fundação de Design System **parcialmente implementada** — tokens existem em `design.css` e `styles.css`, o shell global `AppShell` existe e funciona — mas sofre de **proliferação massiva de estilização local em rotas**, com 7 famílias de problemas arquiteturais confirmados por evidência de código.

---

## EVIDÊNCIAS QUANTITATIVAS (Auditoria de 84 rotas de agência)

| Métrica | Valor | Significado |
|---------|-------|-------------|
| Total de rotas agency.*.tsx | **84** | — |
| Rotas com `overflow-y-auto` próprio | **60 (71%)** | Cada rota cria seu próprio contexto de scroll |
| Rotas com padding local `p-4/5/6` | **62 (74%)** | Duplicam padding que o shell deveria controlar |
| Rotas usando `--shell-page-padding` | **0 (0%)** | Token canônico é declarado mas nunca consumido |
| Rotas usando tokens tipográficos `ds-*` | **1 (1%)** | Sistema tipográfico quase completamente ignorado |
| Rotas com `bg-white` hardcodado | **~12** | Fundos opacos quebram o glassmorphism |
| Rotas com `rounded-2xl/3xl` | **~8** | Ignoram `--radius-card: var(--radius-2xl)` |

---

## MAPA DE SHELLS EXISTENTES

```
AppShell (AppShell.tsx) ← CANÔNICO
├── isBuilder → div simples sem sidebar (correto para builders)
├── isPastDue → tela de cobrança
├── isHome → FloatingDock + wallpaper (correto)
└── isModule → grid 5 colunas
    ├── AppSidebar (col-2) — pill vertical com ações + nav + AI inline
    └── main.os-workspace (col-4) → <Outlet /> ← TODAS as rotas entram aqui
         └── A partir daqui: CADA ROTA FAZE SEU PRÓPRIO LAYOUT

AdminShell (AdminShell.tsx) — shell separado para área /admin
ClientShell (ClientShell.tsx) — shell separado para área /client
```

**Problema Central**: O `<main.os-workspace>` é `overflow-hidden flex flex-col`. Qualquer rota que quiser scroll DEVE ser `flex-1 overflow-y-auto`. Mas o problema é que:
1. Não existe composition canônica para isso — cada rota recria o padrão manualmente
2. O padding de página é redefinido em cada rota individualmente (p-4 md:p-6)
3. O token `--shell-page-padding` existe mas nunca é usado

---

## FAMÍLIAS DE PÁGINAS E STATUS

| Família | Exemplo | Shell Pattern | Status |
|---------|---------|---------------|--------|
| Lista simples | crm.tsx, clients.tsx | `PageHeader + flex-1 overflow-y-auto + lista` | PARCIAL — padding duplicado |
| Kanban | crm.tsx (kanban), boarding.tsx | `PageHeader + flex-1 overflow-hidden + colunas` | PARCIAL — ok estruturalmente |
| **Detalhe com tabs locais** | trips.$id.tsx | Recria mini-shell próprio (Header + Tabs + Outlet) | **ESTRUTURA INCORRETA** |
| Split 2 colunas | inbox.tsx | Esquerda/Direita com scroll independente | PARCIAL — 6 scroll contexts |
| Builder | portal.pages.$page_id.tsx | `isBuilder` flag no AppShell | CONFORME (mas bg-white no body) |
| Settings | settings.tsx | PageHeader + seções com scroll | PARCIAL |
| Financeiro | financial.*.tsx | PageHeader + tabela + scroll | PARCIAL — bg-white/gray residual |
| Portal público | p.*.tsx | Sem AppShell — layout próprio | HARDCODADO — bg-white sistemático |
| Admin | admin.*.tsx | AdminShell | PARCIAL — padrões próprios |
| Cliente | client.*.tsx | ClientShell | PARCIAL |

---

## PRIMITIVES: ESTADO DE DUPLICAÇÃO

| Primitivo | Canônico | Duplicatas/Aliases | Status |
|-----------|----------|--------------------|--------|
| Button | `Button` (CVA em button.tsx) | `PrimaryButton`, `GhostButton` (aliases) | CANÔNICO + aliases aceitáveis |
| Input | `Input` (base) | `FormInput` (wrapper estilizado) | 2 implementações — sem critério claro |
| Select | `Select` (Radix) | `NativeSelect` (HTML), `SearchableSelect` (combobox) | 3 SEM CRITÉRIO de uso |
| Modal | `Dialog` (Radix) | `SheetPage`, `div.fixed` inline em ~15 rotas | **DUPLICADO — div.fixed é LEGADO** |
| EmptyState | `EmptyState` em PageHeader.tsx | Inline JSX ad-hoc em rotas | DUPLICADO |
| Table | `data-table.tsx` | HTML `<table>` manual em ~20 rotas | DUPLICADO — manual sem sorting/paginação |
| Header de módulo | `PageHeader` (com portal) | Headers locais em trips.$id, inbox, boarding | **DUPLICADO — local é ESTRUTURA INCORRETA** |
| Badge | `StatusBadge` | `<span>` inline com classes em rotas | DUPLICADO |

---

## TOKENS: O QUE EXISTE vs O QUE É USADO

| Token | Onde Declarado | Usado nas Rotas? | Problema |
|-------|---------------|------------------|---------|
| `--shell-page-padding: 24px` | styles.css | NÃO | Token existe, zero consumidores |
| `--ds-toolbar-height: 56px` | styles.css | NÃO | Token existe, zero consumidores reais |
| `--radius-card` | styles.css | SIM (via `rounded-[var(--radius-card)]`) | PARCIAL — muitas rotas ainda usam `rounded-2xl/3xl` literal |
| `--shell-edge-gap: 12px` | styles.css | SIM no AppShell | CORRETO |
| `--shell-header-height: 44px` | styles.css | SIM no AppShell | CORRETO |
| `ds-h1/h2/h3/body/meta` | styles.css | 1 rota de 84 | **COMPLETAMENTE IGNORADO** |
| `--color-success/warning/danger` | design.css | Consumido via `.os-workspace` overrides | PARCIAL |

---

## TOP 10 ARQUIVOS COM MAIS PROBLEMAS

1. `group-tours.$id.lazy.tsx` — 14x bg-white, shell local, 4x overflow-y-auto
2. `portal.pages.$page_id.tsx` — 14x bg-white, bg-gray, 5x overflow, h-screen
3. `p.$agency_slug.tour.$id.tsx` — 14x bg-white, 4x h-screen (página pública)
4. `suppliers.$id.tsx` — 11x bg-white, shell com glassmorphism inconsistente
5. `trips.$id.tsx` — Shell local com Header+Tabs próprios, Supabase direto no layout
6. `inbox.tsx` — 6 contextos overflow-y-auto aninhados, split sem composition
7. `quotes.index.tsx` — 4 side panels inline sem composition canônica
8. `m.contract.$token.tsx` — 4x bg-white, 2x h-screen (página pública)
9. `knowledge.tsx` — 4 overflow-y-auto, padding `pb-24` para dock sem token
10. `financial.reconciliation.tsx` — bg-gray residual (parcialmente corrigido)

---

## PROBLEMAS FUNCIONAIS ARQUITETURAIS

1. **Supabase direto no layout component**: `trips.$id.tsx` chama `supabase.functions.invoke()` dentro do componente de layout TripLayout — violação de camadas.
2. **Status enums hardcodados em rotas**: STATUS_MAP, STATUS_LABEL, ALL_STATUSES definidos inline em `trips.$id.tsx`.
3. **Token de offset mobile inexistente**: `pb-24` aparece em 15+ rotas para compensar o dock mobile — deveria ser `--dock-mobile-offset: 96px` com classe `.page-content-mobile-offset`.
4. **`rounded-3xl` ignorando token**: `--radius-card: var(--radius-2xl)` definido mas rotas continuam usando `rounded-3xl` literal.
5. **Select sem protocolo de uso**: Nenhuma decisão arquitetural documentada sobre quando usar `NativeSelect` vs Radix `Select` vs `SearchableSelect`.
