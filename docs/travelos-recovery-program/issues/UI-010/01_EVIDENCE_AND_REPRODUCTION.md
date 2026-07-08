# UI-010 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-010

## 1. Evidência no Código e Tema
Assim como em `UI-009`, a renderização do painel de Contratos é afetada pela quebra de tokens de cores semânticas em `design.css`:

* **Fundo de Cards e Tabelas:** O uso de `bg-surface` nos cartões e nas tabelas de contratos é compilado para `#ffffff` (branco puro) estático pelo Tailwind v4, devido à regra `--color-surface: #ffffff;` no [design.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/design.css).
* **Contraste Nulo:** A sobreposição da classe `.os-workspace` impõe texto branco (`color: rgba(255, 255, 255, 0.98) !important`), ocultando os textos descritivos do contrato (data, assinaturas, valores) contra o fundo branco.
* **Ações Contextuais:** A depreciação do `ModuleActionButton` (analisado em `FUNC-001`) remove os controles primários de envio/geração de contrato se a rota não tiver sido portada para o slot de cabeçalho.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O erro centralizado de token de cor e a ocultação de botões contextuais explicam a pane visual na rota de contratos).
