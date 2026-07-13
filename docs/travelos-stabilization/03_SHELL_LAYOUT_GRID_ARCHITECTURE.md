# 03_SHELL_LAYOUT_GRID_ARCHITECTURE.md

> Versão 2.0 — Pós-Auditoria Global  
> Data: 2026-07-12

---

## O PROBLEMA DOS MÚLTIPLOS SCROLLS E PADDINGS

Durante muito tempo, o TravelOS sofreu com a síndrome de "scroll aninhado" e "padding fantasma". Rotas dentro do sistema não confiavam na estrutura externa e recriavam suas próprias áreas de rolagem e margens com classes Tailwind numéricas (ex: `flex-1 overflow-y-auto p-4 md:p-6 pb-24`).

Isso criava:
1. Paddings inconsistentes.
2. Comportamentos de rolagem bizarros (múltiplas barras de rolagem no desktop e conteúdo cortado no mobile).
3. Problemas de Z-index entre o conteúdo e o dock navigation.

---

## O CONTRATO DO APPSHELL

O `AppShell` é o coordenador definitivo da geometria do sistema.

### Como o AppShell monta a área de trabalho
No desktop de módulos, ele configura um Grid principal de 5 colunas:
1. `var(--shell-edge-gap)`
2. `AppSidebar` (tamanho do conteúdo)
3. `var(--shell-content-gutter)`
4. `main.os-workspace` (a área de trabalho real)
5. `var(--shell-edge-gap)`

**Importante:** A área `main.os-workspace` é projetada com `overflow-hidden` e `flex-col`.
Isto significa que o container principal **não rola**. Ele fornece uma janela exata para o conteúdo da rota, garantindo que o cabeçalho e as áreas periféricas fiquem paradas.

---

## O CONTRATO DAS ROTAS DE MÓDULO (PHASE 2)

A partir da Fase 2 de estabilização, **todas as rotas de módulo** (arquivos em `src/routes/agency.*.tsx` que não são shells) devem aderir a um dos três padrões canônicos para estruturação de conteúdo, **usando classes canônicas do CSS** (`.page-content`, `.page-section`, `.dock-offset`) e não recriando a roda com `p-4` ou `overflow-y-auto`.

### Padrão A — Página de Conteúdo com Rolagem Padrão

A vasta maioria das páginas deve ter um contêiner pai único de rolagem que empurre as bordas inferiores acima do Dock mobile:

```tsx
return (
  <div className="page-content page-section dock-offset">
    {/* Conteúdo rolável. Paddings geridos pelo page-content. */}
    <PageHeader title="Título" />
    <SeuConteudo />
  </div>
);
```

### Padrão B — Layout de Colunas com Rolagem Independente (Inbox, Split)

Se a rota requer um layout de 2 colunas lado a lado, onde cada coluna rola independentemente, o container pai deve **esconder** o overflow. O padding pode ser omitido do pai, sendo aplicado nas colunas ou no componente:

```tsx
return (
  <div className="flex-1 flex overflow-hidden min-h-0">
    {/* Coluna Esquerda: Lista de Conversas */}
    <div className="w-80 page-content dock-offset flex-shrink-0">
       <Lista />
    </div>
    
    {/* Coluna Direita: Conteúdo Ativo */}
    <div className="flex-1 page-content dock-offset">
       <Detalhes />
    </div>
  </div>
);
```

### Padrão C — Kanban / Quadros Horizontais

Quando o conteúdo se espalha horizontalmente (ex. CRM Kanban, Embarques):

```tsx
return (
  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
    <div className="page-content-x page-content-y">
      <PageHeader title="Kanban" />
    </div>
    {/* Área do Kanban rola internamente nos eixos X/Y */}
    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 dock-offset">
      <Board />
    </div>
  </div>
);
```

---

## CLASSES CANÔNICAS ADICIONADAS NO STYLES.CSS (PHASE 1)

**`.page-content`**:
*   Aplica `flex-1 min-h-0 overflow-y-auto`.
*   Aplica paddings usando `var(--shell-page-padding)` (ajustado para desktop).

**`.page-content-x` e `.page-content-y`**:
*   Variações para quando você precisa apenas de padding horizontal ou vertical, sem aplicar as regras de overflow ou flex container.

**`.page-section`**:
*   Aplica um `gap` coerente com a margem da página.

**`.dock-offset`**:
*   Adiciona um padding-bottom apenas no mobile (`var(--dock-mobile-offset)` configurado para 96px), permitindo que o conteúdo seja rolado além do Dock sem se esconder sob ele. Zera este valor no desktop.
