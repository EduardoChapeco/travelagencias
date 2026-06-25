# 02 — Gaps das Fases 9, 10 e 11 vs Nova Arquitetura

> **Data:** 2026-06-19  
> **Propósito:** Comparar o que foi implementado com o que a nova arquitetura exige

---

## Contexto

A auditoria forense (`00_AUDITORIA_FLUXOS_ATUAIS.md`) classificou:

- **Fase 9 (Rooming List):** ⚠️ Parcial
- **Fase 10 (Destination Intelligence):** ⚠️ Parcial
- **Fase 11 (Conferência de Voos):** ❌ Fake

O PRD master exige que esses módulos sejam integrados ao domínio central de `Viagem` e atendam a critérios de fluxo real, persistência, auditoria, propagação e portal.

---

## 1. Gaps — Fase 9 (Rooming List)

### 1.1 O que o PRD exige (§16)

```
Rooming List deve suportar:
- hotel, período, quarto, tipo, capacidade, ocupantes
- status, preferências, restrições
- histórico, exportação
- modelo definitivo normalizado
- migração do JSONB com preservação de dados
- DnD
- fechamento do grupo
```

### 1.2 Gaps identificados

| Gap                                    | Detalhe                                                                                         | Impacto                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------- |
| **Estrutura dual/conflitante**         | Existem `group_tours.rooming_list jsonb` E `boarding_rooming_list` (tabela). Qual é definitiva? | Alto — dados inconsistentes |
| **Sem histórico**                      | JSONB é sobrescrito sem versionamento. Uma alocação errada não é rastreável                     | Alto                        |
| **Sem auditoria**                      | Nenhum log de quem alocou quem e quando                                                         | Alto                        |
| **Sem exportação**                     | Não há geração de PDF/XLS da rooming list                                                       | Médio                       |
| **Sem hotéis múltiplos como entidade** | `hotel_name` é texto livre por quarto, não vincula a um fornecedor                              | Médio                       |
| **Sem roommate desconhecido**          | Não há suporte a quarto parcialmente alocado com "TBD"                                          | Baixo                       |
| **Sem DnD entre quartos**              | Passageiros são alocados por select dropdown, não por drag                                      | Baixo                       |
| **Sem concorrência segura**            | JSONB inteiro sobrescrito = risco de race condition                                             | Alto                        |
| **`boarding_rooming_list` sem UI**     | Tabela normalizada criada mas nunca usada                                                       | Desperdício                 |
| **Sem vínculo com `trips`**            | `group_tours` não é uma especialização de `trips` — são entidades separadas                     | Arquitetural                |

### 1.3 O que precisa ser feito (sem implementar agora)

1. **Decisão arquitetural**: manter JSONB temporariamente ou migrar para tabela normalizada?
2. Se normalizar: criar tabela `trip_rooming_rooms` + `trip_rooming_occupants` (reutilizando `boarding_rooming_list` ou criando nova)
3. Migrar dados existentes do JSONB para tabela
4. Criar service tipado `rooming.ts`
5. Criar UI com histórico e auditoria
6. Vincular ao domínio `trips` (Grupos = `trip_type = 'group'`)

---

## 2. Gaps — Fase 10 (Destination Intelligence)

### 2.1 O que o PRD exige (§11 Destination/Safety)

```
Destination Intelligence deve:
- vincular a destinos reais das viagens
- ser filtrado no portal por reviewed_at
- ter fonte registrada e validade
- ter histórico de revisão
- alimentar Guia de Embarque
- alimentar seções da Confirmação de Reserva
- ser administrável por agência (não apenas global)
```

### 2.2 Gaps identificados

| Gap                                           | Detalhe                                                                         | Impacto                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Portal não consome destination_info**       | `client.trips.$id.tsx` não faz nenhuma query para `destination_info`            | Alto — a feature principal não funciona ponta a ponta |
| **Sem vínculo com trips.destination**         | `destination_info.destination` é texto livre, não há FK para trips              | Alto                                                  |
| **Sem source/expires_at**                     | Informação de IA pode ficar desatualizada indefinidamente                       | Alto                                                  |
| **Sem histórico de revisão**                  | `reviewed_at` é timestamp único — sem log de quem revisou o quê e quando        | Médio                                                 |
| **Sem escopo por agência**                    | `destination_info` parece ser global, não por agência                           | Médio — auditoria necessária de RLS                   |
| **Sem alimentação do Guia de Embarque**       | Destino não alimenta documento de embarque                                      | Médio                                                 |
| **Sem alimentação de Confirmação de Reserva** | Destino não alimenta documento de confirmação                                   | Médio                                                 |
| **Edge function não auditada**                | Não verificamos se `destination-intelligence` realmente persiste dados corretos | Pendente                                              |

### 2.3 O que precisa ser feito

1. Conectar `destination_info` ao portal via query em `client.trips.$id.tsx`
2. Filtrar apenas registros com `reviewed_at IS NOT NULL` no portal
3. Adicionar `agency_id` (ou deixar global com RLS adequada)
4. Adicionar `source`, `source_url`, `expires_at`, `confidence_level`
5. Criar log de revisão (`destination_review_logs`)
6. Criar vínculo com `trips` (match por `trips.destination ILIKE destination_info.destination`)
7. Alimentar documento de confirmação e guia de embarque

---

## 3. Gaps — Fase 11 (Conferência de Voos)

### 3.1 O que o PRD exige (§8 — Reconciliação de Voos)

```
Conferência real deve incluir:
- múltiplas versões de itinerário (original, sugerido, confirmado)
- extração por upload/OCR/texto
- diff determinístico (datas, horários, aeroportos, escalas, bagagem)
- badges de risco (pernoite, conexão longa, troca de aeroporto)
- workflow: detectar → abrir caso → revisar → enviar ao cliente → aceite → operadora → confirmar
- aceite auditável com evidências
- adendo contratual
- propagação para portal e documentos
```

### 3.2 Gaps identificados — tabelas

| Tabela PRD                                | Existe? | Gap                                                           |
| ----------------------------------------- | ------- | ------------------------------------------------------------- |
| `flight_itineraries`                      | ❌      | Criar                                                         |
| `flight_segments`                         | ❌      | Criar                                                         |
| `flight_change_cases`                     | ❌      | Criar                                                         |
| `flight_alternatives`                     | ❌      | Criar                                                         |
| `flight_difference_analysis`              | ❌      | Criar                                                         |
| `customer_travel_decisions`               | ❌      | Criar                                                         |
| `operator_reaccommodation_requests`       | ❌      | Criar                                                         |
| `contract_amendments`                     | ⚠️      | `contract_addendums` existe mas sem campos de itinerário/diff |
| `checkin_links` (AirlineDeepLinkRegistry) | ❌      | Criar                                                         |
| `boarding_events`                         | ❌      | Criar                                                         |

### 3.3 Gaps identificados — UI e fluxo

| Item do Fluxo PRD                             | Existe? | Detalhe |
| --------------------------------------------- | ------- | ------- |
| Upload de e-mail/print/PDF com horários       | ❌      |         |
| OCR para extrair itinerários                  | ❌      |         |
| Formulário de entrada de alternativas         | ❌      |         |
| Engine de diff determinístico                 | ❌      |         |
| Badges de risco (pernoite, etc.)              | ❌      |         |
| Recomendações contextuais (VIP lounge, hotel) | ❌      |         |
| UI de revisão interna pelo agente             | ❌      |         |
| Seleção de alternativas visíveis ao cliente   | ❌      |         |
| Portal de escolha do cliente                  | ❌      |         |
| Aceite com evidências (nome, OTP, IP, hash)   | ❌      |         |
| Geração de adendo contratual                  | ❌      |         |
| Rascunho de e-mail para operadora             | ❌      |         |
| Thread de confirmação da operadora            | ❌      |         |
| Propagação para portal/voucher/guia           | ❌      |         |

### 3.4 O que deve ser desfeito/movido (arquitetura)

> A "Conferência de Voos" está atualmente na aba `flight_audit` dentro de `agency.$slug.vouchers.tsx`. Isso precisa ser **movido** para o domínio de Viagens (`/agency/:slug/trips/flights` ou sub-rota da viagem).

O módulo atual (`boarding_tickets` com `kind = 'flight'`) é um ponto de partida válido para a fila de bilhetes, mas não é um sistema de reconciliação de itinerários. São conceitos diferentes:

- **`boarding_tickets`** → Bilhetes individuais por passageiro (útil para conferência operacional)
- **`flight_itineraries`** (a criar) → Versões do itinerário completo da viagem (necessário para reconciliação e reacomodação)

Ambos coexistem — não se substituem — mas pertencem a domínios diferentes da nova arquitetura.

---

## 4. Gaps Transversais (Arquiteturais)

### 4.1 Domínios paralelos a convergir

| Domínio Atual              | Deve Virar                                             |
| -------------------------- | ------------------------------------------------------ |
| `group_tours`              | `trips` com `trip_type = 'group'` (ou adaptador)       |
| `boarding` (global)        | Views globais de `trips.flights` + Embarque como etapa |
| `vouchers` (global)        | Artefato da viagem + listagem global via pesquisa      |
| `destination-intelligence` | Seção "Segurança & Destino" da viagem                  |
| `contracts` (global)       | Artefato da viagem + listagem global                   |

### 4.2 Sidebar — itens globais que devem ser contextuais

| Item Atual               | Nova Localização                                                               |
| ------------------------ | ------------------------------------------------------------------------------ |
| Embarques                | Etapa dentro de `/trips/:id/boarding` + fila global `/trips/boarding`          |
| Vouchers                 | Documento dentro de `/trips/:id/voucher` + busca global                        |
| Destination Intelligence | Admin dentro de Configurações/Identidade + consumo em `/trips/:id/destination` |

### 4.3 Sub-navegação da viagem — abas a adicionar

Abas atuais: Visão Geral, Financeiro, Passageiros, Vouchers, Contrato

Abas a adicionar (por prioridade):

1. **Aéreos** (itinerários, tickets, check-in links)
2. **Reacomodações** (change cases)
3. **Confirmação de Reserva** (novo artefato)
4. **Check-in & Embarque** (absorvendo o módulo global)
5. **Hospedagem** (hotel + transfers)
6. **Rooming List** (para grupos)
7. **Destino & Segurança** (consumindo destination_info)
8. **Tickets/Suporte** (suporte contextual da viagem)
9. **Histórico/Auditoria** (event log)

### 4.4 Portal do cliente — seções a adicionar

Existem hoje: Voos (boarding pass visual), Contrato, Localizadores

A adicionar:

- Alterações de Voo (reacomodação em andamento)
- Status público inteligível (sem jargão interno)
- Aceite de alternativa aérea
- Destino & Segurança (filtrado por `reviewed_at`)
- Documentos (voucher, guia de embarque, confirmação)

---

## 5. Resumo de Ações por Fase (para o Plano Master)

> **Lembrete:** Este documento não autoriza implementação. Serve de base para o Plano Master.

### Fase 9 — Rooming List

- [ ] Decidir: manter JSONB ou migrar para tabela normalizada
- [ ] Se migrar: criar migration de preservação de dados + plano de rollback
- [ ] Criar service `rooming.ts` tipado
- [ ] Adicionar histórico de alocação e auditoria
- [ ] Criar exportação PDF/CSV
- [ ] Unificar `boarding_rooming_list` (ociosa) ou deprecar

### Fase 10 — Destination Intelligence

- [ ] Conectar `destination_info` ao portal do cliente
- [ ] Filtrar por `reviewed_at IS NOT NULL` no portal
- [ ] Adicionar `source`, `expires_at`, `agency_id` à tabela
- [ ] Criar log de revisão
- [ ] Vincular a `trips.destination` para sugestão contextual
- [ ] Alimentar Confirmação de Reserva e Guia de Embarque

### Fase 11 — Conferência de Voos

- [ ] Criar domínio de itinerários aéreos (fora de Vouchers)
- [ ] Criar tabelas: `flight_itineraries`, `flight_segments`, `flight_change_cases`, etc.
- [ ] Mover `boarding_tickets (kind=flight)` para nova rota `/trips/:id/flights`
- [ ] Implementar engine de diff determinístico
- [ ] Implementar portal de escolha do cliente
- [ ] Implementar aceite auditável
- [ ] Implementar comunicação com operadora
- [ ] Implementar propagação de confirmação
