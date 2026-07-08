# UI-011 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-011

## 1. Evidência no Código e Tema
A pane visual na listagem de Cotações é idêntica àquela observada no módulo de Viagens e Contratos:

* **Tabela com Fundo Branco Puro:** `DataTable.tsx:L73` e `table.tsx` renderizam com o estilo `background-color: #ffffff` porque `@theme --color-surface` está fixado como `#ffffff` estático no [design.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/design.css).
* **Texto Branco sobre Fundo Branco:** Devido a `.os-workspace` aplicar `--foreground: rgba(255, 255, 255, 0.98) !important`, todos os textos da tabela de cotações perdem o contraste, simulando uma tabela vazia (quando na verdade os dados estão presentes no DOM, mas invisíveis ao usuário).
* **Ações Contextuais de Criação:** A depreciação em `ModuleToolbar.tsx` de `ModuleActionButton` (analisado em `FUNC-001`) oculta o botão primário de "Nova Cotação" se ele ainda residir sob o seletor clássico de ação na rota `agency.$slug.quotes.index.tsx`.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O conflito sistemático dos tokens de cores semânticas atinge diretamente o componente DataTable consumido em cotações).
