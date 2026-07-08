# UI-001 - 07_ROOT_CAUSE_TREE.md
# ÁRVORE DE CAUSA RAIZ - UI-001

Este documento traça a origem do desfoque incondicional global sobre o plano de fundo dos módulos.

---

## 1. Mapeamento de Causa Raiz

```
[SINTOMA]
Wallpaper desfocado de forma incondicional em todos os módulos internos do painel.
   ↓
[CAUSA VISUAL IMEDIATA]
Camada overlay absoluta HTML aplicando filtro de desfoque.
   ↓
[CAUSA DE COMPONENTE]
O div na linha 172 do AppShell.tsx contendo "backdropFilter: 'blur(32px) saturate(180%)'".
   ↓
[CAUSA ARQUITETURAL]
Falta de amarração entre a variável de estado de personalização "blurIntensity" e o filtro do overlay global.
   ↓
[CAUSA QUE PERMITIU A REGRESSÃO]
A regra de vidro foi centralizada de forma imperativa sob uma premissa estática ("centralized glass panel") sem respeitar os tokens semânticos e as preferências de tema ativas do usuário.
```
