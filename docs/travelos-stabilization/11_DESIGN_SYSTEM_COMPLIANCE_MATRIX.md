# Design System Compliance Matrix — Lote 2

## Legenda de Status
- **CONFORME**: Usa apenas tokens e primitives canônicos
- **PARCIAL**: Em transição ou com exceções documentadas
- **HARDCODADO**: Cores/dimensões diretamente no componente
- **DUPLICADO**: Múltiplas implementações conflitantes
- **LEGADO**: Implementação antiga que aguarda migração
- **NÃO AUDITADO**: Ainda não inspecionado

---

## 1. Shells & Layout

| Componente | Arquivo | Status | Evidência |
|:---|:---|:---|:---|
| `AppShell` | `src/components/shell/AppShell.tsx` | PARCIAL | Header migrado para `text-os`/`text-os-muted`. Bloqueio "past_due" mantém `text-white` como constante técnica de emergência. |
| `PageHeader` | `src/components/shell/PageHeader.tsx` | CONFORME | Migrado para `text-foreground`, `bg-surface-alt/50`, `border-border/50`, `text-muted-foreground`. |
| `HeaderPortal` | `src/components/shell/HeaderPortal.tsx` | CONFORME | Thin wrapper de portal — sem estilos próprios. |
| `DockNavigation` | `src/components/shell/DockNavigation.tsx` | NÃO AUDITADO | — |
| `AppSidebar` | `src/components/shell/AppSidebar.tsx` | NÃO AUDITADO | — |
| `TaskShell` | `src/components/tasks/TaskShell.tsx` | PARCIAL | Button de admin migrado para `Button` canônico. Botão sem `onClick` pré-existente — não é regressão. |

---

## 2. Primitives & Compositions

| Componente | Arquivo | Status | Evidência |
|:---|:---|:---|:---|
| `Button` | `src/components/ui/button.tsx` | CONFORME | `rounded-[var(--radius-button)]` = `rounded-full`. Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `glass`. |
| `ModuleActionButton` | `src/components/shell/PageHeader.tsx` | CONFORME (wrapper thin) | Migrado de `<button>` manual com `rounded-full bg-primary` para `<Button size="sm">` canônico. 22 consumers herdam automaticamente. |
| `EmptyState` | `src/components/shell/PageHeader.tsx` | CONFORME | Usa tokens semânticos: `border-border/60`, `bg-surface-alt/20`, `text-muted-foreground`. |
| `Input` (form) | `src/components/ui/input.tsx` | NÃO AUDITADO | — |
| `Select` (form) | `src/components/ui/form.tsx` | NÃO AUDITADO | — |

---

## 3. Tokens OS Ambient (Novos — Lote 2)

| Token CSS | Valor | Classe Tailwind | Fonte |
|:---|:---|:---|:---|
| `--os-text` | `rgba(255,255,255,0.95)` | `.text-os` | `:root` em `styles.css` |
| `--os-text-muted` | `rgba(255,255,255,0.55)` | `.text-os-muted` | `:root` em `styles.css` |
| `--os-text-faint` | `rgba(255,255,255,0.30)` | `.text-os-faint` | `:root` em `styles.css` |

**Regra de uso:** Exclusivamente em elementos sobre o wallpaper fora do `.os-workspace` (AppShell header, DockNavigation bar).

---

## 4. Rotas Auditadas — Conformidade

| Rota | Shell | Ação Principal | Actions Secundárias | Status |
|:---|:---|:---|:---|:---|
| `agency.$slug.clients` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | Botão Settings → `Button ghost/icon` ✓ | CONFORME |
| `agency.$slug.trips.index` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | Botões Infotravel + Settings → `Button ghost` ✓ | CONFORME |
| `agency.$slug.crm` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | `<select>` manuais com `text-white/70` | PARCIAL |
| `agency.$slug.proposals.index` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | `<select>` + botão Settings com `text-white/60` | PARCIAL |
| `agency.$slug.quotes.index` | `AppShell > os-workspace` | `ModuleActionButton → Button (2x)` ✓ | `<button>` com `text-white/60` | PARCIAL |
| `agency.$slug.calendar` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | NÃO AUDITADO | PARCIAL |
| `agency.$slug.boarding` | `AppShell > os-workspace` | `ModuleActionButton → Button` ✓ | NÃO AUDITADO | PARCIAL |
| `agency.$slug.financial.cash` | `AppShell > os-workspace` | `ModuleActionButton → Button (2x)` ✓ | NÃO AUDITADO | PARCIAL |
| Demais 16 rotas modificadas | — | `ModuleActionButton → Button` ✓ (automático) | NÃO AUDITADO | NÃO AUDITADO |

---

## 5. Duplicações Resolvidas no Lote 2

| Componente | Antes | Depois |
|:---|:---|:---|
| `ModuleActionButton` | `<button>` manual com 10 classes hardcoded | `<Button size="sm">` canônico |
| AppShell header `text-white` | 5 instâncias de cor fixa | `text-os`, `text-os-muted` via token |
| TaskShell admin button | `<button>` manual com `text-white/70` | `<Button variant="ghost" size="icon">` |
| Trips toolbar buttons | 2× `<button>` com `border-white/15 text-white/60` | `<Button variant="ghost">` |
| Clients toolbar button | `<button>` com `border-white/15 text-white/60` | `<Button variant="ghost" size="icon">` |
| Imports duplicados `EmptyState` | 2 imports da mesma fonte em clients e trips | 1 import consolidado |

---

## 6. Pendências para Lote 3

1. `<select>` manuais em CRM e Proposals — migrar para `Select` canônico do Radix
2. Padrão `bg-red-50 border-red-200 text-red-800` (~50 instâncias) — migrar para tokens `--color-danger-bg` / `--color-danger`
3. Auditoria de `DockNavigation` e `AppSidebar` para `text-white` residuais
4. Botão de admin no TaskShell sem handler — verificar se deve ser removido ou conectado ao `ModuleAdminPanel`
5. Rotas não auditadas (16 restantes das 24 modificadas recentemente)
