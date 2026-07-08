# UI-008 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-008

Este documento estabelece as diretrizes para corrigir o Empty State nos vouchers.

---

## 1. Escopo de Mudanças

* **Componente:** [agency.$slug.vouchers.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.vouchers.tsx)
* **Alteração Técnica:**
  * Injetar o prop `action` no componente `EmptyState` da listagem de vouchers.
  * O botão do CTA deve permitir criar um voucher, ou abrir a documentação de instruções de importação de PDF.
  * Garantir o alinhamento da largura do texto com fallbacks limpos.
