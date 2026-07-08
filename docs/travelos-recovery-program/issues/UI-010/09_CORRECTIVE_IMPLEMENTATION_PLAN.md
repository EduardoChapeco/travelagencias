# UI-010 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-010

Este documento define os passos corretivos planejados para o módulo de Contratos.

---

## 1. Escopo de Mudanças

* **Componente:** [agency.$slug.contracts.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.contracts.tsx)
* **Alteração Técnica:**
  * Depende da correção centralizada no `design.css` (conforme planejado em `UI-009`) para que as classes `bg-surface` e `bg-surface-alt` comecem a herdar a opacidade escura em tempo de execução.
  * Mapear e restaurar ações de criação integrando os botões na `ModuleToolbar` de cabeçalho da rota, eliminando dependências mortas do `ModuleActionButton` nulo.
