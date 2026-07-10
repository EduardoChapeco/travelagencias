# 05_PRIMITIVE_AND_COMPOSITION_REGISTRY.md — Registro de Primitivos e Composições

## Primitivos Canônicos e Estilos Estabelecidos

### 1. Botões (`Button`, `IconButton`)
- **Padrão**: Perfeitamente circulares ou estilo pill (`rounded-full`), sem sombreado (`shadow-none`), estilizados exclusivamente com bordas sutis e fundo glassmorphism.
- **Botão de Ação Primária**: `w-14 h-14` (circular completo), cor base `bg-primary`, texto `text-primary-foreground`, com zoom sutil no hover (`hover:scale-105`).

### 2. Cards e Painéis
- **Fundo**: `.glass-card` (preenchimento `rgba(15, 15, 22, 0.32)` e borda `rgba(255, 255, 255, 0.08)`).
- **Arredondamento**: `rounded-[var(--radius-card)]` (28px).
- **Sem Sombras**: Sombras desativadas via regra `@layer base` (`box-shadow: none !important`).

### 3. Cabeçalho (`PageHeader`)
- Centraliza controles de Busca, Filtros em abas, Ações Secundárias e Ação Primária em uma estrutura unificada teleportada para o topo.
- Limita altura a `32px` (`h-8`) de todos os inputs e containers de botão.

### 4. Kanban e Grade Kanban
- **Coluna Kanban**: `.kanban-column` com fundo transparente escurecido `.bg-[var(--surface-alt)]/25` e bordas finas.
- **Card Kanban**: Fundo `bg-card` e arredondamento `rounded-[var(--radius-card)]`.
