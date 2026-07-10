# 08_ACTIVE_ISSUES.md — Registro de Problemas e Pendências Ativas

## Problemas Resolvidos nesta Estabilização

### 1. Duplicação do Assistente de IA
- **Sintoma**: Ícone de chat redundante no dock lateral + botão flutuante.
- **Correção**: Unificado no `AIFloatingWidget`. No desktop ele renderiza exclusivamente `inline` no rodapé da barra lateral. No mobile/Home ele renderiza `fixed` sem sobreposições.
- **Status**: **COMPROVADO**

### 2. Sobreposição e Toques no Sidebar
- **Sintoma**: O botão circular de IA ficava flutuando em cima da borda inferior do Dock.
- **Correção**: Reformulado o sidebar vertical como um grid de 3 seções espaçadas (`gap-4`), onde nenhum elemento se sobrepõe ou toca no outro.
- **Status**: **COMPROVADO**

### 3. Ação Principal Dentro do Grid
- **Sintoma**: "Nova Tarefa" renderizado como faixa azul ocupando largura total da tela.
- **Correção**: Retirado do grid de conteúdo e delegado para a renderização canônica no topo do sidebar (desktop) e no topo do header (mobile) através de contrato dinâmico com o `useLayoutStore`.
- **Status**: **COMPROVADO**

### 4. Rota Inválida no Módulo de Suporte
- **Sintoma**: Acesso à rota `/daily-tasks/support` gerando página `Not Found`.
- **Correção**: Adicionada rota em `src/routes/agency.$slug.daily-tasks.support.tsx` com redirecionamento de segurança absoluto para a rota de suporte oficial `/agency/$slug/support`.
- **Status**: **COMPROVADO**
