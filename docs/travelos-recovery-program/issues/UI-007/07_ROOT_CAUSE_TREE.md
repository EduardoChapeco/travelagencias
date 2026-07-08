# UI-007 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-007

Este documento diagnostica a origem da aplicação do token `rounded-full` no Kanban de embarques.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Colunas de Kanban com formato de cápsulas gigantes alongadas.
   ↓
[CAUSA VISUAL IMEDIATA]
Aplicação da propriedade CSS border-radius: 9999px (decorrente da classe rounded-full).
   ↓
[CAUSA DE COMPONENTE]
A classe rounded-full declarada em Column.tsx (linhas 22 e 49).
   ↓
[CAUSA ARQUITETURAL]
Substituição inadequada por script automatizado (regex global) ou preenchimento de código "vibe coded" que trocou os arredondamentos normais (rounded-2xl) pelo token padrão de botão (rounded-full).
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
Falta de revisão técnica visual detalhada após substituições em massa na biblioteca de componentes.
```
