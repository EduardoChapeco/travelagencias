# UI-009 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-009

Este documento detalha o plano de correção para restabelecer a legibilidade e transparência da tabela de viagens.

---

## 1. Escopo de Mudanças

* **Componentes:** [design.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/design.css) e [data-table.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/ui/data-table.tsx)
* **Alteração Técnica:**
  * Alterar as variáveis do `@theme` em `design.css` para apontarem para as variáveis CSS dinâmicas da raiz:
    ```css
    --color-surface: var(--surface);
    --color-surface-alt: var(--surface-alt);
    ```
  * Definir `--surface: #ffffff` e `--surface-alt: rgba(255, 255, 255, 0.7)` no `:root` padrão em `styles.css`, permitindo que redefinições no escopo do `.os-workspace` alterem as propriedades em tempo de execução.
  * Injetar classes explícitas de visibilidade de ícones (`text-white` ou `text-foreground`) nas setas de paginação da `DataTable`.
