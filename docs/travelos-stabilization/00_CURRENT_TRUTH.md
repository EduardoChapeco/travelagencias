# 00_CURRENT_TRUTH.md
# Estado Atual da Verdade (Current Truth)

## 1. Classificação das Correções Anteriores
- **Causa Raiz das Superfícies Brancas (Quotes, Contratos, Calendário):** CORREÇÃO COMPROVADA. O computed style `--color-surface` era herdado estaticamente de `:root` como `#ffffff` devido a restrições de escopo do CSS. Redefinir `--color-surface` e `--color-surface-alt` localmente sob `.os-workspace` corrigiu a árvore de renderização.
- **Dock sobreposto ao CRM Kanban:** CORREÇÃO COMPROVADA. A main workspace usava um padding estático `md:pl-[84px]`. A margem foi reescrita no AppShell para checar `contextItems` e expandir para `md:pl-[300px]` quando há itens contextuais na tela.
- **EmptyState do Caixa Diário comprimido:** CORREÇÃO COMPROVADA. Faltavam classes de largura no container flex do `EmptyState` primitive. Corrigido com `w-full max-w-md` no componente compartilhado.
- **Calendário branco e deslocado:** CORREÇÃO COMPROVADA. O grid de dias não tinha `flex-grow` ou `flex-1`, fazendo com que `grid-rows-6` com `1fr` colapsasse a zero e deslocasse as marcações. Adicionado `flex-1`.
