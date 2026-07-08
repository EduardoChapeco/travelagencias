# UI-002 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-002

## 1. Evidência no Código
Ao inspecionar o arquivo [DynamicIslandNav.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/DynamicIslandNav.tsx), identificou-se a seguinte estrutura:

* **Modo Principal:** Definido a partir da linha 259, possui `position: absolute`, mas na linha 307 o componente injeta um div espaçador invisível rígido para reservar largura no grid flexível:
  ```tsx
  {/* Espaçador invisível para reservar o espaço do Hub Nav na Grid/Flex */}
  <div className="w-[var(--shell-primary-nav-width)] shrink-0" />
  ```
* **Modo Contextual:** Definido a partir da linha 312, renderiza uma barra lateral estática rígida com `width: "var(--shell-context-nav-width)"` e fundo de vidro que empurra o restante do layout para a direita.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O dock é de fato uma barra de largura fixa e não um pill flutuante isolado do grid).
