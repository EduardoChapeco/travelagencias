# UI-006 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-006

Este documento mapeia as causas do comportamento visual quebrado do Inbox.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Inbox com blocos brancos opacos e textos invisíveis.
   ↓
[CAUSA VISUAL IMEDIATA]
Contraste nulo devido a texto branco sobreposto a painéis de fundo claro.
   ↓
[CAUSA DE COMPONENTE]
Uso de classes como bg-surface e bg-card em elementos do Inbox que não herdam corretamente a opacidade escura do workspace.
   ↓
[CAUSA ARQUITETURAL]
Forçar a regra de cor de texto "foreground" com !important dentro de .os-workspace sem isolar ou remapear as cores dos componentes internos.
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
A ausência de validação de contraste automatizada (como ferramentas a11y) no pipeline de deploy e falta de revisão do Inbox após introduzir a classe .os-workspace.
```
