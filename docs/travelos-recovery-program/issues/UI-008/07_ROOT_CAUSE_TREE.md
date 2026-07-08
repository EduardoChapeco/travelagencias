# UI-008 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-008

Este documento diagnostica a origem da compressão e falta de CTA no estado vazio dos vouchers.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Empty State dos vouchers sem botão de ação e com visual espremido/desfocado.
   ↓
[CAUSA VISUAL IMEDIATA]
Ausência de markup JSX para botões e sobreposição do filtro blur de 32px do AppShell.
   ↓
[CAUSA DE COMPONENTE]
Instanciação do EmptyState em agency.$slug.vouchers.tsx sem preencher o prop 'action'.
   ↓
[CAUSA ARQUITETURAL]
Falta de um modelo ou padrão de navegação unificado para estados vazios nas rotas administrativas da agência.
```
