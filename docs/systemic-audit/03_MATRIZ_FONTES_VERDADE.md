# 03. Matriz de Fontes de Verdade - TravelOS

Este documento estabelece as fontes únicas de verdade (SSoT) para todas as entidades operacionais da plataforma, definindo onde os dados ativos residem, em quais casos são permitidos snapshots de auditoria e como as tabelas são sincronizadas.

---

## 1. Regra Geral de Consistência

1. **Dados Ativos:** Toda edição deve incidir diretamente sobre a tabela relacional mapeada. Nenhuma cópia editável ou cache local de estado no frontend deve substituir a gravação direta no banco.
2. **Snapshots:** São permitidos apenas para versionamento de documentos juridicamente vinculativos (Contratos, Faturas Emitidas, e Vouchers Enviados) ou históricos de auditoria. Um snapshot nunca deve ser modificado após criado.
3. **Prevenção de JSONB Editável:** É estritamente proibido utilizar colunas JSONB para armazenar arrays de entidades que possuam lógica relacional (ex: alocações de quartos em formato de array JSONB de passageiros), pois isso causa perdas de dados silenciosas por sobrescritas concorrentes.

---

## 2. Matriz de Fontes de Verdade

| Entidade                         | Fonte Única de Verdade (Banco)                         | Tipo de Dado        | Regra de Snapshot / Versionamento                                                                                  | Direção da Sincronização               |
| :------------------------------- | :----------------------------------------------------- | :------------------ | :----------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| **Marca da Agência (Brand Kit)** | `public.agencies` e `public.agency_private`            | Ativo / Editável    | Cache síncrono local em `localStorage` para evitar flicker de carregamento CSS.                                    | Banco -> LocalStorage (Read-Only)      |
| **Papéis de Usuários (RBAC)**    | `public.user_roles` e `public.agency_members`          | Ativo / Editável    | Sem snapshots. Avaliado em tempo real no middleware do Supabase RLS.                                               | Banco -> RLS Context                   |
| **Controle de Leads (CRM)**      | `public.leads`                                         | Ativo / Editável    | Histórico de estágios persistido na tabela append-only `public.lead_activities`.                                   | Banco -> UI Kanban                     |
| **Itens da Proposta**            | `public.proposals` e `public.proposal_items`           | Ativo / Editável    | Ao aceitar a proposta, gera-se um snapshot imutável em PDF salvo no bucket `proposals`.                            | UI -> Banco -> PDF Export              |
| **Viagem**                       | `public.trips`                                         | Ativo / Editável    | Histórico de alterações salvo na tabela append-only `public.trip_history`.                                         | Banco -> Rota de Viagem                |
| **Passageiros KYC**              | `public.trip_passengers`                               | Ativo / Editável    | Cópia do documento no Storage do bucket `client-documents` na assinatura.                                          | UI -> Banco -> Storage                 |
| **Itinerários de Voos**          | `public.flight_itineraries` e `public.flight_segments` | Versionado          | Mantém histórico completo. Apenas uma versão é marcada com `type = 'confirmed'` e `status = 'active'`.             | UI -> Itinerário -> Bilhetes           |
| **Quartos (Rooming List)**       | `public.boarding_rooming_list`                         | Ativo / Editável    | **IMPORTANTE:** A coluna legada `group_tours.rooming_list` (JSONB) está depreciada. A SSoT é a tabela normalizada. | UI -> Boarding Rooming List            |
| **Localizadores de Serviço**     | `public.trip_confirmation_items`                       | Ativo / Editável    | Sem snapshots. Alterações atualizam diretamente o PNR exposto ao cliente.                                          | UI -> Banco -> Portal Cliente          |
| **Contrato Assinado**            | `public.trip_contracts` e `public.contract_signatures` | Snapshot Imutável   | O PDF contendo as cláusulas compiladas e assinatura digital do cliente é salvo no bucket `contracts`.              | UI -> Compiled HTML -> PDF Storage     |
| **Faturamento e Recebíveis**     | `public.financial_records`                             | Ativo / Editável    | Comprovantes físicos de pagamento enviados pelo cliente são salvos no bucket `receipts`.                           | Portal Cliente -> Storage -> Banco     |
| **Tickets de Suporte**           | `public.support_tickets` e `public.ticket_messages`    | Ativo / Append-Only | Threads de e-mail/chat organizadas por cabeçalho `Message-ID` e `In-Reply-To`.                                     | Gmail/Resend Webhooks -> Banco         |
| **Dicas de Destino**             | `public.destination_info`                              | Ativo / Editável    | O portal só exibe registros que possuem `reviewed_at IS NOT NULL` (revisão humana).                                | Admin (Gemini IA) -> Revisão -> Portal |
| **Páginas do Site (CMS)**        | `public.portal_pages`                                  | Ativo / Versionado  | Rascunhos de edição são salvos em `draft_blocks` antes de serem publicados em `blocks`.                            | Editor -> Rascunho -> Publicado        |
