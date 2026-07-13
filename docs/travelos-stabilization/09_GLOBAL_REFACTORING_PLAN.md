# 09 — GLOBAL REFACTORING PLAN (Plano Global de Correções por Fases)

> Versão 2.0 — Pós-Auditoria Global  
> Data: 2026-07-12  
> Status: ATIVO — Fase 0 em execução

---

## PRINCÍPIO ORGANIZADOR

Problemas com a **mesma causa raiz** são agrupados em uma única fase.  
Fases respeitam **dependências arquiteturais** — fondation antes de componentes, componentes antes de páginas.

---

## FASE 0 — BASELINE E AUDITORIA ✅ CONCLUÍDO

**Objetivo**: Obter o estado real do código. Não codificar nada.

**Resultados**:
- 84 rotas de agência auditadas
- 7 famílias de problemas identificadas com evidência de código
- 14 documentos de estabilização criados em `docs/travelos-stabilization/`
- Confirmado: `--shell-page-padding` nunca consumido (0 de 84 rotas)
- Confirmado: tokens tipográficos `ds-*` em 1 de 84 rotas
- Confirmado: 60 rotas com scroll próprio, 62 com padding local

**Status**: COMPROVADO

---

## FASE 1 — FONTES CANÔNICAS DE TOKEN E TEMA

**ID**: FASE-1  
**Prioridade**: CRÍTICA — bloqueia todas as fases seguintes  
**Status**: NÃO INICIADO

**Objetivo**: Garantir que cada responsabilidade visual tenha exatamente UMA fonte canônica e que ela seja consumível via classe CSS semântica.

**Sintomas**:
- `--shell-page-padding: 24px` definido mas nunca usado
- `rounded-3xl` hardcoded em rotas apesar de `--radius-card` existir
- `pb-24` para dock mobile em 15+ rotas sem token
- Tokens tipográficos `ds-*` existem mas não são usados

**Causa Raiz**: Tokens declarados sem classes utilitárias correspondentes → desenvolvedores usam valores numéricos porque não há classe para usar.

**Arquitetura de Destino**:
```css
/* styles.css — classes canônicas a criar */
.page-content {
  padding: var(--shell-page-padding);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.page-content-x { padding-left: var(--shell-page-padding); padding-right: var(--shell-page-padding); }
.page-content-y { padding-top: var(--shell-page-padding); padding-bottom: var(--shell-page-padding); }
.dock-offset-mobile { padding-bottom: var(--dock-mobile-offset, 96px); }
.page-section-gap { gap: var(--shell-page-padding); }
```

**Blast Radius**: Todos os 84 componentes de rota de agência.

**Plano de Migração**:
1. Adicionar classes `.page-content`, `.page-content-x/y`, `.dock-offset-mobile` em `styles.css`
2. Adicionar token `--dock-mobile-offset: 96px` em `:root`
3. NÃO migrar rotas ainda — apenas estabelecer as classes

**Critério de Pronto**: Classes existem, compilam, e há documentação de quando usar cada uma.

---

## FASE 2 — APPSHELL, GEOMETRY E SCROLL CONTRACT

**ID**: FASE-2  
**Prioridade**: CRÍTICA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-1

**Objetivo**: Definir e documentar O contrato de renderização que qualquer rota de módulo deve seguir para receber scroll e padding corretos sem redefinir nada.

**Sintomas**:
- `overflow-y-auto` reinventado em 60 de 84 rotas
- Padding duplicado em 62 de 84 rotas
- Scroll dentro de scroll (especialmente inbox.tsx com 6 contextos)

**Causa Raiz**: Não existe um "page-shell" ou composition que encapsule `flex-1 overflow-y-auto .page-content` — cada rota faz isso manualmente.

**Arquitetura de Destino**:
```
AppShell → <main.os-workspace> (flex flex-col overflow-hidden h-full)
  → [REGRA] Rotas devem conter exatamente 1 container de scroll:
    Padrão A (página com scroll simples):
      <div class="page-content overflow-y-auto ...">conteúdo</div>
    Padrão B (layout split sem scroll da página):
      <div class="flex-1 flex overflow-hidden ...">colunas</div>
    Padrão C (Kanban/Calendar sem scroll de página):
      <div class="flex-1 overflow-hidden ...">board horizontal</div>
```

**Plano**:
1. Documentar o contrato em `docs/travelos-stabilization/03_SHELL_LAYOUT_GRID_ARCHITECTURE.md`
2. Identificar quais rotas violam o contrato
3. Criar migration guide

---

## FASE 3 — ELIMINAÇÃO DE SHELLS LOCAIS EM ROTAS

**ID**: FASE-3  
**Prioridade**: ALTA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-2

**Objetivo**: Eliminar headers, tabs bars e wrappers de layout definidos DENTRO de rotas que deveriam usar `PageHeader` e compositions canônicas.

**Rotas com shell local confirmado**:
- `agency.$slug.trips.$id.tsx` — Header de viagem + TabBar interna
- `agency.$slug.inbox.tsx` — Split layout com 6 contextos de scroll
- `agency.$slug.boarding.tsx` — Header de embarque local
- `agency.$slug.crm.$lead_id.tsx` — Layout de detalhe com header local

**Abordagem**:
- Para cada rota: mapear a árvore real, identificar o que é responsabilidade do shell vs conteúdo
- Extrair o que pertence ao shell para compositions canônicas (`DetailShell`, `SplitShell`)
- Preservar a lógica de negócio — apenas reorganizar os wrappers

---

## FASE 4 — HEADER, TOOLBAR E AÇÕES CONTEXTUAIS

**ID**: FASE-4  
**Prioridade**: ALTA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-3

**Objetivo**: Garantir que TODAS as ações contextuais de módulo passem pelo portal `PageHeader → HeaderPortal → AppShell header`.

**Problema Encontrado**:
- Rotas com shell local têm ações no header local (ignorando o portal canônico)
- Rotas com PageHeader têm ações em botões flutuantes sobrepostos ao conteúdo
- Duplicação de ações: header + floating action button + dentro de tabela

---

## FASE 5 — PRIMITIVES VISUAIS E VARIANTS

**ID**: FASE-5  
**Prioridade**: MÉDIA-ALTA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-1

**Objetivo**: Unificar o uso de Select, Modal, Table e Badge. Eliminar `div.fixed` inline como modal.

**Ações**:
1. Definir protocolo de Select: quando usar `NativeSelect` vs Radix `Select` vs `SearchableSelect`
2. Migrar todos os `div.fixed` inline para `Dialog` ou `SheetPage` canônico
3. Migrar tabelas HTML manuais sem sorting para `data-table.tsx`
4. Converter `StatusBadge` para uso universal em vez de `<span>` inline

---

## FASE 6 — TIPOGRAFIA, TEXTO E OVERFLOW

**ID**: FASE-6  
**Prioridade**: MÉDIA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-5

**Objetivo**: Aplicar tokens tipográficos `ds-*` nas rotas. Eliminar textos comprimidos causados por flex/grid sem `min-width: 0`.

**Problema Documentado**:
- Textos em containers flex sem `min-width: 0` ficam comprimidos quando o container encolhe
- `text-xs`, `text-[10px]`, `text-[11px]` hardcodados em vez de `ds-meta` e `ds-label-caps`
- `font-extrabold uppercase tracking-widest` repetido em lugar de `ds-label-caps`

---

## FASE 7 — FORMULÁRIOS, INPUTS E CRUDs

**ID**: FASE-7  
**Prioridade**: MÉDIA  
**Status**: NÃO INICIADO  
**Depende de**: FASE-5, FASE-6

**Objetivo**: Padronizar inputs, validações e estados de loading/erro em CRUDs.

---

## FASE 8 — CONTRATOS, SCHEMAS E ACESSO A DADOS

**ID**: FASE-8  
**Prioridade**: MÉDIA  
**Status**: NÃO INICIADO

**Objetivo**: Remover chamadas Supabase de componentes de layout. Centralizar enums de status.

**Problema Confirmado**:
- `trips.$id.tsx` chama `supabase.functions.invoke()` no componente de layout
- STATUS_MAP, STATUS_LABEL hardcodados em rotas — deveriam ser serviços

---

## FASE 9 — REGRAS DE NEGÓCIO E CÁLCULOS

**ID**: FASE-9  
**Status**: NÃO INICIADO  
**Depende de**: FASE-8

---

## FASE 10 — SEGURANÇA, RLS E PERMISSÕES

**ID**: FASE-10  
**Status**: NÃO INICIADO  
**Depende de**: FASE-8

---

## FASE 11 — PERFORMANCE E RE-RENDERS

**ID**: FASE-11  
**Status**: NÃO INICIADO  
**Depende de**: FASE-8

---

## FASE 12 — MIGRAÇÃO DE MÓDULOS E PÁGINAS

**ID**: FASE-12  
**Status**: NÃO INICIADO  
**Depende de**: FASE-3 através FASE-11

**Objetivo**: Migrar os 10 arquivos com maior densidade de problemas para os padrões canônicos.

**Prioridade de Migração** (por impacto visual/funcional):
1. `trips.$id.tsx` — shell local, maior superfície de uso
2. `inbox.tsx` — 6 contextos de scroll, produto crítico
3. `group-tours.$id.lazy.tsx` — 14x bg-white, maior violação glassmorphic
4. `portal.pages.$page_id.tsx` — 14x bg-white, bg-gray
5. `suppliers.$id.tsx` — 11x bg-white
6. `p.$agency_slug.tour.$id.tsx` — página pública, 14x bg-white
7. `quotes.index.tsx` — 4 side panels sem composition
8. `boarding.tsx` — header local
9. `knowledge.tsx` — pb-24 sem token
10. `contracts.tsx` — overflow aninhado

---

## FASE 13 — REMOÇÃO DE LEGADO E DUPLICAÇÕES

**ID**: FASE-13  
**Status**: NÃO INICIADO  
**Depende de**: FASE-12

---

## FASE 14 — DOCUMENTAÇÃO E HOMOLOGAÇÃO

**ID**: FASE-14  
**Status**: NÃO INICIADO  
**Depende de**: FASE-13

---

## PRÓXIMA AÇÃO IMEDIATA

**FASE 1 — INÍCIO**: Adicionar classes canônicas em `styles.css`:
- `.page-content` (scroll + padding)
- `.dock-offset-mobile` (pb-24 → token)
- `--dock-mobile-offset: 96px` em `:root`

Após FASE 1, iniciar FASE 2 documentando o contrato de scroll antes de alterar rotas.
