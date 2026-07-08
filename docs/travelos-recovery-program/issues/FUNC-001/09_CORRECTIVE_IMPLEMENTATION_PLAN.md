# FUNC-001 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - FUNC-001

Este documento detalha as ações corretivas planejadas para restaurar botões de ação contextuais.

---

## 1. Escopo de Mudanças

* **Componente:** [ModuleToolbar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ModuleToolbar.tsx)
* **Alteração Técnica:**
  * Reativar temporariamente o `ModuleActionButton` para renderizar o botão flutuante de criação clássica ou integrá-lo de forma limpa na parte superior lateral do workspace das subrotas onde as ações primárias não foram portadas para a `ModuleToolbar` de cabeçalho.
  * Mapear todos os consumidores do `ModuleActionButton` no repositório para assegurar que a migração da ação para o slot `actions` da `ModuleToolbar` de cabeçalho seja feita de forma explícita e testada em cada rota envolvida.
