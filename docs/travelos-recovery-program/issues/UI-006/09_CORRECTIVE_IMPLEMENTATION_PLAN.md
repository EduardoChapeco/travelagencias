# UI-006 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-006

Este documento planeja os passos para restabelecer a harmonia visual glass no módulo Inbox.

---

## 1. Escopo de Mudanças

* **Componente:** [agency.$slug.inbox.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.inbox.tsx)
* **Alteração Técnica:**
  * Substituir todos os fundos opacos por classes semânticas do glassmorphic do workspace (como `.glass` ou `bg-surface-alt/10`).
  * Certificar que as cores de texto utilizem classes de contraste específicas (`text-white/80`, `text-white/50`) ao invés de depender de heranças vagas do `.os-workspace`.
  * Ajustar a renderização responsiva da sidebar lateral no desktop, alinhando com a correção geral planejada no issue `UI-002`.
