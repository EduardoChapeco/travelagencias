# 40 Matriz de Conformidade do Design System

Esta matriz verifica se os componentes fundamentais e utilitários da plataforma seguem estritamente os tokens de design do sistema Ambient Glass definidos no `src/styles.css` e no `DESIGN.md`.

## Mapeamento de Conformidade por Primitiva

| Componente | Uso de Cor Canônico | Uso de Border Radius | Uso de Shadow (Nulo) | Uso de Glassmorphism | Estado de Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Button (`button.tsx`)** | `var(--color-primary)` | `var(--radius-button)` | `shadow-none` (nulo) | Não se aplica | 🟢 EM CONFORMIDADE |
| **Badge (`badge.tsx`)** | `var(--color-success)` etc. | `var(--radius-badge)` | `shadow-none` (nulo) | Não se aplica | 🟢 EM CONFORMIDADE |
| **Dialog (`dialog.tsx`)** | `var(--color-foreground)` | `var(--radius-card)` | `shadow-none` (nulo) | `.mac-glass-modal` | 🟢 EM CONFORMIDADE |
| **AlertDialog (`alert-dialog.tsx`)** | `var(--color-foreground)` | `var(--radius-card)` | `shadow-none` (nulo) | `.mac-glass-modal` | 🟢 EM CONFORMIDADE |
| **Sheet (`sheet.tsx`)** | `var(--color-foreground)` | `var(--radius-sheet)` | `shadow-none` (nulo) | `.mac-glass-modal` | 🟢 EM CONFORMIDADE |
| **Popover (`popover.tsx`)** | `var(--color-foreground)` | `rounded-[20px]` (hardcode) | `shadow-none` (nulo) | `.mac-glass-modal` | 🟡 PARCIAL (Hardcode radius) |
| **Select (`select.tsx`)** | `var(--color-foreground)` | `rounded-[20px]` (hardcode) | `shadow-none` (nulo) | `.mac-glass-modal` | 🟡 PARCIAL (Hardcode radius) |
| **Inputs (`form.tsx`)** | `var(--color-border)` | `var(--radius-input)` | `shadow-none` (nulo) | Transparent/Sólido | 🟢 EM CONFORMIDADE |

---

## Verificação do Pipeline do Design System (DESIGN.md)

1. **DESIGN.md Normativo:** O arquivo `DESIGN.md` é a especificação formal e deve ser o único local de alteração de marcas e dimensões.
2. **Processamento Automático:** O CLI `@google/design.md` processa e valida a consistência sintática do `DESIGN.md`.
3. **Exportação de CSS:** O comando `npm run design:export` compila as variáveis do `DESIGN.md` para o `src/design.css`.
4. **Resolução de Cascata:** O arquivo `src/styles.css` importa o `@import "./design.css"` na linha 13, garantindo que todas as variáveis `:root` e tokens estejam acessíveis na árvore de renderização.

**Observação de Não Conformidade:** O Popover e o Select nativos ainda usam arredondamentos inline `rounded-[20px]` que contornam os tokens do sistema. Esses valores serão migrados para `rounded-[var(--radius-card)]` no Lote A.
