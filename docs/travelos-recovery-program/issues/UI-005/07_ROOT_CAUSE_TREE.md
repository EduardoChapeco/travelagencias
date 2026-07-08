# UI-005 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-005

Este documento esboça a hipótese de causa raiz para a quebra de layout na Home pública.

---

## 1. Mapeamento de Causa Raiz (Hipótese)

```
[SINTOMA]
Textos da Home pública aparecem comprimidos em uma coluna de uma palavra por linha.
   ↓
[CAUSA VISUAL IMEDIATA]
Classes de largura (max-w-4xl, max-w-6xl) não aplicando o limite correto, ou sendo sobrescritas por seletores globais.
   ↓
[CAUSA DE COMPONENTE]
Contêineres estruturais da landing page (index.tsx) sem definição de escopo de composição isolada.
   ↓
[CAUSA ARQUITETURAL]
Falha na compilação do bundle CSS pelo Tailwind v4 por caminhos contendo acentos/espaços em sistemas Windows, ou vazamento de classes de painel para o escopo público.
```
