# 12 Consolidação do Header e Toolbar

## Auditoria de Posicionamento Global vs Injetado
**Problema Encontrado:** O componente `ModuleActionButton` (que criava o FAB "Novo Lead", "Nova Proposta", etc) estava definido com posicionamento absoluto em relação ao viewport (`fixed top-[54px] left-[12px]`). Como a arquitetura "Ambient Glass" introduziu a `DynamicIslandNav` na lateral esquerda (`left-[4px]`), o `ModuleActionButton` estava sobrepondo e bloqueando as interações com o menu lateral de contexto. Além disso, as mesmas ações primárias já haviam sido portadas para a prop `actions` da `ModuleToolbar`, tornando o FAB redundante.

## Ação de Correção (Onda 3)
1. **ModuleToolbar Validada:** A `ModuleToolbar` principal já estava implementada de forma limpa (`flex items-center gap-4 h-full pointer-events-auto`), agindo puramente como conteúdo e respeitando o slot alocado no portal contextual central do `AppShell.tsx`. Nenhuma intervenção estrutural nela foi necessária.
2. **Depreciação do FAB Flutuante:** O componente `ModuleActionButton` teve seu render substituído por `return null;` no arquivo `src/components/shell/ModuleToolbar.tsx`.
   
## Status de Autoridade
O `AppShell` mantém o slot central no Header para preenchimento pelas sub-rotas. As sub-rotas usam o estado global (`useHeaderStore`) para montar a toolbar no slot sem forçar nenhuma geometria `fixed` ou `absolute` na árvore DOM, preservando o grid e a visibilidade da `DynamicIslandNav`.
**Status Final:** CORRIGIDO E CONSOLIDADO..md
