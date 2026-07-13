# TravelOS — Consolidação Arquitetural Canônica

## Status Geral

- [x] **LOTE 0** — Reparar fixture E2E do AppShell ✅ 11/11 testes passando
- [x] **LOTE 2B** — Formulários canônicos (por domínio) ✅ 100% migrados
- [x] **LOTE 3** — Header, Toolbar, Busca, Filtros e Overlays
- [x] **LOTE 4** — Cards, Painéis, Tabelas, Kanban e Calendário
- [x] **LOTE 5** — Tokens, Tema e White-label
- [/] **LOTE 6** — Dados, Supabase, Tipagem e Código morto

---

## Fase 5: Unificação de Primitives
- [x] Migrar Side Panels soltos (`fixed inset-0`, etc) para Radix Sheet (`SheetPage`)
- [x] Migrar Modais soltos para Radix Dialog
- [x] Remover botões de fechar redundantes dentro desses modais, deixando a UI padrão lidar com isso.
- [x] Validar Z-Index context

## Fase 6: Padronização de Navegação e Menus
- [x] Identificar Dropdowns, Sidebars e Menus de Navegação duplicados
- [/] Refatorar componentes de Header e Sidebar para consumo global
- [ ] **LOTE 6** — Dados, Supabase, Tipagem e Código morto

---

## LOTE 0 — Reparar fixture E2E do AppShell

- [x] Identificar contrato de autenticação atual (`agency.$slug.tsx` → `supabase.auth.getSession()`)
- [x] Identificar como agência ativa é carregada (loader TanStack + `supabase.from("agencies").maybeSingle()`)
- [x] Diagnosticar causa raiz do timeout (mocks insuficientes + `waitUntil: "load"`)
- [x] Reescrever fixture com sessão válida (`sb-esmppoxxnyiscidzsjvy-auth-token`)
- [x] Adicionar mocks: `auth/v1/user`, `auth/v1/token`, `platform_branding`, `agencies`, `agency_subscriptions`, `notifications`, `legal_terms`, `legal_acceptance_records`, `profiles`, `desktop_notes`, `desktop_theme_settings`
- [x] Corrigir formato de `maybeSingle()` (objeto único, não array)
- [x] Solução definitiva: navegar para `/auth/login`, setar localStorage via `evaluate()`, depois usar `history.pushState + popstate` para SPA routing sem SSR
- [x] **4/4 testes passando** ✅ (55.6s, incluindo 24.3s para o AppShell)
- [x] Preservação: isolamento de tenant, verificações geométricas (não alterados)

## Fase 5 — Portal: Dead Code + Desacoplamento Quotes (Lote 5)
- [x] Confirmar zero consumidores de `NewSectionsRenderer.tsx` (grep global)
- [x] Deletar `src/components/portal/NewSectionsRenderer.tsx` (103KB de dead code)
- [x] Remover import morto de `NewSectionsRenderer` em `BlockRenderer.tsx` (L2)
- [x] Substituir fallback `<NewSectionsRenderer>` no switch do `BlockRenderer` por `null` silencioso
- [x] Adicionar `fetchKnowledgeDocs`, `deleteKnowledgeDoc` em `quotes-rag.ts`
- [x] Adicionar `deleteQuoteRequest`, `getCurrentUserRole`, `getCurrentUserId`, `invokeAiOrchestrator` em `quotes.ts`
- [x] Substituir 8 chamadas diretas ao `supabase` em `agency.$slug.quotes.index.tsx` por serviços
- [x] Remover `shadow-lg` de `sheet.tsx`, `dialog.tsx` e `AIGeneratorSheet.tsx`
- [x] Typecheck global — zero erros
- [x] Build de produção — 100% sucesso (BlockRenderer: 364KB → 237KB, -35%)

## Fase 6 — Inbox Central: Desacoplamento de Lógica e Hook Customizado (Lote 6)
- [x] Criar hook `src/hooks/use-inbox.ts` encapsulando toda a camada de dados (12 queries, mutations e realtime subscription)
- [x] Refatorar a rota `src/routes/agency.$slug.inbox.tsx` para consumir o hook `useInbox`
- [x] Manter estados de UI/formulário locais isolados na página da rota
- [x] Corrigir imports de `@tanstack/react-query` e tipagens/fallbacks no mapeamento de mensagens
- [x] Rodar typecheck global — zero erros
- [x] Rodar build de homologação de produção — 100% sucesso (Reduzido em 535 linhas de código acoplado)

---

### LOTE 2B — Formulários canônicos (Alta Dívida)
- [x] `src/components/portal/BlockRenderer.tsx` (40 inputs, 4 selects, 4 textareas)
- [x] `src/components/vouchers/VoucherStudio.tsx` (27 inputs, 1 textarea)
- [x] `src/components/boarding/CardDetailPanel.tsx` (20 inputs, 3 selects, 2 textareas)
- [x] `src/routes/agency.$slug.inbox.tsx` (12 inputs, 2 selects, 2 textareas)
- [x] `src/components/portal/BlockFormEditors.tsx` (15 inputs)
- [x] `src/routes/agency.$slug.trips.$id.flights.tsx` (9 inputs, 5 selects)
- [x] `src/routes/agency.$slug.rooming-list.tsx` (10 inputs, 3 selects)
- [x] `src/routes/agency.$slug.trips.$id.passengers.tsx` (9 inputs, 3 selects, 1 textarea)
- [x] Compilar/Typecheck pós-migração E Executar Lote 0 Testes

## LOTE 2B — Formulários Canônicos

### Componentes canônicos confirmados
- `src/components/ui/input.tsx` → `Input`, `FormInput`
- `src/components/ui/select.tsx` → `Select` (Radix), `NativeSelect` (nativo estilizado)
- `src/components/ui/textarea.tsx` → `Textarea`, `FormTextarea`

### Métricas baseline (Lote 0)
| Métrica | Antes |
|---------|-------|
| `<input>` nativos | 155 |
| `<select>` nativos | 65 |
| `<textarea>` nativos | 10 |
| `<button>` nativos | 68 |
| `style={{}}` inline | 290 |
| Hex colors | 421 |
| RGBA/RGB | 96 |
| `!important` | 60 |
| `as any` | 872 |
| Branding "Turis" | 274 |
| Supabase linhas | 494 |

### Ordem de execução por domínio

1. [ ] **Autenticação** — `src/routes/auth.*`
2. [ ] **Configurações** — `src/routes/agency.$slug.settings.*`
3. [ ] **CRM** — `src/routes/agency.$slug.crm.*`
4. [ ] **Viagens** — `src/routes/agency.$slug.trips.*`
5. [ ] **Propostas e cotações** — `src/routes/agency.$slug.proposals.*` e `quotes.*`
6. [ ] **Financeiro** — `src/routes/agency.$slug.financial.*`
7. [ ] **Portal público** — `src/routes/agency.$slug.portal.*`
8. [ ] **Administração** — `src/routes/admin.*`
9. [ ] **Componentes compartilhados restantes**
