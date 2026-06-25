# Plano de Execução: Fase 2 — Compatibilização Banco/Front

Este plano documenta as ações para alinhar a tipagem do frontend com as novas tabelas e colunas adicionadas no Supabase pelas migrações recentes, eliminando casts genéricos `as any` e garantindo o funcionamento resiliente e tipado das consultas e mutações.

## Objetivos

1. Mapear e adicionar todas as novas tabelas e colunas no arquivo central de tipos [types.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/integrations/supabase/types.ts).
2. Substituir os casts `(supabase as any)` nas rotas `suppliers.$id.tsx` e `trips.$id.passengers.tsx`.
3. Validar a build e typecheck localmente.

## Proposta de Alterações

### 1. Extensão de Tipos em `src/integrations/supabase/types.ts`

Adicionar as seguintes tabelas ao objeto `public.Tables` em ordem alfabética:

- `boarding_tickets`
- `contract_clauses`
- `supplier_contacts`
- `supplier_files`
- `supplier_products`
- `supplier_reviews`

Atualizar as colunas das tabelas existentes:

- `suppliers`: adicionar `country`, `state`, `city`, `address`, `zip`, `instagram`, `whatsapp`, `sla_hours`, `contract_url`, `logo_url`, `cover_url`, `rating`, `tags`, `metadata`, `website`.
- `boarding_cards`: adicionar `departure_airport`, `arrival_airport`, `flight_number`, `flight_date`, `flight_class`, `hotel_name`, `hotel_address`, `hotel_checkin`, `hotel_checkout`, `hotel_phone`, `transfer_provider`, `transfer_time`, `transfer_vehicle`, `emergency_phone`, `guide_name`, `guide_phone`, `guide_whatsapp`, `notes_internal`, `destination`, `destination_type`, `pax_count`, `documents_checklist`.
- `contracts`: adicionar `clause_snapshot`, `audit_trail`, `template_id`, `is_custom_clauses`.

### 2. Sanear arquivos do Frontend (Eliminação de `as any`)

- **[agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx)**:
  - Substituir todas as ocorrências de `(supabase as any)` por chamadas tipadas diretas `supabase`.
  - Corrigir tipagens implícitas de objetos retornados para usar os tipos da tabela do banco de dados (ex: `Database['public']['Tables']['supplier_contacts']['Row']`, etc.).
- **[agency.$slug.trips.$id.passengers.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.passengers.tsx)**:
  - Remover `(supabase as any)` das queries de passageiros (`trip_passengers`).

- **[boarding.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/boarding.ts)**:
  - Remover `(supabase as any)` da mutação `createBoardingCard`.

## Plano de Verificação

### Testes Automatizados

```bash
npm run typecheck
npm run build
```

O critério de pronto é a execução de ambos os comandos sem erros de compilação ou de tipagem no typescript.
