# UI-009 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-009

Este documento traça a origem do contraste nulo e tabelas brancas opacas em Viagens.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Tabela de viagens com fundo branco opaco e dados textuais invisíveis.
   ↓
[CAUSA VISUAL IMEDIATA]
Conflito de cores: background-color: #ffffff e color: #ffffff (ou transparente).
   ↓
[CAUSA DE COMPONENTE]
DataTable.tsx aplicando bg-surface em um contexto onde a classe .os-workspace força texto branco.
   ↓
[CAUSA ARQUITETURAL]
Drift de Tokens no design.css: a cor semântica @theme --color-surface foi fixada em #ffffff ao invés de mapeada para a variável CSS var(--surface) definida na raiz.
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
A ausência de verificação visual automatizada de contraste e o uso de substituições globais sem considerar o comportamento do compilador Tailwind v4 em relação ao mapeamento dinâmico de variáveis.
```
