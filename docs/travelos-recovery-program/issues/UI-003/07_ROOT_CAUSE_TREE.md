# UI-003 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-003

Este documento traça o diagnóstico de integridade do Dock horizontal da Home.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Hipótese de que o dock estaria ausente ou quebrado na Home do painel.
   ↓
[CAUSA VISUAL IMEDIATA]
Nenhuma causa de quebra ativa. O dock horizontal está renderizado na base.
   ↓
[CAUSA DE COMPONENTE]
O dock horizontal reside dentro de StickyNotesCanvas.tsx (atalhos do Canvas).
   ↓
[CAUSA ARQUITETURAL]
Acoplamento da barra de dock do workspace com o contêiner de notas autoadesivas, gerando confusão sobre a responsabilidade do layout central de navegação da Home.
```
