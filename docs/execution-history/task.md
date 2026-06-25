# Task Tracker: TravelOS — Execução Fases

## [x] Banco de Dados & Tipagem (Fases Iniciais)

- `[x]` Criar migration `20260624000002_boarding_cards_hotel_stars.sql` (adiciona `hotel_stars` a `boarding_cards`)
- `[x]` Criar migration `20260624000003_flight_reconciliation_schema.sql` (tabelas `flight_itineraries` e `flight_segments`)
- `[x]` Aplicar as migrações no Supabase remoto
- `[x]` Atualizar definições de tipo no frontend (`src/integrations/supabase/types.ts`)

## [x] Correção de Mocks & Confirmação (Fase 3)

- `[x]` Refatorar `lodging.tsx` (remover mock de estrelas, persistir e carregar `hotel_stars` real)
- `[x]` Integrar confirmações reais (`trip_confirmation_items`) na aba Resumo do Portal do Cliente (`client.trips.$id.tsx`)
- `[x]` Refatorar `history.tsx` (exibir timeline real, garantir registro de audit log dinâmico)

## [x] Reconciliação Aérea (Fase 4)

- `[x]` Criar service `src/services/flight-reconciliation.ts` com CRUD e motor de diff
- `[x]` Refatorar `flights.tsx` (remover stub "Em breve", criar UI de gerenciamento de itinerários, trechos de voos e visualização de diffs)

## [x] Validação & Testes (Fases 3-4)

- `[x]` Executar typecheck (`npm run typecheck`)
- `[x]` Executar build (`npm run build`)

---

## [x] Fase A — Estabilização Git & Alinhamento de Banco

- `[x]` Stage + commit das 4 migrations `20260624*` (untracked → rastreadas)
- `[x]` Stage + commit da migration `20260619000001_boarding_rooming_list.sql`
- `[x]` Stage + commit dos 5 services novos (`audit`, `flight-reconciliation`, `rooming`, `trip-aggregate`, `trip-confirmation`)
- `[x]` Stage + commit de `types.ts` estendido e 5 rotas refatoradas
- `[x]` Stage + commit de `docs/audit-deep/` (15 relatórios forenses)
- `[x]` `git status` limpo
- `[x]` `npm run typecheck` → **0 erros**
- `[x]` `npm run build` → **✓ 14.96s**, PWA 299 entradas, Cloudflare Pages pronto

---

## [x] Fase B — Consolidação da Rooming List

- `[x]` Criar migration `20260625000001_rooming_list_consolidation.sql`
- `[x]` Aplicar migration no Supabase remoto
- `[x]` Atualizar `rooming.ts` — adicionar `fetchRoomingListByTour(tourId)`
- `[x]` Refatorar `group-tours.$id.tsx` — `RoomingListManager` usa tabela normalizada
- `[x]` Atualizar `types.ts` — `group_tour_id` adicionado, `card_id` nullable
- `[x]` `npm run typecheck` → **0 erros**
- `[x]` `git commit d17624b` — 4 arquivos, 277 inserções

## [x] Fase C — Checkout B2C Pix Real

- `[x]` Criar migration `20260625000002_checkout_pix_storage_integration.sql`
- `[x]` Aplicar a migration no Supabase remoto
- `[x]` Atualizar tipos em `src/integrations/supabase/types.ts`
- `[x]` Modificar `src/routes/agency.$slug.portal.settings.tsx` para incluir o campo `pix_key`
- `[x]` Atualizar `src/services/public.ts` para buscar `pix_key` e usar RPC `enroll_public_tour`
- `[x]` Refatorar `src/routes/p.$agency_slug.tour.$id.tsx` para upload real, chave Pix dinâmica e checkbox LGPD
- `[x]` Rodar typecheck e build para validar alterações

## [x] Fase D — Ativação Omnichannel

- `[x]` Corrigir a Edge Function `gmail-send` (`integrations_config` query e Resend API fallback)
- `[x]` Corrigir a Edge Function `gmail-sync` (`integrations_config` query)
- `[x]` Modificar `src/routes/agency.$slug.support.$ticket_id.tsx` (adicionar `supplierEmail` e input de e-mail do fornecedor)
- `[x]` Implantar (deploy) as Edge Functions `gmail-send` e `gmail-sync` remotamente
- `[x]` Rodar typecheck e build para validar alterações

---

## [x] Fase E — Check-in Links & Reacomodação

- `[x]` Criar arquivo de migração `20260625000003_checkin_links_and_boarding_events.sql`
- `[x]` Aplicar a migração no Supabase remoto via script de banco
- `[x]` Atualizar tipos no frontend (`src/integrations/supabase/types.ts`)
- `[x]` Criar o utilitário `src/utils/airline-deeplinks.ts`
- `[x]` Refatorar a rota de check-in móvel `src/routes/m.checkin.$token.tsx` (detalhes, e-checkin, reacomodação, emergência)
- `[x]` Refatorar a rota do agente `src/routes/agency.$slug.trips.$id.boarding.tsx` (overrides, logs de embarque)
- `[x]` Rodar typecheck (`npm run typecheck`) e build (`npm run build`) para validar alterações
