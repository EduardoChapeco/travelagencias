# 19 Consolidação Support & Inbox

## Auditoria Geométrica do Módulo de Chat
**Evidência Real Encontrada:** 
A rota de suporte detalhado (`agency.$slug.support.$ticket_id.tsx`) possuía um contêiner root utilizando `h-full`. Embora `h-full` funcione na maioria dos casos no Tailwind, ao estar aninhado dentro de um Outlet com restrições flex (`flex-1 min-h-0` definido pelo AppShell), a especificação do Flexbox requer explicitamente `min-h-0` para evitar que flex itens inflem seus filhos além do layout da tela, causando quebra do eixo Y e vazando o scroll para a janela.

**Arquitetura do Painel:**
- A coluna da esquerda (Timeline & Input) usa `flex-1 flex flex-col min-w-0`.
- A coluna da direita (Metadados) usa `w-80 shrink-0 flex flex-col`.

## Ações de Correção (Onda 8)
1. **Fix de Flexbox:** O wrapper principal do chat detalhado foi modificado de `className="flex h-full overflow-hidden"` para `className="flex flex-1 min-h-0 overflow-hidden bg-transparent"`.
2. **Resultado:** Isso garante matematicamente que o módulo vai respeitar os bounds de seu parent flexível. As duas colunas internas (`Timeline` e `Metadados`) agora retêm seus próprios blocos de rolagem isolados (`overflow-y-auto` em seus respectivos slots), e a janela mestre nunca exibe a scrollbar padrão do navegador.

**Status Final:** ESTABILIZADO E CONTIDO. O eixo Y não está mais quebrando e o layout se ajusta fluidamente sem scroll vazar..md
