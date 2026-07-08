# UI-011 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-011

Este documento define os passos corretivos planejados para o módulo de Cotações.

---

## 1. Escopo de Mudanças

* **Componente:** [agency.$slug.quotes.index.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.quotes.index.tsx)
* **Alteração Técnica:**
  * Depende da correção centralizada no `design.css` (conforme planejado em `UI-009`) para que as tabelas com a classe `bg-surface` herdem a opacidade do workspace de forma transparente.
  * Mapear e restaurar a ação primária de "Nova Cotação" integrando o botão de inserção no slot de cabeçalho da `ModuleToolbar`, contornando a depreciação do `ModuleActionButton`.
