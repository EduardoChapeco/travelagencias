# 00 — Auditoria Forense: Fluxos Atuais do TravelOS

> **Data:** 2026-06-19  
> **Auditor:** Antigravity (instrução PRD TRAVELOS_TRIP_LIFECYCLE_REARCHITECTURE_PRD.md §0)  
> **Status:** SOMENTE LEITURA — nenhuma alteração foi realizada

---

## Legenda de Classificação

| Símbolo         | Significado                                                |
| --------------- | ---------------------------------------------------------- |
| ✅ Real         | Persiste, é auditável, tem RLS, tem service tipado         |
| ⚠️ Parcial      | Existe na UI e/ou banco mas falta alguma camada crítica    |
| ❌ Fake/Ausente | Só UI, só banco sem serviço, mock ou completamente ausente |

---

## 1. Fase 9 — Rooming List

### 1.1 O que foi afirmado como feito

- Campo `rooming_list jsonb` adicionado à tabela `group_tours`
- Tela de alocação de quartos com arrastar/soltar
- Validação de fechamento do grupo

### 1.2 O que realmente existe

#### Banco de dados

- **Migration `20260623000004_group_tours_rooming_list.sql`**: Adiciona coluna `rooming_list jsonb NOT NULL DEFAULT '[]'` na tabela `group_tours`. A coluna existe.
- **Migration `20260619000001_boarding_rooming_list.sql`**: Cria uma segunda tabela normalizada `boarding_rooming_list` com `card_id`, `room_type`, `passengers jsonb`, RLS. Esta tabela existe **separada** de `group_tours`.

**Portanto: existem DUAS estruturas de rooming**, não uma:

1. `group_tours.rooming_list` (JSONB inline) — usada pela UI de group tours
2. `public.boarding_rooming_list` (tabela separada) — criada mas sem UI que a consuma

#### UI — `agency.$slug.group-tours.$id.tsx`

A aba "Rooming List" existe (linha 269-273) e possui:

- Adicionar quarto (room_number, room_type, hotel_name, checkin_date, checkout_date)
- Remover quarto
- Confirmar quarto (toggle `is_confirmed`)
- Alocar passageiro ao quarto com validação de capacidade
- Verificação de duplicidade de passageiro entre quartos
- Grid visual de quartos com barra de ocupação
- Checklist de fechamento no rodapé

#### Como persiste

A função `persistRooms` (linha ~1386) salva o array de quartos como JSONB na coluna `group_tours.rooming_list` via update direto no Supabase. **Não há service tipado** — é um `supabase.from('group_tours').update({ rooming_list })` inline no componente.

### 1.3 Auditoria por critério

| Critério PRD                                | Status     | Evidência                                                                 |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| Suporta hotéis múltiplos?                   | ⚠️ Parcial | Cada quarto tem `hotel_name` mas não é uma entidade separada              |
| Suporta datas diferentes por quarto?        | ✅ Real    | `checkin_date` / `checkout_date` por quarto                               |
| Suporta histórico?                          | ❌ Ausente | JSONB é sobrescrito, sem versionamento                                    |
| Suporta tipos de quarto?                    | ✅ Real    | single/double/triple/quad/suite + capacidade mapeada                      |
| Suporta capacidade?                         | ✅ Real    | `ROOM_CAPACITY` map valida antes de alocar                                |
| Suporta roommate desconhecido?              | ❌ Ausente | Todos os passageiros precisam existir                                     |
| Suporta conflito (mesmo pax em 2 quartos)?  | ✅ Real    | Verificação de duplicidade implementada                                   |
| Suporta drag and drop sem sobrescrever?     | ⚠️ Parcial | Não há DnD entre quartos; só select dropdown por quarto                   |
| Suporta auditoria?                          | ❌ Ausente | Nenhum audit log de mudanças de alocação                                  |
| Suporta exportação?                         | ❌ Ausente | Nenhum botão de exportação/PDF                                            |
| Suporta RLS?                                | ⚠️ Parcial | RLS existe na tabela `group_tours` mas o campo JSONB não tem RLS granular |
| Suporta atualização concorrente?            | ❌ Risco   | JSONB inteiro é sobrescrito; two writes concorrentes = perda de dados     |
| Tabela normalizada `boarding_rooming_list`? | ❌ Sem UI  | Tabela criada mas não há UI que a consuma                                 |

### 1.4 Classificação geral Fase 9

**⚠️ PARCIAL** — A UI funciona para casos simples, mas a estrutura JSONB é uma solução temporária com riscos de concorrência e sem histórico. A tabela normalizada criada na migration mais antiga está ociosa.

---

## 2. Fase 10 — Destination Intelligence

### 2.1 O que foi afirmado como feito

- Página admin de criação e revisão de destinos
- Toggle de publicação (reviewed_at)
- Portal do cliente filtrando apenas revisados
- Geração com IA (edge function)

### 2.2 O que realmente existe

#### Banco de dados

- **Tabela `destination_info`**: Existe com campos `destination`, `visa_required`, `safety_level`, `reviewed_at`, `reviewed_by`, etc.
- **Migration `20260623000005_destination_info_review.sql`**: Adiciona `reviewed_at timestamptz` e `reviewed_by uuid references auth.users(id)`.

#### UI Admin — `agency.$slug.destination-intelligence.tsx`

- Listagem de destinos com busca ✅
- Formulário completo de criação/edição ✅
- Botão de toggle de revisão que grava `reviewed_at` e `reviewed_by` ✅ (linha 361-368)
- Badge visual de "Publicado" vs "Rascunho" ✅
- Botão de geração com IA (chama edge function `destination-intelligence`) ✅

#### Portal do cliente — `client.trips.$id.tsx`

- Busca por "destination-intelligence" no arquivo: **0 resultados encontrados**
- O portal do cliente **não filtra por `reviewed_at`** — usa dados genéricos

#### Edge function `destination-intelligence`

- Existe em `supabase/functions/` (referenciada no código via `supabase.functions.invoke`)
- Não inspecionamos o conteúdo da edge function para confirmar funcionamento real

### 2.3 Auditoria por critério

| Critério PRD                          | Status     | Evidência                                                |
| ------------------------------------- | ---------- | -------------------------------------------------------- |
| Página admin existe?                  | ✅ Real    | `agency.$slug.destination-intelligence.tsx`              |
| Review status persiste?               | ✅ Real    | Update de `reviewed_at` + `reviewed_by` no banco         |
| Portal filtra apenas revisados?       | ❌ Ausente | `client.trips.$id.tsx` não referencia `destination_info` |
| Fontes são registradas?               | ❌ Ausente | Nenhum campo `source` ou `source_url`                    |
| Validade/expiração existe?            | ❌ Ausente | Nenhum campo `expires_at` ou `valid_until`               |
| Dados são editáveis?                  | ✅ Real    | Formulário de edição completo                            |
| Risco de informação desatualizada?    | ⚠️ Alto    | Sem expiração, dado de IA pode ficar obsoleto            |
| Vínculo com destinos reais da viagem? | ❌ Ausente | `destination_info` não referencia `trips.destination`    |
| Histórico de revisão?                 | ❌ Ausente | Apenas `reviewed_at` (timestamp único, sem log)          |

### 2.4 Classificação geral Fase 10

**⚠️ PARCIAL** — O admin funciona e a revisão persiste, mas o portal do cliente **não consome `destination_info`**. A feature não fecha o ciclo ponta a ponta.

---

## 3. Fase 11 — Conferência de Voos

### 3.1 O que foi afirmado como feito

- Widget de próximos 60 dias no dashboard
- Aba "Conferência de Voos" dentro de Vouchers
- Edição de status e PNR por bilhete

### 3.2 O que realmente existe

#### Banco de dados

- **Tabela `boarding_tickets`**: criada em `20260623000002_boarding_operational_upgrade.sql` com campos: `kind` (airline/show/attraction/...), `ticket_code`, `passenger_name`, `date_time`, `venue`, `seat`, `status`, `notes`, `extracted_data jsonb`, `file_url`.
- **RLS**: Existe para `boarding_tickets` (select/insert/update/delete por `is_agency_member`)
- Bucket `boarding-tickets` criado no storage

#### UI — `agency.$slug.vouchers.tsx` (aba `flight_audit`)

- Query filtrando `boarding_tickets` por `kind = 'flight'` e `date_time` dentro de 60 dias ✅
- Lista com edição inline de `ticket_code`, `status`, `notes`, `seat` ✅
- Mutação `updateTicketMut` que persiste no banco ✅
- Busca e filtro de status ✅

#### UI — `agency.$slug.index.tsx`

- Widget "Conferência de voos (60 dias)" no dashboard ✅

### 3.3 Auditoria crítica — o que está errado

| Item                                         | Status        | Evidência                                                     |
| -------------------------------------------- | ------------- | ------------------------------------------------------------- |
| E-mail automático para operadora?            | ❌ Ausente    | Nenhum código encontrado                                      |
| Ticket/caso de alteração?                    | ❌ Ausente    | Nenhuma tabela de `flight_change_cases`                       |
| Comparação de malha (voo original vs atual)? | ❌ Ausente    | Não há duas versões de itinerário                             |
| Upload de e-mail/print/PDF com horários?     | ❌ Ausente    | Nenhum formulário de upload                                   |
| OCR de alternativas?                         | ❌ Ausente    | Nenhuma integração                                            |
| Diff entre voo original e sugerido?          | ❌ Ausente    | Nenhum engine de comparação                                   |
| Badges de impacto (pernoite, conexão longa)? | ❌ Ausente    | Nenhuma lógica determinística                                 |
| Aceite do cliente no portal?                 | ❌ Ausente    | Portal não exibe alterações aéreas                            |
| Reacomodação?                                | ❌ Ausente    | Nenhuma entidade ou UI                                        |
| Confirmação da operadora?                    | ❌ Ausente    | Nenhum fluxo                                                  |
| Histórico de itinerários?                    | ❌ Ausente    | `boarding_tickets` é linha única, sem versões                 |
| Agenda mensal de conferências?               | ❌ Ausente    |                                                               |
| A aba está erroneamente em Vouchers?         | ✅ Confirmado | "✈️ Conferência de Voos" é aba de `agency.$slug.vouchers.tsx` |

### 3.4 Classificação por item (formato PRD §4.3)

| Item                                   | Classificação         |
| -------------------------------------- | --------------------- |
| Fila de 60 dias                        | ✅ Real (limitado)    |
| Edição de status/PNR/notas por bilhete | ✅ Real               |
| E-mail para operadora                  | ❌ Ausente            |
| Ticket/caso de alteração               | ❌ Ausente            |
| Comparação de malha                    | ❌ Ausente            |
| Upload de horários                     | ❌ Ausente            |
| OCR                                    | ❌ Ausente            |
| Diff original vs sugerido              | ❌ Ausente            |
| Aceite do cliente                      | ❌ Ausente            |
| Reacomodação                           | ❌ Ausente            |
| Confirmação da operadora               | ❌ Ausente            |
| Histórico/versionamento de itinerário  | ❌ Ausente            |
| Agenda mensal                          | ❌ Ausente            |
| Localização (está em Vouchers)         | ❌ Arquitetura Errada |

### 3.5 Classificação geral Fase 11

**❌ FAKE/PARCIAL** — O que existe é uma fila de edição de bilhetes individuais. A "conferência de voos" é apenas uma lista editável sem nenhuma automação, comparação, fluxo de reacomodação ou aceite do cliente. O conceito está arquiteturalmente mal posicionado (dentro de Vouchers).

---

## 4. Diagnóstico Estrutural da Navegação Atual

### 4.1 Sidebar global atual

```
Dashboard
Dia a Dia: [Meu Dia, Agenda, Conversas]
Vendas & CRM: [CRM, Propostas, Contratos]
Operações & Viagens: [Roteiros em Grupo, Viagens, Embarques, Vouchers, Frota & Ônibus]
Clientes & Parceiros: [Clientes, Corporativo, Fornecedores]
Financeiro
Suporte & Vistos: [Suporte, Vistos, Destination Intelligence (admin)]
Site & Marketing: [Site da Agência, Monitor de Concorrentes]
Gestão (admin): [Produtividade, Empresa, Equipe, Identidade, Design System, Conexões, Assinatura, Configurações]
```

**Problemas confirmados:**

- "Embarques" e "Vouchers" são itens globais independentes na sidebar
- "Destination Intelligence" está em "Suporte & Vistos", sem vínculo com Viagens
- "Contratos" está em "Vendas & CRM", sem vínculo contextual com a viagem
- "Roteiros em Grupo" é separado de "Viagens" (dois domínios paralelos)

### 4.2 Sub-navegação de Viagem (`agency.$slug.trips.$id.tsx`)

Abas disponíveis dentro de uma viagem:

1. Visão Geral
2. Financeiro
3. Passageiros
4. Vouchers
5. Contrato Jurídico

**Ausentes:**

- Aéreos / Conferência de Voos
- Reacomodações
- Check-in & Embarque
- Confirmação de Reserva
- Rooming List
- Hospedagem
- Transfers
- Destino & Segurança
- Comunicação/Tickets

### 4.3 Status dos fluxos do portal do cliente

Rota: `client.trips.$id.tsx` (94KB — maior arquivo do projeto)

Possui:

- Visão geral da viagem ✅
- Voos da viagem (boarding pass visual) ✅ (linha 941)
- Localizador e Voos ✅ (linha 453)
- Contrato (link) ✅

**Ausentes:**

- Alterações de Voo / Reacomodação
- Aceite de alternativa
- Status de confirmação da operadora
- Destino & Segurança (não consome `destination_info`)

---

## 5. Sumário Executivo

| Fase                               | Afirmação                                | Realidade                                                                     | Classificação |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- | ------------- |
| Fase 9 — Rooming List              | UI + migration + validação de fechamento | UI funciona, JSONB sem histórico/concorrência, tabela normalizada ociosa      | ⚠️ PARCIAL    |
| Fase 10 — Destination Intelligence | Admin + revisão + portal filtrado        | Admin OK, portal NÃO consome `destination_info`                               | ⚠️ PARCIAL    |
| Fase 11 — Conferência de Voos      | Widget + aba + edição de status          | Lista editável sem fluxo, sem automação, posicionada erroneamente em Vouchers | ❌ FAKE       |

**Nenhuma das três fases atende aos critérios anti-fake definidos no PRD §23.**
