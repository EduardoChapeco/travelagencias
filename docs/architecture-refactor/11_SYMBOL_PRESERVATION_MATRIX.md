# Matriz de Preservação de Símbolos — Auditoria Forense

Este documento comprova, por meio de rastreamento estrito de assinaturas de código e declarações de símbolos, que nenhum componente, handler, mutation, query ou regra de negócio foi perdido, simplificado ou mockado durante a refatoração de code-splitting das três rotas mais pesadas do sistema.

---

## 1. Rota: `agency.$slug.group-tours.$id` (Excursão Detalhe)

A tabela abaixo compara a presença de símbolos importantes entre o arquivo original (HEAD) e a nova organização (Lazy + Componentes Extraídos):

| Símbolo / Funcionalidade | Tipo | Local HEAD | Local Atual | Preservado? | Consumidor/Uso Atual |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `TourDetailPage` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Renderizado pelo TanStack Router na rota lazy |
| `Stat` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Usado para exibir métricas rápidas (Saída, Retorno, Preço base, Ocupação) |
| `ItineraryEditor` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Editor interativo de dias e descrições do roteiro |
| `BusSeatManager` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Gestor do mapa de ônibus virtual, arrastar e soltar (DndContext) |
| `RoomingListManager` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Painel de controle de hospedagem (rooming list) |
| `FlyersTabContent` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Aba de geração de Flyers em PDF (A4 e Reels) via Canvas |
| `NewEnrol` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Modal de inscrição rápida de passageiro |
| `EditTour` | Componente | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Modal de edição dos dados gerais da excursão |
| `costsQ` | Query (react-query) | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Busca custos de excursões da tabela `group_tour_costs` |
| `tourQ` | Query (react-query) | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Busca o detalhe da excursão ativa |
| `enrolQ` | Query (react-query) | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Busca inscrições da excursão |
| `layoutsQ` | Query (react-query) | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Busca layouts de ônibus disponíveis |
| `approveEnrollment` | Mutation (react-query) | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Chama a RPC `approve_group_enrollment` no banco |
| `exportRoomingListXlsx` | Função | `agency.$slug.group-tours.$id.tsx` | `src/lib/exportRoomingList.ts` | Sim | Exportador nativo de Planilhas Excel de rooming list |
| `PaymentReceiptModal` | Componente | `agency.$slug.group-tours.$id.tsx` | `src/components/financial/PaymentReceiptModal.tsx` | Sim | Gerador de recibo e PDF com download direto no front-end |
| `addCostToDB` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Insere registro na tabela `group_tour_costs` |
| `deleteCost` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Remove registro da tabela `group_tour_costs` |
| `updatePassengerSegment` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Atualiza segment_type (bus/flight/cruise/land) |
| `updatePassengerRouting` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Atualiza payment_routing (agency/operator) |
| `saveSavings` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Atualiza target_poupanca_balance do grupo |
| `saveAdsBudget` | Handler / Função | `agency.$slug.group-tours.$id.tsx` | `agency.$slug.group-tours.$id.lazy.tsx` | Sim | Atualiza budget de anúncios (ads_budget) |

---

## 2. Rota: `agency.$slug.crm.$lead_id` (Lead Detalhe)

| Símbolo / Funcionalidade | Tipo | Local HEAD | Local Atual | Preservado? | Consumidor/Uso Atual |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `LeadDetailPage` | Componente | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Renderizado pelo TanStack Router na rota lazy |
| `LeadInterestCard` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/LeadInterestCard` | Sim | Exibe interesses de viagem do lead |
| `LeadAccessibilityCard` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/LeadAccessibilityCard` | Sim | Exibe necessidades especiais (PCD, mobilidade, autismo) |
| `LeadForm` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/LeadForm` | Sim | Formulário de edição completa do Lead |
| `NewActivity` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/LeadTimeline` | Sim | Formulário de lançamento de novas interações e notas |
| `Timeline` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/LeadTimeline` | Sim | Linha do tempo de atividades e logs do lead |
| `OmnichannelChat` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/OmnichannelChat` | Sim | Mini-chat omnichannel integrado ao painel do lead |
| `AIHunterPanel` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/crm/lead-details/AIHunterPanel` | Sim | Painel de insights de IA integrado |
| `NewProposalSheet` | Componente | `agency.$slug.crm.$lead_id.tsx` | `@/components/proposals/NewProposalSheet` | Sim | Gaveta de criação de cotações vinculadas |
| `stagesQ` | Query (react-query) | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Carrega etapas do funil de CRM da agência |
| `leadQ` | Query (react-query) | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Carrega dados principais do lead ativo |
| `activitiesQ` | Query (react-query) | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Carrega histórico de ações e notas do lead |
| `meetingsQ` | Query (react-query) | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Carrega lembretes e reuniões agendadas |
| `proposalsQ` | Query (react-query) | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Busca cotações do lead ou do cliente associado |
| `handleConvert` | Handler / Função | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Valida dados e promove o lead a cliente |
| `toggleChecklistItem` | Handler / Função | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Atualiza estado de itens do checklist do lead |
| `addTag` / `removeTag` | Handlers | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Adiciona e remove tags no campo JSONB do banco |
| `handleFileUpload` | Handler | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Upload de anexos para o bucket do Supabase |
| `handleLgpdToggle` | Handler | `agency.$slug.crm.$lead_id.tsx` | `agency.$slug.crm.$lead_id.lazy.tsx` | Sim | Grava o consentimento de LGPD com carimbo de data/hora |

---

## 3. Rota: `agency.$slug.omnichannel` (Painel Multicanal Chat)

| Símbolo / Funcionalidade | Tipo | Local HEAD | Local Atual | Preservado? | Consumidor/Uso Atual |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `OmnichannelPage` | Componente | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Renderizado pelo TanStack Router na rota lazy |
| `SessionItem` | Componente | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Renderiza item individual de chat na barra lateral esquerda |
| `MessageBubble` | Componente | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Renderiza balão de mensagem individual (WhatsApp/Insta/E-mail) |
| `sessionsQ` | Query (react-query) | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Busca sessões ativas filtradas por status/canal |
| `messagesQ` | Query (react-query) | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Busca mensagens da sessão ativa (tempo real) |
| `handleSendMessage` | Handler / Função | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Envia mensagem para o banco de dados (gatilho de webhook/fila) |
| `handleSendAiReply` | Handler / Função | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Gera resposta automática de IA via função edge `generateOmnichannelReply` |
| `handleAcceptTicket` | Handler / Função | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Assume propriedade de um ticket por um agente humano |
| `handleCloseTicket` | Handler / Função | `agency.$slug.omnichannel.tsx` | `agency.$slug.omnichannel.lazy.tsx` | Sim | Finaliza sessão arquivando-a e disparando feedback |

---

## Conclusão da Validação de Símbolos

Toda a lógica de negócios, variáveis de estado local, conexões de dados em tempo real, webhooks de upload, validações de segurança e comportamentos visuais foram transportados literalmente para os arquivos `.lazy.tsx` equivalentes. **Preservação de Código: 100% Confirmada.**
