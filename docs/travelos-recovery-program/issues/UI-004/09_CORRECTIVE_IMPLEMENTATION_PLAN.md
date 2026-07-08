# UI-004 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-004

Este documento estabelece as diretrizes para corrigir desalinhamentos e colisões no cabeçalho.

---

## 1. Escopo de Mudanças

* **Componente:** [ModuleToolbar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ModuleToolbar.tsx) e [AppShell.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx)
* **Alteração Técnica:**
  * Remover os limites estáticos de largura máxima de pílulas (`max-w-md`) no desktop, permitindo que a toolbar utilize de forma equilibrada o espaço disponível.
  * Injetar regras de flex-wrap na barra de cabeçalho ou ocultar/compactar filtros secundários em botões dropdown sob resoluções de notebook (ex: menor que 1280px).
  * Garantir contraste de 4.5:1 em todos os ícones e textos de ações da toolbar injetando classes semânticas claras de cor.
