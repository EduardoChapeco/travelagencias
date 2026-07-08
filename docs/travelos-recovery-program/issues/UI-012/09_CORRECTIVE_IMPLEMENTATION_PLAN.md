# UI-012 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-012

Este documento estabelece o plano corretivo para o quadro Kanban de CRM.

---

## 1. Escopo de Mudanças

* **Componente:** [agency.$slug.crm.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.tsx)
* **Alteração Técnica:**
  * Depende da liberação de largura de tela resolvida no issue `UI-002` (restauração do dock vertical lateral flutuante e remoção de colunas rígidas).
  * Depende da redefinição dinâmica do `--color-surface` em `design.css` (resolvido em `UI-009`) para que as superfícies dos cartões de lead se tornem translúcidas e legíveis.
  * Injetar classes explícitas de borda e padding para manter uniformidade visual nos Kanbans da plataforma.
