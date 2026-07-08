# UI-006 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-006

## 1. Evidência no Código
* **Sobreposição de Cores:** Em `styles.css`, a classe `.os-workspace` força a cor do texto para branco utilizando a diretiva `!important`:
  ```css
  .os-workspace {
    --foreground: rgba(255, 255, 255, 0.98) !important;
  }
  ```
  Isso faz com que *qualquer* sub-painel ou componente que não tenha a cor do texto explicitada localmente herde texto branco.
* **Fundo de Cartão Clássico (`bg-card`):** Componentes primitivos baseados em shadcn/ui renderizados no Inbox que utilizem classes como `bg-card` ou `bg-background` e não herdem `--surface` diretamente resolvem seu fundo como branco (`#ffffff`) no tema padrão da aplicação. O resultado é a sobreposição catastrófica: **Texto Branco (`!important`) sobre Fundo Branco (`bg-card`)**, gerando áreas inteiras invisíveis na tela.
* **Falta de Sidebar:** A barra lateral principal é ocultada dependendo da largura móvel, mas no desktop ela é empurrada pela coluna extra rígida de contexto do módulo (conforme analisado em `UI-002`).

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O conflito de `--foreground` global do workspace com primitivos de fundo claro ou padrões de cores rígidos de fato quebra a visibilidade no Inbox).
