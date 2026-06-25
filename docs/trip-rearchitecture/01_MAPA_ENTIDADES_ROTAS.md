# 01 — Mapa de Entidades, Rotas e Domínios Atuais

> **Data:** 2026-06-19  
> **Propósito:** Inventário completo do que existe hoje — rotas, tabelas, services e domínios

---

## 1. Mapa de Rotas — Agência

### 1.1 Domínio Operacional de Viagens (fragmentado)

| Rota                                     | Arquivo                                     | Tabela(s) principal(is)                                      | Domínio Lógico               |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| `/agency/:slug/trips`                    | `agency.$slug.trips.index.tsx`              | `trips`                                                      | Viagens                      |
| `/agency/:slug/trips/:id`                | `agency.$slug.trips.$id.tsx`                | `trips`                                                      | Viagens (layout)             |
| `/agency/:slug/trips/:id/`               | `agency.$slug.trips.$id.index.tsx`          | `trips`                                                      | Visão Geral                  |
| `/agency/:slug/trips/:id/financial`      | `agency.$slug.trips.$id.financial.tsx`      | `financial_records`, `payment_plans`, `payment_installments` | Financeiro da Viagem         |
| `/agency/:slug/trips/:id/passengers`     | `agency.$slug.trips.$id.passengers.tsx`     | `trip_passengers`                                            | Passageiros                  |
| `/agency/:slug/trips/:id/vouchers`       | `agency.$slug.trips.$id.vouchers.tsx`       | `vouchers`                                                   | Voucher da Viagem            |
| `/agency/:slug/trips/:id/contract`       | `agency.$slug.trips.$id.contract.tsx`       | `contracts`                                                  | Contrato da Viagem           |
| `/agency/:slug/group-tours`              | `agency.$slug.group-tours.tsx`              | `group_tours`                                                | **Domínio paralelo a Trips** |
| `/agency/:slug/group-tours/:id`          | `agency.$slug.group-tours.$id.tsx`          | `group_tours`, `group_tour_enrollments`                      | Excursão                     |
| `/agency/:slug/boarding`                 | `agency.$slug.boarding.tsx`                 | `boarding_cards`, `boarding_tickets`                         | **Módulo isolado**           |
| `/agency/:slug/vouchers`                 | `agency.$slug.vouchers.tsx`                 | `vouchers`, `boarding_tickets`                               | **Módulo isolado**           |
| `/agency/:slug/destination-intelligence` | `agency.$slug.destination-intelligence.tsx` | `destination_info`                                           | **Módulo isolado (admin)**   |

### 1.2 Domínio CRM e Vendas

| Rota                          | Arquivo                            | Tabela(s)                  |
| ----------------------------- | ---------------------------------- | -------------------------- |
| `/agency/:slug/crm`           | `agency.$slug.crm.tsx`             | `leads`, `lead_activities` |
| `/agency/:slug/crm/:lead_id`  | `agency.$slug.crm.$lead_id.tsx`    | `leads`, etc               |
| `/agency/:slug/proposals`     | `agency.$slug.proposals.index.tsx` | `proposals`                |
| `/agency/:slug/proposals/:id` | `agency.$slug.proposals.$id.tsx`   | `proposals`, `trips`       |
| `/agency/:slug/contracts`     | `agency.$slug.contracts.tsx`       | `contracts`                |

### 1.3 Portal do Cliente

| Rota                | Arquivo                | Tabela(s)                                                 |
| ------------------- | ---------------------- | --------------------------------------------------------- |
| `/client/trips`     | `client.trips.tsx`     | `trips`                                                   |
| `/client/trips/:id` | `client.trips.$id.tsx` | `trips`, `trip_passengers`, `contracts`, `boarding_cards` |

### 1.4 Rotas de Documentos Públicos (magic links)

| Rota                  | Propósito                          |
| --------------------- | ---------------------------------- |
| `/m/contract/:token`  | Assinatura de contrato             |
| `/m/proposal/:token`  | Visualização de proposta           |
| `/m/passenger/:token` | Upload de documentos de passageiro |
| `/m/payment/:token`   | Página de pagamento                |
| `/m/checkin/:token`   | Check-in público                   |
| `/m/lead/:lead_id`    | Lead capture pública               |

---

## 2. Mapa de Tabelas Existentes

### 2.1 Core de Viagem

```
trips
  id, agency_id, client_id, proposal_id, title, destination
  status (planning/confirmed/in_progress/completed/cancelled)
  travel_start, travel_end, number, code
  total_sale, total_cost, total_paid, currency
  deleted_at, created_at, updated_at

trip_passengers
  id, trip_id, agency_id, full_name, document, email, phone
  passport_number, birth_date, nationality, special_needs
  document_status, document_verified_at

payment_plans
  id, trip_id, agency_id, total_amount, status

payment_installments
  id, payment_plan_id, agency_id, number, due_date, amount
  status (pending/paid/late/waived), paid_at, payment_method
  receipt_url, receipt_status, rejection_reason

financial_records
  id, trip_id, agency_id, type, category, description
  amount, currency, status, due_date, paid_at
```

### 2.2 Grupos (domínio paralelo, sem convergência com trips)

```
group_tours
  id, agency_id, title, destination, departure_date, return_date
  base_price, total_seats, reserved_seats, status, is_public
  bus_layout_id, rooming_list jsonb   ← CAMPO JSONB DO ROOMING

group_tour_enrollments
  id, group_tour_id, agency_id, lead_id, full_name, email
  payment_routing, segment_type
```

### 2.3 Embarque (boarding) — mistura de propósitos

```
boarding_cards
  id, agency_id, trip_id, pnr, airline, status
  alerts[], checklist jsonb, departure_date, passengers_count
  position, tags[], notes, notes_internal, internal_ref
  departure_airport, arrival_airport, flight_number, flight_date, flight_class
  hotel_name, hotel_address, hotel_checkin, hotel_checkout, hotel_phone
  transfer_provider, transfer_time, transfer_vehicle
  guide_name, guide_phone, guide_whatsapp, emergency_phone
  destination, destination_type, pax_count, documents_checklist jsonb

boarding_tickets
  id, card_id, passenger_id, agency_id
  kind (airline/show/attraction/park/transfer/cruise/other)
  ticket_code, passenger_name, date_time, venue, seat
  status (pending/confirmed/issued/cancelled)
  file_url, file_path, extracted_data jsonb, notes

boarding_rooming_list
  id, agency_id, card_id, room_number, room_type
  hotel_name, checkin_date, checkout_date
  passengers jsonb, notes, is_confirmed, order_index
  ← SEM UI — tabela ociosa
```

### 2.4 Vouchers

```
vouchers
  id, agency_id, trip_id, destination, source_type
  template, general_locator, pdf_url, generated_at
  passengers jsonb, deleted_at
```

### 2.5 Contratos

```
contracts
  id, agency_id, trip_id, client_id, status
  content (texto do contrato), signed_at, signature_data
  public_token, template_id

contract_addendums
  id, contract_id, agency_id, type, content, status
  signed_at, public_token
```

### 2.6 Destination Intelligence

```
destination_info
  id, destination, country_code, slug
  visa_required, visa_info, entry_requirements
  tourist_tax, tourist_tax_amount, tourist_tax_currency
  vaccinations_required[], vaccinations_recommended[]
  health_notes, currency, currency_code, plug_type
  language, time_zone, utc_offset, safety_level, safety_notes
  cultural_tips, best_season, budget_range
  ai_generated_at, ai_model, reviewed_at, reviewed_by
  ← SEM vínculo com trips.destination
  ← SEM source/expires_at
  ← SEM histórico de revisão
```

### 2.7 Tabelas que suportam reconciliação/reacomodação

**NENHUMA** — As seguintes tabelas definidas no PRD §5.1 não existem:

- `flight_itineraries`
- `flight_segments`
- `flight_change_cases`
- `flight_alternatives`
- `flight_difference_analysis`
- `customer_travel_decisions`
- `operator_reaccommodation_requests`
- `contract_amendments`
- `trip_documents` (unificada)
- `checkin_links`
- `boarding_events`

---

## 3. Mapa de Services

| Service        | Arquivo                     | Cobre                                                        |
| -------------- | --------------------------- | ------------------------------------------------------------ |
| `boarding.ts`  | `src/services/boarding.ts`  | `boarding_cards`, `boarding_tickets` — queries e mutações    |
| `trips.ts`     | `src/services/trips.ts`     | `financial_records`, `payment_plans`, `payment_installments` |
| `proposals.ts` | `src/services/proposals.ts` | `proposals`                                                  |
| `crm.ts`       | `src/services/crm.ts`       | `leads`, `lead_activities`                                   |
| `vouchers.ts`  | `src/services/vouchers.ts`  | `vouchers`                                                   |
| `clients.ts`   | `src/services/clients.ts`   | `clients`                                                    |
| `settings.ts`  | `src/services/settings.ts`  | `agency_settings`                                            |

**Services ausentes** (acesso direto ao Supabase nos componentes):

- Nenhum service para `destination_info`
- Nenhum service para `contracts` (usado inline)
- Nenhum service para `group_tours` / `group_tour_enrollments`
- Nenhum service para `trip_passengers`
- Nenhum service para `boarding_rooming_list`

---

## 4. Mapa de Edge Functions

| Edge Function              | Propósito                                        |
| -------------------------- | ------------------------------------------------ |
| `ai-message-processor`     | Processamento de mensagens do omnichannel com IA |
| `destination-intelligence` | Geração de dados de destino via IA               |
| `infotravel-connector`     | Integração com Infotravel GDS                    |

**Edge functions ausentes** (necessárias para PRD):

- Reconciliação de itinerários aéreos
- OCR de documentos/e-mails de alteração
- Geração de adendos contratuais
- Comunicação com operadora
- Health check de deep links de check-in

---

## 5. Mapa de Lacunas vs PRD

### 5.1 Navegação

| PRD Exige                                            | Existe?                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Sidebar: Viagens como domínio central                | ❌ Viagens existe mas Grupos, Embarques e Vouchers são separados |
| Sidebar: sem Embarques/Vouchers/Check-in isolados    | ❌ Embarques e Vouchers são itens globais                        |
| Sidebar contextual da viagem (19 seções)             | ❌ Apenas 5 abas no trip layout                                  |
| Views globais de Viagens (filas, pendências, aéreos) | ❌ Não existe                                                    |

### 5.2 Entidades

| PRD Exige                           | Existe?                                        |
| ----------------------------------- | ---------------------------------------------- |
| `TripLifecycleStatus` (14 estados)  | ❌ Apenas 5 estados manuais                    |
| `flight_itineraries`                | ❌                                             |
| `flight_change_cases`               | ❌                                             |
| `customer_travel_decisions`         | ❌                                             |
| `operator_reaccommodation_requests` | ❌                                             |
| `contract_amendments`               | ⚠️ Existe `contract_addendums` sem UI completa |
| `trip_documents` (unificada)        | ❌ Documentos espalhados em várias tabelas     |
| `checkin_links` (registry)          | ❌                                             |
| `boarding_events`                   | ❌                                             |
| Confirmação de Reserva              | ❌                                             |

### 5.3 Fluxos

| PRD Exige                                        | Existe?                             |
| ------------------------------------------------ | ----------------------------------- |
| Conversão de proposta → viagem                   | ✅ (RPC `convert_proposal_to_trip`) |
| Confirmação de Reserva gerada automaticamente    | ❌                                  |
| Upload de alternativas aéreas                    | ❌                                  |
| OCR de documentos de alteração                   | ❌                                  |
| Diff determinístico entre itinerários            | ❌                                  |
| Portal de escolha do cliente                     | ❌                                  |
| Aceite auditável                                 | ❌                                  |
| Adendo contratual automático                     | ❌                                  |
| Comunicação com operadora                        | ❌                                  |
| Propagação de confirmação para portal/documentos | ❌                                  |
| Deep links versionados de check-in               | ❌                                  |
| Guia de embarque (documento)                     | ❌                                  |
| Boarding events (log por passageiro)             | ❌                                  |
