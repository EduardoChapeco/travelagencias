# UI-012 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-012

## 1. Evidência no Código e Tema
Ao analisar as configurações do quadro Kanban do CRM, observou-se:

* **Largura e Gaps das Colunas:** O layout do Kanban é comprimido quando a coluna lateral contextual de navegação (analisada em `UI-002`) está ativa. Ela consome `var(--shell-context-nav-width)` (220px) fixos, reduzindo a largura útil da área de trabalho e forçando o encolhimento das colunas do Kanban.
* **Contraste de Badges e Cards:** O fundo de cada cartão de lead utiliza a classe `bg-card` ou `bg-surface`. Como analisado em `UI-009`, esses tokens resolvem para `#ffffff` (branco puro) estático em `design.css`, enquanto `.os-workspace` força texto branco (`!important`), destruindo completamente o contraste de leitura dos detalhes e das etiquetas de prioridade.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O encolhimento das colunas do CRM decorre do dock contextual fixo e a pane de legibilidade é consequência direta do drift de tokens em `design.css`).
