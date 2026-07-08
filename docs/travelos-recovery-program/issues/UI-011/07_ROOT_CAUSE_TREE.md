# UI-011 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-011

Este documento descreve a causa do comportamento visual do módulo de Cotações.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Tabela de cotações com linhas brancas e sem contraste.
   ↓
[CAUSA VISUAL IMEDIATA]
Conflito cromático decorrente da aplicação simultânea de background-color: #ffffff e color: #ffffff.
   ↓
[CAUSA DE COMPONENTE]
DataTable.tsx aplicando bg-surface em um contexto onde a classe .os-workspace força texto branco.
   ↓
[CAUSA ARQUITETURAL]
Mesma causa raiz centralizada de UI-009 e UI-010: a quebra de tokens no design.css onde --color-surface foi fixado como constante estática ao invés de variável CSS remapeável.
```
