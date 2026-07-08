# UI-010 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-010

Este documento descreve a causa do comportamento visual do módulo de Contratos.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Cards de contratos com fundo branco e textos invisíveis.
   ↓
[CAUSA VISUAL IMEDIATA]
Aplicação de background-color: #ffffff (via bg-surface) sob texto branco imposto pelo os-workspace.
   ↓
[CAUSA DE COMPONENTE]
Instanciação de primitivos Card e Table dentro de agency.$slug.contracts.tsx que usam bg-surface.
   ↓
[CAUSA ARQUITETURAL]
Mesma causa raiz centralizada de UI-009: a quebra de tokens no design.css onde --color-surface foi fixado como constante estática ao invés de variável CSS remapeável.
```
