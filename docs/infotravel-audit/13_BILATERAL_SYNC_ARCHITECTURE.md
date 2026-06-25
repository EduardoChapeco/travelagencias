# 13. Arquitetura de Sincronização Bilateral e Fila de Mensagens

Este documento detalha o design de software para o mecanismo de sincronização bilateral entre o **TravelOS** e a API **Infotravel/Infotera**, definindo as lógicas de controle, controle de concorrência, retentativas e tratamento de conflitos cadastrais.

---

## 1. Classificação de Capacidades de Escrita e Leitura

Antes de desenhar o sincronismo, classificamos o suporte físico da API com base no inventário oficial para evitar falsas promessas de "tempo real bilateral" onde a API só permite consulta:

* **Sincronização de Leitura (Infotravel $\rightarrow$ TravelOS)**:
  * *Reservas, Passageiros, Invoices, Contratos*: Totalmente suportados via consultas incrementais (`GET /api/v1/booking/{id}` e `/api/v1/backoffice/booking/search`).
* **Sincronização de Escrita (TravelOS $\rightarrow$ Infotravel)**:
  * *Criação de Reservas*: Suportada via `POST /api/v1/booking`.
  * *Confirmação/Cancelamento*: Suportados via `POST /api/v1/booking/{id}/confirm` e `DELETE /api/v1/booking/{id}/cancel`.
  * *Atualização de Passageiros*: Parcialmente suportada via `PUT /api/v1/product/transfer/{id}` e similares.
  * *Contabilidade e Fluxo de Caixa*: **Leitura apenas**. A API não possui endpoints para o TravelOS enviar dados de fluxo de caixa local para o banco da Infotravel. Apenas importamos os lançamentos de caixa da operadora.
  * *Cadastro de Clientes*: Parcialmente suportado via `POST /api/v1/user/register` e `PUT /api/v1/user/{userId}`.

---

## 2. Arquitetura de Filas e Tabelas no PostgreSQL

Para gerenciar o sincronismo de forma assíncrona, robusta e tolerante a falhas, propõe-se a criação de 4 tabelas de controle no banco de dados:

```sql
-- Fila de Entrada: Mensagens/Eventos vindos da API ou Polling
CREATE TABLE IF NOT EXISTS public.sync_inbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type    text NOT NULL, -- booking, client, invoice
  external_id    text NOT NULL,
  payload        jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'conflict')),
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

-- Fila de Saída: Mutações locais a serem enviadas à API
CREATE TABLE IF NOT EXISTS public.sync_outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type    text NOT NULL,
  internal_id    uuid NOT NULL,
  action         text NOT NULL, -- create_booking, cancel_booking, update_pax
  payload        jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts       int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Histórico de Tentativas e Auditoria de Sync
CREATE TABLE IF NOT EXISTS public.sync_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id      uuid REFERENCES public.sync_outbox(id) ON DELETE CASCADE,
  inbox_id       uuid REFERENCES public.sync_inbox(id) ON DELETE CASCADE,
  status_code    int,
  response_body  text,
  duration_ms    int,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Fila de Conflitos para Decisão Humana
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type    text NOT NULL,
  external_id    text NOT NULL,
  internal_id    uuid NOT NULL,
  field_name     text NOT NULL, -- ex: email, phone, cpf
  external_value text,
  internal_value text,
  resolved_at    timestamptz,
  resolved_by    uuid REFERENCES public.profiles(id),
  resolution     text CHECK (resolution IN ('use_internal', 'use_external')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. Lógica de Polling Incremental, Retries e Resiliência
* **Polling de Entrada (Sem Webhooks)**:
  Como a API do Infotravel não fornece webhooks nativos para notificar alterações nas reservas, o TravelOS implementará um mecanismo de **Polling Incremental**. A cada 15 minutos, um worker executa uma busca na API (`GET /api/v1/backoffice/booking/search`) com a janela temporal correspondente aos últimos 30 minutos (garantindo sobreposição para evitar perdas). O cursor de data (`last_successful_sync_at`) é salvo em `public.sync_checkpoints`.
* **Políticas de Retentativa com Exponential Backoff**:
  Falhas temporárias de rede ao enviar mutações (`sync_outbox`) são tratadas automaticamente pelo worker. A cada falha, o tempo para a próxima tentativa é recalculado usando a fórmula de **Atraso Exponencial**:
  $$\text{Atraso} = 2^{\text{attempts}} \times 30\text{ segundos} + \text{jitter}$$
  O limite máximo é configurado em **5 tentativas**. Após a 5ª falha consecutiva, o registro é movido para status `failed` e entra em alerta no Monitor de Sync para intervenção humana.
* **Circuit Breaker e Throttling**:
  O worker respeita a taxa de requisições configurada. Se receber erros `429` consecutivos da API Infotravel, a fila é pausada temporariamente para evitar o banimento do IP da agência.
