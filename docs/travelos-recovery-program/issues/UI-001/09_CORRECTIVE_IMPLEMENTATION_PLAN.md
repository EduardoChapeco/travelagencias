# UI-001 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-001

Este documento detalha o plano de restauração da nitidez do plano de fundo e submissão do blur global ao controle do tema.

---

## 1. Escopo de Mudanças

* **Componente:** [AppShell.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx)
* **Alteração Técnica:**
  * Remover o `backdropFilter` estático de 32px do div overlay absolute.
  * Substituir o valor do filtro por uma propriedade controlável baseada no estado de personalização `blurIntensity` do usuário:
    ```tsx
    backdropFilter: `blur(${blurIntensity}px) saturate(180%)`
    ```
  * Garantir que as superfícies operacionais (como cards) continuem aplicando seu próprio `backdrop-filter` específico de forma independente, respeitando a integridade visual sem empilhamento desnecessário.
