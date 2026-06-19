# 03 — Plano Master de Reorganização do Ciclo de Vida da Viagem

> **Data:** 2026-06-19  
> **Status:** AGUARDANDO AUTORIZAÇÃO — nenhuma implementação foi iniciada  
> **Baseado em:** PRD `TRAVELOS_TRIP_LIFECYCLE_REARCHITECTURE_PRD.md` v1.0-master

---

## Premissas do Plano

1. Nenhuma tabela, rota ou migration existente será removida sem plano de compatibilidade.
2. Toda refatoração deve ter rollback documentado.
3. `group_tours` não será removido enquanto não houver migração completa para `trips`.
4. `boarding_cards` e `boarding_tickets` serão mantidos e reaproveitados sob nova arquitetura.
5. Os 5 estados atuais de `trips.status` serão preservados e expandidos — não substituídos.
6. Nenhum dado do cliente ou da agência será perdido.
7. Sem deploy, commit ou migration até autorização explícita por fase.

---

## Visão da Arquitetura Final

```
VIAGEM (trips)
├── Reserva                       (dados da reserva + localizadores)
├── Passageiros                   (trip_passengers — já existe)
├── Pagamentos                    (payment_plans + payment_installments — já existem)
├── Contrato                      (contracts — já existe, mover para contexto)
├── Confirmação de Reserva        (NOVO — trip_documents tipo reservation_confirmation)
├── Serviços                      (trips.services + transfere dados de proposals)
├── Aéreos                        (NOVO — flight_itineraries + flight_segments)
│   ├── Versão original
│   ├── Versão sugerida pela operadora
│   └── Versão confirmada
├── Casos de Reacomodação         (NOVO — flight_change_cases)
│   ├── Alternativas              (flight_alternatives + flight_difference_analysis)
│   ├── Decisão do Cliente        (customer_travel_decisions)
│   ├── Comunicação Operadora     (operator_reaccommodation_requests)
│   └── Adendo Contratual         (contract_amendments)
├── Hospedagem                    (boarding_cards.hotel_* — mover/estender)
├── Rooming List                  (group_tours.rooming_list → modelo normalizado)
├── Transfers                     (boarding_cards.transfer_* — mover/estender)
├── Check-in                      (NOVO — checkin_links registry)
├── Embarque                      (boarding_cards — reposicionado como etapa da viagem)
│   └── Eventos de Boarding       (NOVO — boarding_events por passageiro)
├── Voucher                       (vouchers — já existe, reposicionado)
├── Guia de Embarque              (NOVO — trip_documents tipo boarding_guide)
├── Destino & Segurança           (destination_info — vincular a trips)
├── Tickets/Suporte               (support_tickets — já existe, vincular a trips)
├── Portal do Cliente             (client.trips.$id — expandir)
└── Histórico/Auditoria           (NOVO — trip_events log)
```

---

## Fase 0 — Preparação: Auditoria e Documentação

**Status:** ✅ Concluída (este conjunto de documentos)

**Entregáveis:**

- [x] `docs/trip-rearchitecture/00_AUDITORIA_FLUXOS_ATUAIS.md`
- [x] `docs/trip-rearchitecture/01_MAPA_ENTIDADES_ROTAS.md`
- [x] `docs/trip-rearchitecture/02_GAPS_FASES_9_10_11.md`
- [x] `docs/trip-rearchitecture/03_PLANO_MASTER.md` (este arquivo)

---

## Fase 1 — Arquitetura de Navegação (Sidebar + Trip Context)

**Objetivo:** Reorganizar a sidebar e a sub-navegação da viagem sem quebrar rotas existentes.

**Problema:** Embarques, Vouchers, Destination Intelligence e Contratos são itens globais isolados. Grupos é domínio paralelo. A viagem tem apenas 5 abas.

**Arquivos afetados:**

- `src/components/shell/AppSidebar.tsx`
- `src/routes/agency.$slug.tsx`
- `src/routes/agency.$slug.trips.$id.tsx`
- Criação de redirects para rotas antigas

**Mudanças na sidebar:**

```
ANTES: Embarques | Vouchers (itens globais separados)
DEPOIS:
  Viagens
    ├── Todas as Viagens
    ├── Próximas Saídas
    ├── Aéreos & Conferência   (visão global)
    ├── Check-in & Embarques   (visão global)
    └── Documentos & Vouchers  (visão global)
  Grupos (atalho, redireciona para /trips?type=group)
```

**Mudanças na sub-navegação da viagem (`trips.$id`):**

```
Visão Geral | Passageiros | Financeiro | Aéreos | Hospedagem |
Contrato | Confirmação | Voucher | Check-in & Embarque |
Destino & Segurança | Suporte | Histórico
```

**Compatibilidade:**

- `/agency/:slug/boarding` → redirect para `/agency/:slug/trips/boarding`
- `/agency/:slug/vouchers` → redirect para `/agency/:slug/trips/documents`
- Nenhum link externo quebrado (magic links permanecem)

**Critério de pronto:**

- Build passa sem erros
- Todas as rotas antigas redirecionam corretamente
- Sub-navegação da viagem exibe as novas abas (mesmo que vazias inicialmente)
- Não há itens `Embarques` ou `Vouchers` como globais isolados na sidebar

---

## Fase 2 — Trip Aggregate: Schema e Services

**Objetivo:** Consolidar o schema de Viagem e criar services tipados.

**Problema:** `trips` tem campos ausentes, `group_tours` é entidade paralela, services são fragmentados.

**Tabelas — sem criar novas antes de mapear:**

```sql
-- Extensão de trips (campos a adicionar)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS
  trip_type text DEFAULT 'individual'   -- individual | group | corporate
  lifecycle_status text DEFAULT 'draft' -- 14 estados do PRD
  group_tour_id uuid REFERENCES group_tours(id)  -- adapter temporário
  booking_reference text
  assigned_agent_id uuid REFERENCES auth.users(id)
  portal_enabled boolean DEFAULT true
  archived_at timestamptz;

-- Novos índices
CREATE INDEX trips_lifecycle_status_idx ON trips(lifecycle_status, agency_id);
CREATE INDEX trips_type_idx ON trips(trip_type, agency_id);
```

**Services a criar:**

- `src/services/trip-aggregate.ts` — tipo `TripAggregate` e queries completas
- `src/services/rooming.ts` — abstraindo acesso ao JSONB e futura tabela normalizada

**Compatibilidade:**

- `trips.status` existente preservado (adapter entre status antigo e `lifecycle_status`)
- `group_tours` mantido com `group_tour_id` em trips como ponte temporária

**Critério de pronto:**

- TypeScript compila sem erros
- `TripAggregate` type cobre todos os campos da viagem
- Queries usam service, não acesso direto inline nos componentes

---

## Fase 3 — Confirmação de Reserva

**Objetivo:** Criar o artefato "Confirmação de Reserva" que é gerado automaticamente após conversão de proposta → viagem.

**Problema:** Não existe. O cliente não recebe nenhuma confirmação formal que não seja a proposta.

**Tabelas:**

```sql
CREATE TABLE trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  document_type text NOT NULL,  -- reservation_confirmation | contract | voucher | boarding_guide | ...
  template_id uuid REFERENCES document_templates(id),
  template_version int DEFAULT 1,
  data_snapshot jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',  -- draft | published | archived
  preview_url text,
  pdf_url text,
  public_token text UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  generated_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

**UI:**

- Sub-rota `/agency/:slug/trips/:id/confirmation`
- Builder com blocos: capa, resumo, passageiros, aéreo, hotel, pagamentos, próximos passos, portal
- Preview em iframe
- Geração de PDF
- Link público seguro
- Portal do cliente mostra "Confirmação de Reserva" ao acessar a viagem

**Critério de pronto:**

- Toda viagem criada gera automaticamente uma `trip_documents` do tipo `reservation_confirmation`
- Admin pode editar e publicar
- Cliente vê no portal (link ou iframe)
- Audit log registra geração e envio

---

## Fase 4 — Reconciliação Aérea

**Objetivo:** Criar o fluxo real de conferência e reconciliação de itinerários aéreos, saindo de Vouchers e entrando em Viagens.

**Problema:** O que existe hoje é uma lista editável de bilhetes. Não há versionamento de itinerários, diff, upload ou fluxo.

**Tabelas:**

```sql
CREATE TABLE flight_itineraries (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  agency_id uuid REFERENCES agencies(id),
  version int NOT NULL DEFAULT 1,
  type text NOT NULL,  -- original | operator_suggestion | customer_selected | confirmed
  status text NOT NULL DEFAULT 'draft',
  source text,  -- manual | ocr | import
  source_document_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE flight_segments (
  id uuid PRIMARY KEY,
  itinerary_id uuid REFERENCES flight_itineraries(id),
  segment_order int NOT NULL DEFAULT 1,
  airline_code text,
  flight_number text,
  origin_iata text,
  destination_iata text,
  departure_at timestamptz,
  arrival_at timestamptz,
  cabin text,
  baggage text,
  record_locator text,
  airport_terminal text,
  status text DEFAULT 'scheduled',
  raw_source jsonb DEFAULT '{}'
);
```

**Fontes de entrada (§8.2):**

- Colar texto
- Upload de PDF/imagem/print/e-mail
- OCR (edge function)
- Cadastro manual

**Diff engine (determinístico §8.4):**

- Comparar segmentos por posição
- Detectar: data diferente, horário diferente, aeroporto diferente, pernoite, layover longo, conexão curta, bagagem diferente

**UI:**

- `/agency/:slug/trips/:id/flights` — itinerário vigente + versões
- `/agency/:slug/trips/:id/flights/new-case` — abrir caso de alteração
- `/agency/:slug/trips/flights` — fila global de voos (próximos 60 dias, substituindo aba atual em Vouchers)

**Compatibilidade:**

- `boarding_tickets (kind=flight)` permanece para conferência individual de bilhetes
- Nova tabela `flight_segments` para versões do itinerário
- Aba em Vouchers recebe redirect para nova rota

**Critério de pronto (PRD §23):**

- Upload persiste em storage
- OCR extrai e salva no banco
- Diff é calculado deterministicamente
- UI exibe diffs com badges
- Audit log registra cada ação

---

## Fase 5 — Reacomodação e Aceite do Cliente

**Objetivo:** Criar workflow completo de reacomodação: alternativas → agente revisa → cliente escolhe → aceite auditável → adendo.

**Tabelas:**

```sql
CREATE TABLE flight_change_cases (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  original_itinerary_id uuid REFERENCES flight_itineraries(id),
  change_reason text,
  detected_at timestamptz DEFAULT now(),
  detected_by uuid REFERENCES auth.users(id),
  workflow_status text DEFAULT 'change_detected',
  priority text DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz
);

CREATE TABLE flight_alternatives (
  id uuid PRIMARY KEY,
  change_case_id uuid REFERENCES flight_change_cases(id),
  itinerary_id uuid REFERENCES flight_itineraries(id),
  source text,
  ranking int DEFAULT 1,
  availability_status text DEFAULT 'unknown',
  customer_visible boolean DEFAULT false,
  expires_at timestamptz
);

CREATE TABLE flight_difference_analysis (
  id uuid PRIMARY KEY,
  original_itinerary_id uuid REFERENCES flight_itineraries(id),
  alternative_itinerary_id uuid REFERENCES flight_itineraries(id),
  date_changed boolean DEFAULT false,
  time_changed boolean DEFAULT false,
  airport_changed boolean DEFAULT false,
  overnight_connection boolean DEFAULT false,
  total_duration_delta_minutes int,
  layover_delta_minutes int,
  segment_count_delta int,
  baggage_changed boolean DEFAULT false,
  cabin_changed boolean DEFAULT false,
  risk_score int DEFAULT 0,
  warnings text[],
  ai_summary text,
  deterministic_summary text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

CREATE TABLE customer_travel_decisions (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  change_case_id uuid REFERENCES flight_change_cases(id),
  selected_alternative_id uuid REFERENCES flight_alternatives(id),
  decision_status text DEFAULT 'pending',
  decision_text_snapshot text,
  disclosures_snapshot text[],
  accepted_at timestamptz,
  typed_name text,
  otp_verified_at timestamptz,
  ip_address text,
  user_agent text,
  signature_hash text,
  portal_session_id text
);
```

**Portal do cliente:**

- `/client/trips/:id/flight-change/:caseId` — página de escolha
- Exibe: motivo, original, alternativas, diffs, avisos
- Aceite com nome digitado + checkbox + data/hora

**Critério de pronto:**

- Aceite é auditável com todos os campos de evidência
- Adendo é gerado em PDF
- Status do portal mostra estado inteligível (não jargão interno)

---

## Fase 6 — Comunicação com Operadora

**Objetivo:** Após aceite do cliente, criar fluxo de comunicação com operadora até confirmação/rejeição.

**Tabelas:**

```sql
CREATE TABLE operator_reaccommodation_requests (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  change_case_id uuid REFERENCES flight_change_cases(id),
  customer_decision_id uuid REFERENCES customer_travel_decisions(id),
  operator_id uuid REFERENCES suppliers(id),
  status text DEFAULT 'pending',
  email_thread_id text,
  requested_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  response_snapshot jsonb,
  confirmed_itinerary_id uuid REFERENCES flight_itineraries(id)
);
```

**UI:**

- Rascunho de e-mail gerado automaticamente após aceite
- Agente revisa e envia
- Thread de respostas (manuais ou integradas)
- Agente registra confirmação ou rejeição
- Se confirmado: propaga mudanças para viagem + portal + documentos

**Critério de pronto:**

- Confirmação atualiza `trips.lifecycle_status`
- Portal mostra "Novo voo confirmado"
- Voucher/guia marcados como "desatualizados"

---

## Fase 7 — Check-in e Embarque

**Objetivo:** Criar registry versionado de deep links de check-in e posicionar Embarque como etapa final do fluxo da viagem.

**Tabelas:**

```sql
CREATE TABLE checkin_links (
  id uuid PRIMARY KEY,
  flight_segment_id uuid REFERENCES flight_segments(id),
  agency_id uuid REFERENCES agencies(id),
  provider text,  -- latam | gol | azul | ...
  link_type text,  -- web_checkin | app_checkin | third_party
  generated_url text,
  raw_url text,
  parameters jsonb DEFAULT '{}',
  validation_status text DEFAULT 'unverified',
  last_verified_at timestamptz,
  expires_at timestamptz,
  source text
);

CREATE TABLE boarding_events (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  traveler_id uuid REFERENCES trip_passengers(id),
  flight_segment_id uuid REFERENCES flight_segments(id),
  event_type text,  -- checked_in | boarded | no_show | issue
  status text,
  occurred_at timestamptz DEFAULT now(),
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'
);
```

**AirlineDeepLinkRegistry:**

- Admin pode cadastrar e atualizar URLs por companhia
- Health check periódico valida domínios
- Override manual por bilhete
- Fallback URL quando padrão indisponível

**UI:**

- `/agency/:slug/trips/:id/boarding` — nova sub-rota (substitui módulo global para contexto)
- `/agency/:slug/trips/boarding` — fila global (mantida para visão operacional)
- O Kanban atual de `boarding_cards` é reaproveitado e reposicionado

**Critério de pronto:**

- Deep links gerados por segmento de voo confirmado
- Eventos de embarque persistem por passageiro
- Portal mostra status de check-in e embarque

---

## Fase 8 — Contratos e Templates

**Objetivo:** Mover Contratos para contexto de Viagem, criar library de templates com cláusulas versionadas e suporte a adendos estruturados.

**Baseado em:** Tabelas `contracts`, `contract_addendums`, `contract_clauses` (já existem parcialmente).

**Mudanças:**

- Contratos acessíveis global E contextualmente (sub-rota da viagem)
- Adendos de itinerário vinculados a `flight_change_cases`
- Templates com `locked_blocks` para cláusulas blindadas
- Seções dinâmicas via IA com revisão humana obrigatória
- Versionamento de cláusulas com `LegalRuleRegistry`

**Critério de pronto:**

- Geração de adendo automaticamente após aceite de reacomodação
- Cláusulas blindadas não editáveis por agentes sem permissão
- Snapshot imutável salvo por contrato

---

## Fase 9 (nova numeração) — Voucher Final e Documentos

**Objetivo:** Reposicionar Voucher como documento final da viagem, criar Guia de Embarque como documento separado.

**Mudanças:**

- `vouchers` permanece mas é acessado via `/trips/:id/voucher`
- Guia de Embarque gerado como `trip_documents (tipo = boarding_guide)`
- Consome dados confirmados: itinerário `type = confirmed`, hotel, transfer, checkin_links, destination_info
- Versionado: mudanças na viagem marcam documento como "desatualizado"

**Critério de pronto:**

- Voucher consome dados confirmados (não editáveis retroativamente)
- Guia de Embarque inclui: flight cards, check-in links, hotel, transfer, destino, emergência
- Ambos disponíveis no portal do cliente

---

## Fase 10 (nova numeração) — Grupos e Rooming

**Objetivo:** Convergir `group_tours` para `trips (trip_type = group)` e migrar rooming para modelo normalizado.

**Estratégia de migração:**

```
ANTES: group_tours.rooming_list jsonb
DEPOIS: trip_rooming_rooms + trip_rooming_occupants (tabelas normalizadas)

Adapter: função que lê JSONB e retorna no novo formato enquanto migração ocorre
```

**Tabelas:**

```sql
CREATE TABLE trip_rooming_rooms (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  agency_id uuid REFERENCES agencies(id),
  room_identifier text NOT NULL,
  room_type text NOT NULL,
  hotel_supplier_id uuid REFERENCES suppliers(id),
  hotel_name text,
  checkin_date date,
  checkout_date date,
  capacity int NOT NULL DEFAULT 2,
  status text DEFAULT 'pending',
  notes text,
  is_confirmed boolean DEFAULT false,
  order_index int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE trip_rooming_occupants (
  id uuid PRIMARY KEY,
  room_id uuid REFERENCES trip_rooming_rooms(id),
  traveler_id uuid REFERENCES trip_passengers(id),
  trip_id uuid REFERENCES trips(id),
  agency_id uuid REFERENCES agencies(id),
  is_confirmed boolean DEFAULT false,
  preferences text,
  restrictions text,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id)
);

-- Audit log de alocação
CREATE TABLE trip_rooming_events (
  id uuid PRIMARY KEY,
  room_id uuid REFERENCES trip_rooming_rooms(id),
  event_type text,  -- assigned | removed | room_created | room_confirmed
  traveler_id uuid,
  actor_id uuid REFERENCES auth.users(id),
  occurred_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);
```

**Critério de pronto:**

- Dados do JSONB migrados para tabela normalizada sem perda
- UI de rooming opera sobre nova tabela
- Histórico de alocação registrado
- Exportação PDF/CSV disponível

---

## Fase 11 (nova numeração) — Destination Intelligence e Segurança

**Objetivo:** Vincular `destination_info` às viagens e fazer o portal do cliente consumir.

**Mudanças:**

- Adicionar `source`, `expires_at`, `confidence_level` a `destination_info`
- Criar `destination_review_logs`
- Vincular a `trips.destination` (match fuzzy)
- Portal filtra por `reviewed_at IS NOT NULL`
- Sub-rota `/trips/:id/destination` consome dados

**Critério de pronto:**

- Portal exibe dados de destino revisados
- Guia de embarque inclui seção de destino
- Admin vê aviso de destinos com dados expirados

---

## Fase 12 (nova numeração) — QA, Performance e Migração Visual

**Objetivo:** Garantir que build, typecheck, lint e tests passam. Auditar performance.

**Itens:**

- `npm run typecheck` — 0 erros
- `npm run lint` — 0 erros
- `npm run build` — build bem-sucedida com chunking otimizado
- Auditoria de imports: lazy loading para templates pesados
- Remoção de `any` e casts desnecessários
- Sem shadows no design system (`shadow-none` global)
- Light Editorial SaaS: tipografia, bordas finas, sem sombras
- Responsividade mobile de todas as novas telas
- RLS testado para cada nova tabela

---

## Critérios Anti-Fake (PRD §23)

Nenhuma fase é considerada concluída se:

- [ ] Só criou aba sem dados reais
- [ ] Só criou migration sem service
- [ ] Não tem RLS
- [ ] Não tem loading/error state
- [ ] Não persiste no banco
- [ ] Não propaga para portal
- [ ] Não versiona documentos
- [ ] Depende de mock ou hardcode
- [ ] Não possui audit log para ação sensível

---

## Prioridades de Execução

| Ordem | Fase                            | Justificativa                                              |
| ----- | ------------------------------- | ---------------------------------------------------------- |
| 1     | Fase 1 — Navegação              | Sem quebrar nada, reorganiza a UX para as próximas fases   |
| 2     | Fase 2 — Trip Aggregate         | Base para todas as outras fases                            |
| 3     | Fase 3 — Confirmação de Reserva | Alto valor para cliente, sem dependências complexas        |
| 4     | Fase 10 — Rooming (parte)       | Corrigir gap crítico da Fase 9 (JSONB) antes de mais JSONB |
| 5     | Fase 11 — Destination (portal)  | Corrigir gap crítico da Fase 10 (portal não consome)       |
| 6     | Fase 4 — Reconciliação Aérea    | Maior complexidade, foundation para Fase 5                 |
| 7     | Fase 5 — Reacomodação + Aceite  | Depende de Fase 4                                          |
| 8     | Fase 6 — Operadora              | Depende de Fase 5                                          |
| 9     | Fase 7 — Check-in e Embarque    | Pode ocorrer em paralelo com 4-6                           |
| 10    | Fase 8 — Contratos              | Relativamente autônoma                                     |
| 11    | Fase 9 — Voucher e Guia         | Depende de Aéreos confirmados                              |
| 12    | Fase 12 — QA Final              | Última etapa                                               |

---

## Decisões Tomadas pelo Usuário — 2026-06-19

> ✅ **Todas as decisões respondidas. Plano pronto para execução mediante autorização.**

### Decisão 1 — Grupos vs Trips
**Decisão: Grupos permanecem como domínio próprio e rico (não convergem para `trips`).**

Grupos são complexos (terrestre, aéreo, cruzeiro, combinado) e possuem:
- Financeiro próprio
- Contratos próprios (gestão coletiva)
- Rooming List exclusiva para grupos (para enviar ao hotel, gerir quem fica com quem em qual quarto)

A Rooming List é **exclusiva de Grupos** — não existe em viagens individuais.

Arquitetura resultante:
- `group_tours` permanece como entidade separada e rica
- Sidebar: "Grupos" como item próprio com sub-navegação contextual completa
- Viagens individuais e grupos compartilham componentes de financeiro e contratos, mas são entidades distintas
- Rooming List vive em Grupos, não em Trips

---

### Decisão 2 — Rooming List: Normalizado
**Decisão: Migrar para tabela normalizada. Requisito mínimo: edição e geração de PDF da Rooming List.**

- Tabelas `group_rooming_rooms` + `group_rooming_occupants` (exclusivo de Grupos)
- Exportação em PDF A4 (lista para envio ao hotel)
- Histórico de alocação auditável
- Migração do JSONB existente com preservação de dados

---

### Decisão 3 — Sidebar: Refatoração Completa
**Decisão: Opção A — Refatoração total em uma única fase.**

A sidebar será reorganizada completamente com a nova arquitetura de domínios.

---

### Decisão 4 — Prioridade de Execução
**Decisão: A fase mais crítica primeiro.**

Ordem de execução confirmada:
1. **Fase 1 — Navegação** (pré-requisito para tudo)
2. **Fase 4 — Reconciliação Aérea** (classificada como Fake, maior gap crítico de negócio)
3. **Fase 9-Rooming e Fase 10-Destination** em seguida (estrutura parcial existente, gaps claros)

---

### Decisão 5 — Adendos Jurídicos
**Decisão: Adendos automáticos gerados pelo sistema quando cliente aceita reacomodação. Conteúdo configurável por agência.**

Conteúdo do adendo automático:
- Confirmação de que o cliente entendeu as regras declaradas
- Política de reembolso e crédito aplicável
- Multas e taxas aplicáveis ao caso
- Regras das companhias aéreas / hotéis envolvidos
- Cálculos de diferença tarifária
- Impactos identificados (hotel, transfer, outros serviços)

Regras de implementação:
- Texto base gerado pelo sistema com placeholders de dados reais da viagem
- Campo de upload para texto revisado por jurídico (cada agência cadastra sua versão)
- Versionamento obrigatório de toda cláusula jurídica
- O sistema **nunca usa texto de adendo sem versão aprovada cadastrada**
- Default seguro: texto genérico informativo que **não suprime direitos legais indisponíveis**

> **Aguardando resposta antes de implementar qualquer fase.**

1. **Grupos como especialização de Trips?**
   - Opção A: `group_tours` permanece como entidade separada com adapter em `trips`
   - Opção B: Migrar `group_tours` → `trips (trip_type = group)` com migration gradual
   - Opção C: Manter paralelo com sincronização bidirecional temporária
     (Sobre aqui, não enendi oque seria trips e group tours, como eu disse grupos são muito compeltos, pode ser terrestre, pode ser aéreo, pode ser cruzeiro, inclusive cruzeiro pode necessitar de onibus.. etc... e tdoas as viagens tem finacneiro proprio, tem contratos proprio (ges~tao) o roomlist é unica e xlcusivmente para grupos... para enviar ao hotel.... para eu editar quem fica com quem em que quarto etc... )

2. **Rooming List: JSONB ou normalizado?**
   - Opção A: Migrar imediatamente para tabela normalizada (mais correto, mais trabalho) faça oque vc achar melhor, desde que eu consiga editar e gerar pdf do roomiling lsit
   - Opção B: Manter JSONB com service tipado + exportação (mais rápido, débito técnico)

3. **Sidebar: reorganização completa ou incremental?**
   - Opção A: Refatoração total da sidebar e sub-navegação em uma única fase (isso)
   - Opção B: Adicionar novas abas gradualmente sem remover itens antigos ainda

4. **Fase de execução prioritária:** Qual fase deve ser iniciada primeiro após aprovação? a mais critica

5. **Acordos jurídicos:** Os textos de adendo e aceite devem ser redigidos por quem? O sistema precisa de campo para upload de texto revisado por jurídico. Os adendos automaticos são ex. quando o cliente aceita novos vboos, reaocmoação etc... adendo de que ele entendeu as regras declaradas sobre reembolso/crédito... multas/taxas... e regras das cias/hoteis... e calculos... etc...
