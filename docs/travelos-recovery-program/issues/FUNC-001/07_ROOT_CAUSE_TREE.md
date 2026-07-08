# FUNC-001 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - FUNC-001

Este documento descreve a origem da depreciação prematura do botão contextual de ação.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Botões de criação operacional desaparecidos em múltiplas tabelas e views de dados.
   ↓
[CAUSA VISUAL IMEDIATA]
Componente ModuleActionButton retornando null no render.
   ↓
[CAUSA DE COMPONENTE]
A função ModuleActionButton em ModuleToolbar.tsx forçada a retornar null de forma estática.
   ↓
[CAUSA ARQUITETURAL]
Ações principais foram consolidadas no cabeçalho centralizado (ModuleToolbar) sob a premissa de que todas as views seriam migradas simultaneamente para a nova estrutura, sem validação de paridade de consumo.
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
Falta de testes visuais e funcionais nas subrotas operacionais antes de deprecar o componente visual original de ação rápida lateral.
```
