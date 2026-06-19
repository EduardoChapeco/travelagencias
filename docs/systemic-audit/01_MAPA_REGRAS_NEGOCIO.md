# 01. Mapa de Regras de Negócio - TravelOS

Este documento descreve detalhadamente as regras de negócio de cada módulo operacional, identificando os gatilhos, validações, processamentos, persistências e tratamentos de erro.

---

## 1. Onboarding e RBAC (Controle de Acesso)
### Regras Operacionais:
1. **Isolamento de Tenant:** Cada agência possui um `agency_id` exclusivo. As tabelas do banco contêm essa chave com RLS ativado, impedindo vazamento de dados.
2. **Promoção de Admin:** O criador da agência na RPC `create_agency_onboarding` é registrado em `user_roles` com a role `agency_admin`.
3. **Membro Convidado:** Convites enviados salvam o hash do token em `agency_invites`. O convidado que acessa `/m/invite/$token` e se cadastra é inserido em `agency_members` com a role atribuída.
### Código e Banco:
- RPC `create_agency_onboarding` (ver [fix_onboarding_ambiguous_column.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260612000012_fix_onboarding_ambiguous_column.sql)).
- RLS em `public.agencies`, `public.agency_private`, `public.profiles`.
### Tratamento de Erros:
- Se o slug da agência for duplicado, a RPC dispara `RAISE EXCEPTION 'URL já está em uso.'` e o Postgres reverte a transação.

---

## 2. CRM: Leads para Passageiros/Clientes
### Regras Operacionais:
1. **Origem:** Leads entram na tabela `leads` como `novo`.
2. **Promoção:** O botão "Promover a Cliente" na UI chama a RPC `promote_lead_to_client`.
3. **Mapeamento:** Os dados do lead (nome, e-mail, telefone) são inseridos em `public.clients` (ou tabela de passageiros).
### Código e Banco:
- RPC `promote_lead_to_client` (ver [promote_lead_to_client.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260609200622_promote_lead_to_client.sql)).
### Tratamento de Erros:
- Se o cliente já existir (baseado em e-mail/documento), a RPC faz o merge dos dados sem duplicar o registro.

---

## 3. Cotações: Markups e Câmbio de Moedas
### Regras Operacionais:
1. **Cálculo de Preço:** Cada item na proposta (`proposal_items`) possui valor líquido, markup (%), taxas e valor bruto.
2. **Comissão Dinâmica:** O sistema calcula a comissão com base no markup aplicado e comissão acordada com o fornecedor.
3. **Câmbio:** Se a proposta usar moeda estrangeira, congela-se a taxa de câmbio (`exchange_rate`) no momento do fechamento.
### Código e Banco:
- Componente `ProposalsStudio` e triggers de recálculo (ver [recalculate_proposal_totals.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260611000001_recalculate_proposal_totals.sql)).
### Tratamento de Erros:
- Triggers recalculam os totais da proposta sempre que um item é inserido/atualizado, evitando totais errados caso a UI envie dados distorcidos.

---

## 4. Conversão: Proposta para Viagem Operacional
### Regras Operacionais:
1. **Processo:** Transforma uma proposta aceita em viagem operacional em `/agency/$slug/proposals/$id` ou via RPC.
2. **Clonagem:** Cria um registro em `trips` copiando dados da proposta e insere itens nos cartões de embarque (`boarding_cards`) e trechos aéreos (`flight_segments`).
3. **Aba Financeira:** Cria recebíveis equivalentes em `financial_records` vinculando-os ao ID do lead promovido a cliente.
### Código e Banco:
- RPC `convert_proposal_to_trip` (ver [convert_proposal_to_trip.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260614000001_convert_proposal_to_trip.sql)).
### Tratamento de Erros:
- Se a proposta já estiver convertida (`converted_at IS NOT NULL`), o fluxo é bloqueado com erro para evitar viagens duplicadas.

---

## 5. Contratos: Assinatura e Biblioteca de Cláusulas
### Regras Operacionais:
1. **Estrutura:** O contrato da viagem consome cláusulas da tabela `contract_clauses`.
2. **Snapshot Imutável:** No momento da assinatura, salva-se o HTML exato em `trip_contracts.compiled_html` e gera-se o PDF real, salvando no bucket `contracts`.
3. **Logs KYC:** Registra-se IP, User-Agent, e biometria digital no momento em que o passageiro assina na rota `/m/contract/$token`.
### Código e Banco:
- Tabelas `trip_contracts`, `contract_signatures` (ver [contract_clause_library.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260623000003_contract_clause_library.sql)).
- Rota `/m/contract/$token`.
### Tratamento de Erros:
- Falhas de upload de PDF abortam a mudança de status do contrato para `assinado`, garantindo que não haja contrato marcado como assinado sem seu correspondente físico em PDF no Storage.

---

## 6. Pagamentos: Comprovantes Pix e Conciliação
### Regras Operacionais:
1. **Comprovante Físico:** Checkout de vendas B2C na vitrine de pacotes e portal de pagamentos móvel exige upload real de arquivo de imagem/PDF.
2. **Bucket de Destino:** O arquivo é salvo no bucket `receipts` e seu link é persistido em `financial_receipts` associado à parcela.
3. **Aprovação do Agente:** O status do lançamento muda para `em_analise` até que o agente aprove no financeiro da agência.
### Código e Banco:
- Tabela `financial_receipts` e bucket de recibos (ver [checkout_pix_storage_integration.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260625000002_checkout_pix_storage_integration.sql)).
### Tratamento de Erros:
- Tentativas de upload fake de Pix (nome aleatório sem envio físico) falham pois a API valida o Content-Length e a existência da referência do arquivo no Storage antes de marcar como `em_analise`.

---

## 7. Aéreos: Motor de Diff e Reacomodação
### Regras Operacionais:
1. **Controle de Versão:** Mudanças de horário ou voo criam uma nova versão em `flight_itineraries` com tipo `operator_suggestion` e status `active`.
2. **Interface Diff:** O sistema compara o itinerário ativo `confirmed` e a sugestão `operator_suggestion`, marcando em vermelho os trechos alterados/cancelados.
3. **Aceite do Passageiro:** No portal móvel `/m/checkin/$token`, o passageiro aceita a mudança, o que arquiva o itinerário antigo (`status = 'archived'`) e promove o novo a `confirmed`, atualizando os bilhetes de embarque.
### Código e Banco:
- Tabelas `flight_itineraries`, `flight_segments` (ver [flight_reconciliation_schema.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260624000003_flight_reconciliation_schema.sql)).
- RPC `accept_public_reaccommodation` em [checkin_links_and_boarding_events.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260625000003_checkin_links_and_boarding_events.sql).
### Tratamento de Erros:
- Se a reacomodação falhar ao promover, o itinerário confirmed antigo permanece ativo para evitar perdas ou estado órfão de voos.

---

## 8. Check-in e Embarque (e-Checkin móvel)
### Regras Operacionais:
1. **Centralização de links:** Agência cadastra overrides de links em `checkin_links` vinculados ao trecho de voo.
2. **Deep-links:** Se não houver override, o sistema gera dinamicamente a URL baseada na companhia e localizador (PNR).
3. **Auditoria de cliques:** Cliques em "Iniciar Check-in" gravam evento `checkin_link_clicked` na tabela `boarding_events` para auditoria do suporte.
4. **Botão de Emergência:** Alertas de voo cancelado/atrasado gerados pelo passageiro disparam tickets de suporte urgentes no Omnichannel da agência.
### Código e Banco:
- Tabela `checkin_links` e `boarding_events` (ver [checkin_links_and_boarding_events.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260625000003_checkin_links_and_boarding_events.sql)).
- Rota `/m/checkin/$token`.
### Tratamento de Erros:
- Falhas de gravação de eventos de boarding não travam o redirecionamento ao check-in para não prejudicar o embarque do cliente, mas disparam um alerta silencioso no console.

---

## 9. Rooming List (Quartos e Ocupação)
### Regras Operacionais:
1. **Resolução de Concorrência:** Quartos são criados na tabela normalizada `boarding_rooming_list` contendo o ID do passageiro, tipo de quarto, número e hotel.
2. **Sincronia:** Não gravar no campo JSONB `group_tours.rooming_list` para evitar sobrescritas e garantir a integridade relacional.
3. **Lotação:** Validações impedem que a quantidade de passageiros exceda a capacidade do quarto.
### Código e Banco:
- Tabela `boarding_rooming_list` (ver [boarding_rooming_list.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260619000001_boarding_rooming_list.sql) e [rooming_list_consolidation.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260625000001_rooming_list_consolidation.sql)).
- Componente `RoomingList.tsx`.
### Tratamento de Erros:
- Duplicações ou lotações estouradas lançam toasts de erro impeditivos impedindo a gravação no banco de dados.

---

## 10. Omnichannel: Tickets e E-mails
### Regras Operacionais:
1. **Thread Sync:** E-mails recebidos ou enviados via Gmail/Resend são agrupados na thread do ticket com base nos Reply-Headers (`In-Reply-To` e `References`).
2. **Abertura automática:** E-mails de novos remetentes criam um ticket aberto automático.
3. **Escala de SLA:** Um timer monitora e sinaliza tickets vencidos sem resposta do agente.
### Código e Banco:
- Tabelas `support_tickets`, `ticket_messages` (ver [ticket_messages.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260609195334_ticket_messages.sql)).
- Edge Functions `gmail-send` e `gmail-sync`.
### Tratamento de Erros:
- E-mails que falham no envio por limite da API ficam marcados na thread como `failed` permitindo nova tentativa manual pelo agente.
