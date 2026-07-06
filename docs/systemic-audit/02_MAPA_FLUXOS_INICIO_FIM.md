# 02. Mapa de Fluxos Início ao Fim - Turis

Este documento apresenta a análise de ciclo de vida completo de sete fluxos operacionais críticos do Turis, com o mapeamento técnico de tabelas, arquivos, regras e status de validação.

---

## 1. Fluxo: Lead até Viagem

Este fluxo acompanha a conversão de um cliente em potencial capturado pelo CRM em uma viagem operacional com faturamento, passageiros e itens de embarque definidos.

| Etapa                  | Entrada                                  | Regra                                         | Código                     | Tabela                    | Saída                               | Propagação                         | Erro                          | Teste  | Status           |
| :--------------------- | :--------------------------------------- | :-------------------------------------------- | :------------------------- | :------------------------ | :---------------------------------- | :--------------------------------- | :---------------------------- | :----- | :--------------- |
| **1. Entrada de Lead** | Dados cadastrais e interesses do cliente | Registro de interesse do lead no funil do CRM | `agency.$slug.crm`         | `leads`                   | Lead ativo no funil                 | Notificação no Dashboard           | Campos vazios                 | Manual | REAL NÃO TESTADO |
| **2. Qualificação**    | Interação do agente com o lead           | Alteração de estágio no Kanban após contato   | `update_lead_status`       | `leads`                   | Lead qualificado                    | Tarefas agendadas no painel        | Concorrência de atualização   | Manual | REAL NÃO TESTADO |
| **3. Proposta**        | Roteiro e cotação de serviços            | Criação de orçamento com câmbio congelado     | `ProposalsStudio`          | `proposals`               | Link público da proposta            | Rastreamento de abertura           | Totais errados / Câmbio nulo  | Manual | PARCIAL          |
| **4. Aceite**          | Clique do cliente no link da proposta    | Aceite comercial dos termos e valores         | `/m/proposal/$token`       | `proposals`               | Proposta com status `aceita`        | Liberação do botão de conversão    | Assinatura ausente            | Manual | PARCIAL          |
| **5. Conversão**       | Clique em "Converter" pelo agente        | Execução da RPC de clonagem e inicialização   | `convert_proposal_to_trip` | `trips`                   | Viagem criada no status `reservado` | Criação de faturas no financeiro   | Proposta já convertida        | Manual | REAL NÃO TESTADO |
| **6. Cadastro KYC**    | Documentos dos passageiros               | Validação de CPF ou validade de passaporte    | `trips.$id.passengers`     | `trip_passengers`         | Passageiros prontos para embarque   | Listagem de passageiros no voucher | Passaporte expirado           | Manual | REAL NÃO TESTADO |
| **7. Pagamento**       | Comprovante do sinal                     | Upload real do Pix e análise do comprovante   | `m.payment.$token`         | `financial_receipts`      | Fatura marcada como `pago`          | Liberação de vouchers e bilhetes   | Arquivo corrompido / Fake Pix | Manual | PARCIAL          |
| **8. Contrato**        | Clique de assinatura do passageiro       | Assinatura digital, IP, hash e PDF gerados    | `/m/contract/$token`       | `trip_contracts`          | Contrato em PDF assinado no bucket  | Envio da cópia por e-mail          | Erro de renderização de PDF   | Manual | PARCIAL          |
| **9. Confirmação**     | Localizadores dos serviços               | Lançamento dos PNRs dos trechos aéreos        | `trips.$id.confirmation`   | `trip_confirmation_items` | Itens confirmados no portal         | Visualização no portal do cliente  | PNR inválido                  | Manual | REAL NÃO TESTADO |

---

## 2. Fluxo: Pacote Público (Vitrine B2C)

Fluxo do site institucional e biolinks para aquisição e conversão de pacotes públicos em leads e reservas.

| Etapa               | Entrada                         | Regra                                   | Código                  | Tabela                   | Saída                        | Propagação                        | Erro                           | Teste  | Status           |
| :------------------ | :------------------------------ | :-------------------------------------- | :---------------------- | :----------------------- | :--------------------------- | :-------------------------------- | :----------------------------- | :----- | :--------------- |
| **1. Criar Pacote** | Roteiro diário, hotéis e preços | Cadastro de grupo terrestre operacional | `group-tours`           | `group_tours`            | Grupo terrestre cadastrado   | Disponibilidade no CMS            | Datas incoerentes              | Manual | REAL NÃO TESTADO |
| **2. Publicar**     | Flag de ativação no CMS         | Publicação na vitrine institucional     | `portal.pages`          | `portal_pages`           | Landing page ativa no site   | Indexação no sitemap              | Slug de página duplicado       | Manual | REAL NÃO TESTADO |
| **3. Checkout B2C** | Cadastro de dados e Pix         | Inscrição no pacote público             | `p.$slug.tour.$id`      | `group_tour_enrollments` | Inscrição pendente de Pix    | Criação de lead automático no CRM | Falha de upload de comprovante | Manual | PARCIAL          |
| **4. CRM Ingest**   | Dados da inscrição              | Geração automática de lead associado    | `leads_public_form_rpc` | `leads`                  | Lead criado na coluna "Novo" | Alerta no WhatsApp do agente      | Campo customizado quebrado     | Manual | REAL NÃO TESTADO |

---

## 3. Fluxo: Ingestão de Fornecedores e OCR

Como os vouchers e faturas de operadoras parceiras são lidos e processados pelo Gemini Flash para catalogar hotéis, tarifas e contatos.

| Etapa                | Entrada                           | Regra                                          | Código                   | Tabela              | Saída                              | Propagação                     | Erro                         | Teste  | Status             |
| :------------------- | :-------------------------------- | :--------------------------------------------- | :----------------------- | :------------------ | :--------------------------------- | :----------------------------- | :--------------------------- | :----- | :----------------- |
| **1. Upload**        | Arquivo PDF do voucher/fatura     | Armazenamento de arquivo bruto no storage      | `suppliers.$id`          | `supplier_files`    | Arquivo persistido no banco        | Fila de leitura de OCR         | Limite de tamanho de arquivo | Manual | REAL NÃO TESTADO   |
| **2. OCR Extractor** | Chamada da Edge Function Deno     | API Gemini Flash processa o PDF e retorna JSON | `supplier-ocr-extractor` | `supplier_files`    | JSON extraído salvo em `ocr_data`  | Renderização dos dados na UI   | JSON corrompido / Falha IA   | Manual | REAL PONTA A PONTA |
| **3. Revisão**       | Interface de aprovação do agente  | Comparação visual do PDF com os dados da IA    | `suppliers.$id`          | Nenhuma             | Dados editados e validados         | Habilitação do botão de salvar | Alterações não salvas        | Manual | REAL PONTA A PONTA |
| **4. Matching**      | Clique em "Confirmar e Persistir" | Inserção relacional de produtos e contatos     | `suppliers.$id`          | `supplier_products` | Fornecedor enriquecido no catálogo | Autocomplete nas propostas     | Duplicação de produtos       | Manual | REAL PONTA A PONTA |

---

## 4. Fluxo: Emissão e Assinatura de Contrato

Criação, versionamento, assinatura eletrônica e arquivamento de contratos de prestação de serviços turísticos.

| Etapa               | Entrada                            | Regra                                    | Código               | Tabela                | Saída                            | Propagação                       | Erro                   | Teste  | Status  |
| :------------------ | :--------------------------------- | :--------------------------------------- | :------------------- | :-------------------- | :------------------------------- | :------------------------------- | :--------------------- | :----- | :------ |
| **1. Template**     | Seleção de cláusulas da biblioteca | Montagem do contrato da viagem no editor | `trips.$id.contract` | `contract_clauses`    | Rascunho de contrato gerado      | Visualização de preview          | Cláusula sem ordenação | Manual | PARCIAL |
| **2. Envio**        | Clique em "Enviar para Assinatura" | Liberação do link de assinatura externa  | `trips.$id.contract` | `trip_contracts`      | Link `/m/contract/$token` ativo  | Disparo de e-mail ao contratante | Token expirado         | Manual | PARCIAL |
| **3. Assinatura**   | IP, Assinatura digital e dados KYC | Validação da assinatura na rota móvel    | `m.contract.$token`  | `contract_signatures` | Assinatura salva eletronicamente | Congelamento do itinerário       | Assinatura sem nome    | Manual | PARCIAL |
| **4. Snapshot PDF** | html2pdf compilado no browser      | Upload do PDF assinado para o bucket     | `ExportPdfButton`    | Bucket `contracts`    | PDF oficial no Storage           | E-mail com cópia ao cliente      | html2canvas timeout    | Manual | PARCIAL |

---

## 5. Fluxo: Alteração de Malha Aérea e Reacomodação

Auditoria de voos programados, detecção de alteração de horários e aceite do passageiro.

| Etapa              | Entrada                                    | Regra                                       | Código                  | Tabela               | Saída                                     | Propagação                       | Erro                         | Teste  | Status           |
| :----------------- | :----------------------------------------- | :------------------------------------------ | :---------------------- | :------------------- | :---------------------------------------- | :------------------------------- | :--------------------------- | :----- | :--------------- |
| **1. Mudança**     | Alteração de horário inserida pelo agente  | Criação de itinerário de operadora          | `trips.$id.flights`     | `flight_itineraries` | Itens marcados como `operator_suggestion` | Alerta visual na aba de Voos     | Falha ao ligar trechos       | Manual | PARCIAL          |
| **2. Diff Engine** | Comparação dos segmentos vigentes vs novos | Diff de cores na tela (vigente vs sugestão) | `flight-reconciliation` | `flight_segments`    | Interface visual de alteração             | Notificação de reacomodação      | Segmento órfão sem ID        | Manual | PARCIAL          |
| **3. Aceite**      | Clique do cliente no Portal do Cliente     | Aceite do novo itinerário pelo celular      | `m.checkin.$token`      | `flight_itineraries` | Itinerário promovido a `confirmed`        | Sincronia de bilhetes e vouchers | Falha ao arquivar antigo     | Manual | PARCIAL          |
| **4. Sincronia**   | Trigger de banco pós-aceite                | Atualização automática da aba Bilhetes      | `sync_flight_itinerary` | `boarding_tickets`   | Bilhetes atualizados no portal            | Documentos do portal atualizados | Falha no trigger do Postgres | Manual | REAL NÃO TESTADO |

---

## 6. Fluxo: Omnichannel de Atendimento (Tickets)

Ingestão de e-mails, triagem automática, acompanhamento de suporte e envio de respostas integradas.

| Etapa              | Entrada                        | Regra                                     | Código        | Tabela            | Saída                        | Propagação                       | Erro                         | Teste  | Status  |
| :----------------- | :----------------------------- | :---------------------------------------- | :------------ | :---------------- | :--------------------------- | :------------------------------- | :--------------------------- | :----- | :------ |
| **1. Mensagem**    | E-mail recebido ou chat aberto | Ingestão e vínculo com o ticket existente | `omnichannel` | `ticket_messages` | Mensagem adicionada à thread | Notificação push para os agentes | Remetente não identificado   | Manual | PARCIAL |
| **2. Envio**       | Resposta escrita pelo agente   | Chamada de APIs para envio real externo   | `gmail-send`  | `ticket_messages` | Mensagem enviada e salva     | Atualização de status do ticket  | Falha na autenticação da API | Manual | PARCIAL |
| **3. Thread Sync** | Resposta do cliente por e-mail | Agrupamento por ID de cabeçalho do e-mail | `gmail-sync`  | `ticket_messages` | Thread sincronizada no chat  | Notificação sonora no Admin      | Thread quebrada (sem header) | Manual | PARCIAL |

---

## 7. Fluxo: Grupos Terrestres e Ocupação (Rooming List)

Criação de grupo de excursão, venda de vagas, alocação de quartos e ônibus virtual.

| Etapa             | Entrada                       | Regra                                      | Código              | Tabela                  | Saída                           | Propagação                        | Erro                           | Teste  | Status           |
| :---------------- | :---------------------------- | :----------------------------------------- | :------------------ | :---------------------- | :------------------------------ | :-------------------------------- | :----------------------------- | :----- | :--------------- |
| **1. Grupo**      | Nome, datas, vagas e ônibus   | Criação de grupo terrestre no banco        | `group-tours`       | `group_tours`           | Grupo ativo para inscrições     | Disponibilidade na vitrine B2C    | Capacidade negativa            | Manual | REAL NÃO TESTADO |
| **2. Reservas**   | Inscrições de passageiros     | Associação de viagens individuais ao grupo | `trips`             | `trips`                 | Viagem vinculada ao grupo       | Passageiros listados no grupo     | Passageiro sem CPF             | Manual | REAL NÃO TESTADO |
| **3. Rooming**    | Alocação de quartos no painel | Inserção relacional por passageiro/quarto  | `RoomingList`       | `boarding_rooming_list` | Quartos salvos no banco         | Visibilidade no portal do cliente | Lotação do quarto estourada    | Manual | PARCIAL          |
| **4. Fechamento** | Clique em "Exportar Excel"    | Geração de planilha de quartos e hotéis    | `exportRoomingList` | Nenhuma                 | Arquivo XLSX baixado localmente | Envio para e-mail do hotel        | Passageiro duplicado no quarto | Manual | PARCIAL          |
