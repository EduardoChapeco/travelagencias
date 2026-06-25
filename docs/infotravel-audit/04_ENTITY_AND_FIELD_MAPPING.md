# 04. Mapeamento de Entidades e Dicionário de Campos

Este documento estabelece o mapeamento lógico e a tradução de campos ("Data Mapping") entre os objetos da API **Infotravel/Infotera** (DTOs prefixados com `Api` e schemas JSON) e o modelo relacional de banco de dados do **TravelOS**.

---

## 1. Tabela Conceitual: `external_entity_links`

Para garantir que o sistema rastreie registros sem acoplamento por nomes ou strings frágeis, propõe-se a criação da tabela `external_entity_links` no PostgreSQL. Esta tabela atuará como o dicionário central de identidades externas.

```sql
CREATE TABLE IF NOT EXISTS public.external_entity_links (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider             text NOT NULL DEFAULT 'infotravel', -- infotravel, etc.
  entity_type          text NOT NULL, -- booking, client, passenger, hotel, flight, invoice, etc.
  external_id          text NOT NULL, -- ID físico do objeto na base do Infotravel
  internal_entity_type text NOT NULL, -- trips, clients, trip_passengers, financial_transactions, etc.
  internal_id          uuid NOT NULL, -- ID (PK) correspondente na base do TravelOS
  external_version     int NOT NULL DEFAULT 1, -- Versão do registro retornado pela API
  last_synced_at       timestamptz NOT NULL DEFAULT now(),
  checksum             text, -- Hash MD5/SHA256 do payload cru para detectar alterações sem escrita
  status               text NOT NULL DEFAULT 'synced', -- synced, pending_review, conflict
  
  CONSTRAINT external_entity_provider_id_unique UNIQUE(agency_id, provider, entity_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_links_internal ON public.external_entity_links(internal_entity_type, internal_id);
```

---

## 2. Matriz de Mapeamento de Entidades

| Entidade Infotravel | Entidade TravelOS | Tabela de Destino | Chave de Vínculo Externo | Direção da Sincronização |
| :--- | :--- | :--- | :--- | :---: |
| `ApiBooking` | Viagem / Reserva | `public.trips` | `ApiBooking.id` (ou locator) | `Infotravel` → `TravelOS` (Unilateral) |
| `ApiClient` | Cliente Principal | `public.clients` | `ApiClient.id` / `ApiClient.externalCode` | `Bilateral` (Se editado via Portal) |
| `ApiName` | Passageiro | `public.trip_passengers` | `ApiName.id` / `ApiName.document` | `Infotravel` → `TravelOS` (Unilateral) |
| `ApiHotel` | Hotel / Acomodação | `public.boarding_rooming_list` | `ApiHotel.id` | `Infotravel` → `TravelOS` (Unilateral) |
| `ApiFlight` | Trecho Aéreo / Voo | `public.flight_segments` | `ApiFlight.id` | `Infotravel` → `TravelOS` (Unilateral) |
| `ApiPayment` | Transação Contábil | `public.cash_transactions` | `ApiPayment.id` | `Infotravel` → `TravelOS` (Unilateral) |
| `ApiInvoice` | Fatura / Recibo | `public.financial_records` | `ApiInvoice.id` | `Infotravel` → `TravelOS` (Unilateral) |
| `Contract` | Contrato Legal | `public.contracts` | `Contract.url` (ou identificador) | `Infotravel` → `TravelOS` (Unilateral) |

---

## 3. Mapeamento Detalhado de Campos Críticos

### 3.1. Reserva: `ApiBooking` → `public.trips`
* `ApiBooking.id` $\rightarrow$ Gravado em `external_entity_links.external_id` (tipo `booking`).
* `ApiBooking.status` $\rightarrow$ Mapeado para `trips.status`:
  * `CONFIRMED` / `ACTIVE` $\rightarrow$ `confirmed`
  * `PENDING` $\rightarrow$ `planning`
  * `CANCELLED` $\rightarrow$ `cancelled`
* `ApiBooking.total` $\rightarrow$ Mapeado para `trips.total_sale` (Preço de venda final ao cliente).
* `ApiBooking.netValue` $\rightarrow$ Mapeado para `trips.total_cost` (Custo líquido da operadora).
* `ApiBooking.cancellationDate` $\rightarrow$ Gravado em `trips.notes` ou coluna de metadados se a reserva for cancelada.

### 3.2. Cliente: `ApiClient` → `public.clients`
* `ApiClient.id` / `externalCode` $\rightarrow$ Gravado em `external_entity_links.external_id` (tipo `client`).
* `ApiClient.name` + `ApiClient.lastName` $\rightarrow$ Mapeado para `clients.full_name`.
* `ApiClient.address` $\rightarrow$ Traduzido e mapeado para o objeto JSON `clients.address` (`street`, `number`, `neighborhood`, `city`, `state`, `zip`).
* `ApiClient.telephones` $\rightarrow$ Mapeado para `clients.phone` (Com limpeza de caracteres não numéricos).
* `ApiClient.email` $\rightarrow$ Mapeado para `clients.email` (Chave de login no Portal).

### 3.3. Passageiro: `ApiName` (ou `ApiNameTicket`) → `public.trip_passengers`
* `ApiName.id` $\rightarrow$ Gravado em `external_entity_links.external_id` (tipo `passenger`).
* `ApiName.fullName` $\rightarrow$ Mapeado para `trip_passengers.full_name`.
* `ApiName.document` $\rightarrow$ Mapeado para `trip_passengers.document`.
* `ApiName.birthDate` $\rightarrow$ Mapeado para `trip_passengers.birth_date`.
* `ApiName.gender` $\rightarrow$ Gravado nas notas do passageiro ou em coluna dedicada.
