# 00. Inventário do Repositório - TravelOS

Este documento apresenta o inventário completo e mapeamento técnico de toda a base de código do **TravelOS** (TravelAgencias), dividindo os itens por rotas, componentes, hooks, services, contexts, esquemas, banco de dados (tabelas, RPCs, migrations) e storage buckets.

---

## 1. Rotas do Frontend (TanStack Router)

As rotas estão localizadas em `src/routes/` e configuradas via TanStack Router.

| Item/Rota | Arquivo | Responsabilidade | Consumidores | Banco/API | Status | Problema |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | [index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/index.tsx) | Landing page institucional pública e redirecionamento de usuário. | Público | Nenhuma | Ativo | Nenhum |
| `/auth` | [auth.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/auth.tsx) | Layout e roteamento básico de autenticação. | Público | `auth.users` | Ativo | Nenhum |
| `/auth/login` | [auth.login.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/auth.login.tsx) | Tela de login do agente/administrador. | Agentes, Admins | `auth.signInWithPassword` | Ativo | Nenhum |
| `/auth/register` | [auth.register.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/auth.register.tsx) | Tela de cadastro de nova agência/conta. | Público | `auth.signUp` | Ativo | Nenhum |
| `/auth/onboarding` | [auth.onboarding.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/auth.onboarding.tsx) | Formulário de onboarding inicial após cadastro. | Novos Admins | RPC `create_agency_onboarding` | Ativo | `@ts-ignore` usado na chamada da RPC. Parâmetros JSONB não tipados estritamente. |
| `/agency/$slug` | [agency.$slug.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.tsx) | Layout principal de agência com sidebar ultrafina. | Membros da Agência | `public.agencies` | Ativo | Nenhum |
| `/agency/$slug/` | [agency.$slug.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.index.tsx) | Dashboard principal com cards informativos e estatísticas. | Membros da Agência | `public.trips`, `public.leads` | Ativo | Alto número de casts `as any` e renderizações não otimizadas. |
| `/agency/$slug/crm` | [agency.$slug.crm.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.tsx) | Kanban Board de CRM e controle de leads. | Agentes | `public.leads`, `public.lead_stages` | Ativo | Monolito de UI (38KB). Algumas atualizações de estado com `as any`. |
| `/agency/$slug/crm/$lead_id` | [agency.$slug.crm.$lead_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.tsx) | Detalhes e atividades de um lead específico no CRM. | Agentes | `public.leads`, `public.lead_activities` | Ativo | Monolito gigante de UI (76KB). Estados de atividades acoplados de forma síncrona. |
| `/agency/$slug/proposals` | [agency.$slug.proposals.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.tsx) | Layout do módulo de propostas. | Agentes | Nenhuma | Ativo | Rota órfã/stub que apenas redireciona. |
| `/agency/$slug/proposals/` | [agency.$slug.proposals.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.index.tsx) | Listagem de propostas ativas e filtros. | Agentes | `public.proposals` | Ativo | Nenhum |
| `/agency/$slug/proposals/new` | [agency.$slug.proposals.new.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx) | Criação de nova proposta comercial (itinerário, voos, hotéis). | Agentes | `public.proposals`, `public.proposal_items` | Ativo | Lógica complexa de comissão client-side com casts `as any`. |
| `/agency/$slug/proposals/$id` | [agency.$slug.proposals.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.$id.tsx) | Edição e ações de proposta. | Agentes | `public.proposals` | Ativo | Nenhum |
| `/agency/$slug/proposals/$id/preview` | [agency.$slug.proposals.$id.preview.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.$id.preview.tsx) | Preview interno de exibição pública da proposta. | Agentes | `public.proposals` | Ativo | Nenhum |
| `/agency/$slug/trips` | [agency.$slug.trips.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.index.tsx) | Listagem e filtros de viagens ativas. | Agentes | `public.trips` | Ativo | Nenhum |
| `/agency/$slug/trips/$id` | [agency.$slug.trips.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.tsx) | Dashboard principal e detalhes operacionais de uma viagem. | Agentes | `public.trips` | Ativo | Layout monolítico. |
| `/agency/$slug/trips/$id/passengers` | [agency.$slug.trips.$id.passengers.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.passengers.tsx) | Gerenciamento de passageiros e upload de documentos (KYC). | Agentes | `public.trip_passengers` | Ativo | Campo "Acomodação" é de texto solto; não integra com a tabela de quartos. |
| `/agency/$slug/trips/$id/contract` | [agency.$slug.trips.$id.contract.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.contract.tsx) | Emissão, preview e histórico de auditoria de contratos. | Agentes | `public.trip_contracts`, `public.contract_signatures` | Parcial | Usa a RPC legada com 49 cláusulas hardcoded; ignora a biblioteca `contract_clauses`. |
| `/agency/$slug/trips/$id/flights` | [agency.$slug.trips.$id.flights.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.flights.tsx) | Cadastro detalhado da malha aérea da viagem. | Agentes | `public.flight_itineraries`, `public.flight_segments` | Parcial | Nova aba Aéreos está desacoplada da antiga aba Bilhetes de Embarque. |
| `/agency/$slug/trips/$id/boarding` | [agency.$slug.trips.$id.boarding.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.boarding.tsx) | Kanban e checklists de check-in / bilhetes do passageiro. | Agentes | `public.boarding_cards` | Ativo | Presença de sombras Radix UI na interface. |
| `/agency/$slug/trips/$id/vouchers` | [agency.$slug.trips.$id.vouchers.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.vouchers.tsx) | Emissão e download de vouchers PDF no VoucherStudio. | Agentes | `public.boarding_cards`, `public.flight_itineraries` | Parcial | Flicker visual e PDF gerado sem esperar carregamento completo de Google Fonts. |
| `/agency/$slug/group-tours` | [agency.$slug.group-tours.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.tsx) | Listagem e criação de excursões e grupos terrestres. | Agentes | `public.group_tours` | Ativo | Nenhum |
| `/agency/$slug/group-tours/$id` | [agency.$slug.group-tours.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.tsx) | Detalhes do grupo, passageiros, mapa de assentos (ônibus) e rooming list. | Agentes | `public.group_tours`, `public.boarding_rooming_list` | Parcial | Monolito de UI (78KB). Rooming List desnormalizada JSONB em conflito com tabela relacional. |
| `/agency/$slug/suppliers` | [agency.$slug.suppliers.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.index.tsx) | Listagem de fornecedores e importação automatizada (OCR). | Agentes | `public.suppliers` | Parcial | Upload de OCR concluído no banco, mas interface não persiste entidades de produtos/contatos. |
| `/agency/$slug/suppliers/$id` | [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx) | Detalhes, contatos, produtos e documentos do fornecedor. | Agentes | `public.suppliers`, `public.supplier_products`, `public.supplier_contacts` | Parcial | Botão "Confirmar OCR" apenas atualiza flag no banco e não ingere entidades de produtos/contatos. |
| `/agency/$slug/support` | [agency.$slug.support.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.support.tsx) | Inbox de atendimentos e listagem de tickets abertos. | Suporte da Agência | `public.support_tickets` | Ativo | Sem integração real com Resend/Gmail na interface. |
| `/agency/$slug/support/$ticket_id` | [agency.$slug.support.$ticket_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.support.$ticket_id.tsx) | Chat e envio de mensagens para threads de suporte. | Suporte da Agência | `public.support_tickets`, `public.ticket_messages` | Parcial | Envio simulado de e-mail (grava apenas localmente). |
| `/agency/$slug/portal/settings` | [agency.$slug.portal.settings.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.settings.tsx) | Configurações SEO, Brand Kit e domínio público do portal. | Admins da Agência | `public.portal_settings` | Ativo | Nenhum |
| `/agency/$slug/portal/pages` | [agency.$slug.portal.pages.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.index.tsx) | Listagem de landing pages e biolinks criados no CMS. | Admins da Agência | `public.portal_pages` | Ativo | Nenhum |
| `/agency/$slug/portal/pages/$page_id` | [agency.$slug.portal.pages.$page_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.$page_id.tsx) | Editor de blocos dinâmico do CMS / Biolinks (Site Builder). | Admins da Agência | `public.portal_pages` | Ativo | Monolito de UI (63KB). |
| `/agency/$slug/destination-intelligence` | [agency.$slug.destination-intelligence.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.destination-intelligence.tsx) | Gerador e catalogador de dicas de destino com IA. | Agentes | `public.destination_info` | Só banco | Nenhuma rota React consome ou exibe esses dados no lado do cliente. |
| `/p/$agency_slug` | [p.$agency_slug.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.index.tsx) | Portal público e Biolink móvel da agência. | Clientes | `public.portal_pages`, `public.portal_settings` | Ativo | Risco de Flicker de estilo até cachear o Brand Kit. |
| `/p/$agency_slug/tour/$id` | [p.$agency_slug.tour.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.tour.$id.tsx) | Detalhes do pacote e formulário de inscrição Pix. | Clientes | `public.group_tours`, `public.group_tour_enrollments` | Mock | Upload de comprovante Pix é simulado (progress bar fake). |
| `/m/checkin/$token` | [m.checkin.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.checkin.$token.tsx) | Hub de check-in público móvel do passageiro. | Clientes | `public.boarding_cards`, `public.flight_itineraries` | Mock | Casts `as any` em chamadas RPC; check-in sem deep links funcionais das cias aéreas. |
| `/m/contract/$token` | [m.contract.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.contract.$token.tsx) | Tela de assinatura digital de contratos pelo passageiro. | Clientes | `public.trip_contracts`, `public.contract_signatures` | Ativo | Monolito gigante (63KB). |
| `/client/trips/$id` | [client.trips.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/client.trips.$id.tsx) | Portal do cliente com resumo, localizadores, hotéis e suporte. | Clientes | `public.trips` (visualização restrita) | Parcial | Monolito de 21KB (reduzido de 98KB). |

---

## 2. Componentes Principais e Design System

Os componentes de UI residem em `src/components/`.

| Componente | Arquivo | Responsabilidade | Consumidores | Status | Problema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DSCap` | [DSCap.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/ds/DSCap.tsx) | Badge/Etiqueta visual de status padronizada. | Vários componentes Admin | Ativo | Nenhum |
| `DSModule` | [DSModule.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/ds/DSModule.tsx) | Container e card padrão com bordas finas e sem sombra. | Páginas Administrativas | Ativo | Nenhum |
| `DSPageHeader` | [DSPageHeader.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/ds/DSPageHeader.tsx) | Título de página e ações em tipografia editorial. | Páginas Administrativas | Ativo | Nenhum |
| `VoucherStudio` | [VoucherStudio.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/VoucherStudio.tsx) | Configuração e preview de templates de Vouchers. | Rota Vouchers (`vouchers.tsx`) | Parcial | Arquivo gigante (44KB) acoplando lógica de formulário e render. |
| `TemplateVoucherEmbarqueA4` | [TemplateVoucherEmbarqueA4.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/templates/TemplateVoucherEmbarqueA4.tsx) | Template de impressão A4 do voucher. | `VoucherStudio` | Ativo | Google Fonts podem falhar ao renderizar em conexões ruins. |
| `TemplateVoucherStory` | [TemplateVoucherStory.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/templates/TemplateVoucherStory.tsx) | Template mobile vertical do voucher. | `VoucherStudio` | Ativo | Google Fonts podem falhar ao renderizar em conexões ruins. |
| `ContractClauseLibrary` | [ContractClauseLibrary.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/contracts/ContractClauseLibrary.tsx) | Listagem e gerenciamento de cláusulas contratuais. | Rota de Contratos (`contracts.tsx`) | Parcial | Não consumido no gerador de contratos oficial da viagem. |

---

## 3. Custom Hooks e Contextos

| Item | Arquivo | Responsabilidade | Consumidores | Status | Problema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Contexto: `AgencyContext` | [agency-context.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/agency-context.tsx) | Carrega informações do tenant, define variáveis CSS e Google Fonts no DOM. | Layout `agency.$slug` | Ativo | Risco de flicker visual (cor branca antes da cor padrão da agência) ao carregar. |
| Hook: `useCrmKanban` | [use-crm-kanban.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/hooks/use-crm-kanban.ts) | Gerenciamento de estado, mutações e ordenação das colunas do Kanban de CRM. | `CrmKanbanBoard.tsx`, Rota CRM | Ativo | Nenhum |
| Hook: `useConfirm` | [use-confirm.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/hooks/use-confirm.tsx) | Dialog de confirmação reativo e imperativo. | Vários formulários | Ativo | Nenhum |
| Hook: `usePrompt` | [use-prompt.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/hooks/use-prompt.tsx) | Input dialog imperativo para ações rápidas. | Vários formulários | Ativo | Nenhum |

---

## 4. Services (Camada de Integração de Dados)

| Service | Arquivo | Responsabilidade | Métodos Principais | Status |
| :--- | :--- | :--- | :--- | :--- |
| `CrmService` | [crm.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/crm.ts) | Operações do CRM e movimentação de Leads. | `getLeads`, `updateLeadStatus`, `promoteLead` | Ativo |
| `ProposalsService` | [proposals.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/proposals.ts) | CRUD e envio de propostas e markups. | `getProposals`, `saveProposal`, `acceptProposal` | Ativo |
| `BoardingService` | [boarding.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/boarding.ts) | Operações do Kanban e checklists de embarque. | `getBoardingCards`, `updateBoardingStatus` | Ativo |
| `ClientsService` | [clients.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/clients.ts) | Operações de passageiros e KYC. | `getClients`, `saveClientDocuments` | Ativo |
| `FlightReconciliationService` | [flight-reconciliation.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/flight-reconciliation.ts) | Motor de comparação e aceite de reacomodação. | `getFlightSegments`, `acceptReaccommodation` | Ativo |
| `RoomingService` | [rooming.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/rooming.ts) | CRUD relacional da Rooming List normalizada. | `getRoomingList`, `saveRoom`, `deleteRoom` | Ativo |

---

## 5. Estrutura do Banco de Dados (Supabase)

### 5.1 Tabelas Relevantes para a Estabilização

* **`public.boarding_rooming_list`**: Normalizada. Armazena número, tipo de quarto, hotel, check-in, check-out e array JSONB de passageiros.
* **`public.destination_info`**: Armazena dicas de destino criadas por IA, com flag `reviewed_at`.
* **`public.contract_clauses`**: Biblioteca de cláusulas padrão do sistema.
* **`public.trip_contracts`**: Cabeçalho de contratos de viagens com `clause_snapshot` (imutabilidade).
* **`public.supplier_files`**: Registra arquivos PDF/PNG de vouchers de fornecedores com metadados extraídos pelo OCR (`ocr_data`).
* **`public.supplier_products`**: Tabela de tarifas, quartos, passeios cadastrados para um fornecedor.
* **`public.supplier_contacts`**: Contatos múltiplos de atendimento de um fornecedor.

### 5.2 RPCs Operacionais

| Nome da RPC | Assinatura no Banco | Segurança | Utilidade no Frontend |
| :--- | :--- | :--- | :--- |
| `create_agency_onboarding` | `(p_slug text, p_name text, p_cnpj text, p_hours jsonb)` | SECURITY DEFINER | Rota `/auth/onboarding` para provisionar nova agência |
| `promote_lead_to_client` | `(p_lead_id uuid, p_agent_id uuid)` | SECURITY DEFINER | Kanban de CRM ao mover para ganho/convertido |
| `convert_proposal_to_trip` | `(p_proposal_id uuid, p_payment_terms jsonb)` | SECURITY DEFINER | Rota de detalhes de proposta aceita |
| `get_public_boarding_card_details` | `(p_token text)` | SECURITY INVOKER | Rota móvel `/m/checkin/$token` |
| `accept_public_reaccommodation` | `(p_trip_id uuid, p_itinerary_id uuid)` | SECURITY DEFINER | Rota móvel de aceitação de voo reacomodado |
| `append_contract_audit` | `(p_contract_id uuid, p_log text)` | SECURITY DEFINER | Assinatura e adendos de contratos |

### 5.3 Storage Buckets e RLS

* **`receipts`**: Comprovantes Pix/Cartão de faturas (público para upload).
* **`passenger-documents`**: CPFs, RGs e Passaportes enviados via KYC (privado, legível apenas pela agência).
* **`vouchers`**: PDFs de vouchers gerados para clientes.
* **`contracts`**: PDFs assinados digitalmente.
* **`agency-media`**: Imagens enviadas para o CMS/Site Builder (público).

---

## 6. Edge Functions (Serviços em Background)

Estão no diretório `supabase/functions/` e foram implantadas com sucesso.

| Nome da Função | Propósito Principal | Status Operacional |
| :--- | :--- | :--- |
| `gmail-send` | Envia e-mails corporativos via SMTP/OAuth do Gmail. | Ativo (Não invocado na UI do chat de suporte). |
| `gmail-sync` | Sincroniza e-mails inbound e insere na thread de suporte. | Ativo. |
| `whatsapp-sender` | Envio de mensagens transacionais via Evolution/Z-API. | Ativo. |
| `supplier-ocr-extractor` | Parsing de vouchers PDF e faturas utilizando Gemini Flash. | Ativo (OCR extrai dados, mas UI não salva entidades). |
| `generate-site-ai` | Criação inteligente de estruturas de CMS no Site Builder. | Ativo. |
