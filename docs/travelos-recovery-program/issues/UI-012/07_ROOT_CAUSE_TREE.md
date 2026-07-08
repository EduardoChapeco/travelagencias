# UI-012 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-012

Este documento traça a origem do desalinhamento e quebras de contraste no CRM Kanban.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Quadro Kanban de leads do CRM com colunas espremidas e cartões ilegíveis.
   ↓
[CAUSA VISUAL IMEDIATA]
Redução do espaço útil de tela e contraste nulo de texto.
   ↓
[CAUSA DE COMPONENTE]
A coluna lateral contextual fixa ocupando 220px (DynamicIslandNav.tsx) aliada ao uso do bg-surface nos cartões de lead.
   ↓
[CAUSA ARQUITETURAL]
Mesma causa raiz centralizada de UI-009 e UI-010: a quebra de tokens no design.css onde --color-surface foi fixado como constante estática ao invés de variável CSS remapeável.
```
