# UI-004 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-004

Este documento traça a causa raiz dos problemas de alinhamento e cortes no cabeçalho.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Pills de filtro cortadas e ações sobrepostas ou invisíveis no cabeçalho superior.
   ↓
[CAUSA VISUAL IMEDIATA]
Contêiner de filtros com largura restrita (max-w-md) e falta de largura limite no header.
   ↓
[CAUSA DE COMPONENTE]
AppShell.tsx definindo o header com distribuição absoluta simples, permitindo colisão quando a toolbar central cresce demais.
   ↓
[CAUSA ARQUITETURAL]
Falta de um sistema de responsividade claro para a barra de ferramentas de módulos na transição entre resoluções (desktop para notebook/tablet).
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
A pressa para migrar todas as barras superiores para um único slot centralizado no AppShell sem desenhar regras de wrapping ou colapso responsivo para os elementos internos da ModuleToolbar.
```
