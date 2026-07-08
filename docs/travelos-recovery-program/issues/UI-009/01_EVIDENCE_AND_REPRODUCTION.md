# UI-009 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-009

## 1. Evidência no Código e Tema
Ao inspecionar o arquivo [design.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/design.css), identificou-se o seguinte hardcode estático dentro da diretiva `@theme`:

```css
  --color-surface: #ffffff;
  --color-surface-alt: #ffffffb3;
```

* **Causa do Fundo Branco:** Como `DataTable.tsx:L73` e `table.tsx` dependem da classe `bg-surface`, o compilador do Tailwind v4 gera o estilo estático `background-color: #ffffff`. Isso anula qualquer redefinição local da variável `--surface` efetuada pela classe `.os-workspace` (que deveria ser `rgba(10, 10, 15, 0.55)`). O resultado é uma tabela branca pura e opaca.
* **Causa do Texto Invisível:** A classe `.os-workspace` no `AppShell` impõe `--foreground: rgba(255, 255, 255, 0.98) !important`. Esse seletor atinge os textos da tabela. Desta forma, a tabela renderiza com **fundo branco puro (`#ffffff`)** e **texto branco puro (`rgba(255, 255, 255, 0.98)`)**, tornando todas as linhas e dados invisíveis.
* **Causa da Paginação:** Os botões de paginação usam a classe `rounded-full` (conforme `data-table.tsx:L143-167`), mas não possuem cores semânticas explícitas de texto/ícone, herdando o contraste nulo.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO E RUNTIME** (O mapeamento estático das variáveis de cor do Tailwind v4 bloqueia a alteração dinâmica pelo workspace e força o contraste nulo).
