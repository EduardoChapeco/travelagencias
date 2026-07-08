# UI-002 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-002

Este documento traça a origem do dock lateral rígido que empurra o grid e consome espaço físico de tela.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Uma barra lateral rígida consome espaço permanente e empurra a visualização dos dados nos módulos.
   ↓
[CAUSA VISUAL IMEDIATA]
Contêineres estruturais na grid flex com larguras estáticas e espaçadores.
   ↓
[CAUSA DE COMPONENTE]
DynamicIslandNav.tsx injetando div espaçador na linha 307 e exibindo a barra contextual de 220px.
   ↓
[CAUSA ARQUITETURAL]
O layout do AppShell.tsx foi estruturado usando grid que se expande para acomodar elementos fixados na lateral.
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
A reestruturação fundiu o conceito de sidebar clássica com o conceito original de "Dynamic Island" flutuante, introduzindo componentes que quebram o isolamento flutuante do wallpaper.
```
