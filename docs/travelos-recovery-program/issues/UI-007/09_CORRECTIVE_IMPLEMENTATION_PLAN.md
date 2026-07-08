# UI-007 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-007

Este documento planeja os passos para restabelecer os arredondamentos corretos no Kanban.

---

## 1. Escopo de Mudanças

* **Componente:** [Column.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/boarding/Column.tsx)
* **Alteração Técnica:**
  * Substituir a classe `rounded-full` na div da linha 22 por `rounded-3xl` ou `rounded-[var(--radius-card)]` (28px).
  * Substituir a classe `rounded-full` na div do placeholder de estado vazio na linha 49 por `rounded-2xl` para manter consistência interna com os cards.
