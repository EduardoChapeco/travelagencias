# 02. Matriz de Compatibilidade UI ↔ Contratos ↔ Banco - TravelOS

Este documento apresenta o mapeamento de conformidade entre os formulários do frontend, esquemas de validação (Zod), definições de tipo do TypeScript e a persistência relacional correspondente no Supabase.

---

## 1. Matriz de Alinhamento de Contratos

| Tela/Módulo | Tipo UI / TypeScript | Schema de Validação (Zod) | Método / Service | Tabela / Colunas no Banco | Compatível? | Persistência? | Problema Encontrado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Onboarding** | `AgencyOnboardingData` | Inline em `auth.onboarding.tsx` | RPC `create_agency_onboarding` | `agencies` (`name`, `slug`, `cnpj`), `agency_private` (`business_hours` jsonb) | Sim | Sim | `@ts-ignore` ocultando tipo do parâmetro `business_hours` |
| **CRM Leads** | `Lead` | Zod schema inline | `CrmService.updateLeadStatus` | `leads` (`id`, `stage_id`, `status`, `estimated_value`, `notes`) | Sim | Sim | Campos de contato customizados salvos em JSONB sem tipagem estrita no front |
| **Propostas** | `Proposal` e `ProposalItem` | `cms-schemas.ts` | `ProposalsService.saveProposal` | `proposals`, `proposal_items` | Parcial | Sim | Recálculo de markups e taxas ocorre no frontend; risco de manipulação de valores pelo cliente |
| **Contratos** | `TripContract` | N/A (Stubs locais) | `sign_contract` RPC herdada | `trip_contracts` (`clause_snapshot` jsonb, `audit_trail` jsonb) | Parcial | Sim | O frontend do emissor ignora a tabela `contract_clauses` e usa 49 cláusulas hardcoded |
| **Vouchers** | `BoardingCard` | N/A (Stubs locais) | `VouchersService.saveVoucher` | `boarding_cards` (`id`, `hotel_name`, `checkin_date`, `notes`) | Parcial | Sim | Dependência direta de campos de texto planos para acomodações |
| **Hospedagem** | `RoomingItem` | N/A | `RoomingService.saveRoom` | `boarding_rooming_list` (`id`, `room_number`, `room_type`, `passengers` jsonb) | Parcial | Sim | Duplo canal de persistência ativo: grava na tabela relacional mas também na coluna JSONB de `group_tours` |
| **Aéreos (Malha)** | `FlightItinerary`, `Segment` | N/A | `FlightReconciliationService` | `flight_itineraries`, `flight_segments` | Parcial | Sim | Itinerários salvos na aba Aéreos não atualizam os bilhetes na aba Bilhetes de Embarque |
| **Suporte** | `TicketMessage` | Zod schema inline | `SupportService.sendMessage` | `ticket_messages` (`id`, `body`, `channel`, `direction`) | Parcial | Parcial | Canal "e-mail" selecionado no chat é persistido localmente, mas não invoca envio SMTP real |
| **Site Builder** | `PortalPage` | `cms-schemas.ts` | `PortalPagesService.savePage` | `portal_pages` (`id`, `slug`, `sections` jsonb, `published`) | Sim | Sim | Nenhum |
| **Biolinks** | `PortalPage` | `cms-schemas.ts` | `PortalPagesService.savePage` | `portal_pages` (`sections` jsonb) | Sim | Sim | Nenhum |
| **Destination** | `DestinationInfo` | N/A | N/A (Consumido inline) | `destination_info` (`id`, `destination`, `safety_tips`, `reviewed_at`) | Só banco | Nenhuma | Dados existem no banco e há painel de IA, mas nenhuma rota do cliente exibe essas dicas |

---

## 2. Incompatibilidades e Divergências de Colunas

* **`contracts` vs. `trip_contracts`**: O frontend faz chamadas para a tabela `contracts` em algumas rotas antigas e para `trip_contracts` nas mais novas. A migração recente padronizou a persistência em `trip_contracts` para suportar versões e auditorias, porém o código legado em `/m/contract/$token` ainda contém referências mistas.
* **`boarding_rooming_list.card_id`**: A coluna `card_id` (FK -> `boarding_cards.id`) é marcada como `NOT NULL` em migrações antigas, mas a migração `20260625000001_rooming_list_consolidation.sql` removeu essa restrição para permitir alocar quartos associando-os diretamente ao grupo (`group_tour_id`). No entanto, o types.ts gerado localmente ainda a descrevia como obrigatória em trechos isolados do front.
* **`boarding_tickets` e `flight_segments`**: O passageiro no check-in móvel lê dados da tabela `boarding_cards` (que possui colunas de voo legadas como `departure_time`, `arrival_time` e `flight_number` desnormalizadas) enquanto o admin do aéreo atualiza as tabelas de segmentos de voo `flight_segments`. Isso cria uma grave divergência onde dados no portal do passageiro não batem com os dados operacionais do admin.
