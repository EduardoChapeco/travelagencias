# 00. Mapa de Domínios - TravelOS

Este documento apresenta a auditoria técnica de engenharia de todos os 22 domínios do TravelOS, detalhando as regras operacionais, os fluxos do banco de dados e as integrações.

---

## 1. Autenticação e Onboarding

- **Evento Inicial:** Cadastro de novo usuário via `/auth/register` ou convite de agência `/m/invite/$token`.
- **Pré-condições:** Usuário não autenticado ou novo no sistema.
- **Dados de Entrada:** Email, senha, nome, CNPJ da agência, nome fantasia, slug da URL desejada.
- **Validações:** Validade matemática do CNPJ (CNPJ real), tamanho mínimo do slug (3 caracteres), e-mail válido no formato.
- **Fonte Única de Verdade:** Tabelas `public.agencies`, `public.profiles`, e `public.user_roles`.
- **Regras de Negócio:**
  1. O usuário que realiza o onboarding torna-se automaticamente `agency_admin` (dono/administrador da agência).
  2. O slug da agência deve ser sanitizado em minúsculas, sem caracteres especiais e único no sistema.
- **Estados Permitidos:** Onboarding incompleto (`onboarding_completed = false`), Onboarding completo (`onboarding_completed = true`).
- **Transições de Estado:** `false` para `true` no momento do sucesso da execução da RPC `create_agency_onboarding`.
- **Persistência:** Tabelas `public.agencies`, `public.agency_private`, `public.profiles`, e `public.user_roles`.
- **Efeitos Colaterais:** Criação de perfil inicial do usuário e da agência com RLS ativado.
- **Integrações Chamadas:** API pública do CNPJ (Minha Receita/Receita WS) para preenchimento de endereço e razão social.
- **Eventos Gerados:** Cadastro inicial concluído.
- **Propagação para Outros Módulos:** Redirecionamento de rotas pelo `auth-routing.ts`.
- **Condição de Sucesso:** RPC `create_agency_onboarding` retornar com sucesso e redirecionar para `/agency/$slug`.
- **Condição de Término:** Dashboard da agência carregado com as variáveis CSS de marca aplicadas.
- **Erros Possíveis:** Slug duplicado no banco de dados, CNPJ inválido, token expirado, falha de rede na busca de CNPJ.
- **Retentativas:** Manual na interface pelo usuário.
- **Idempotência:** Garantida pelo `ON CONFLICT` na tabela `profiles` e `agency_private` e validação de slug exclusivo na RPC.
- **Rollback/Compensação:** A RPC executa em transação implícita do Postgres; qualquer erro reverte a criação de todas as tabelas modificadas no bloco SQL.
- **Logs e Evidências:** Gravado na tabela `audit_log` via trigger/serviço com o evento `onboarding_completed`.

---

## 2. Agências, Usuários, Papéis e Permissões (RBAC)

- **Evento Inicial:** Agente admin convida colega em `/agency/$slug/team` ou altera papel de usuário.
- **Pré-condições:** Usuário logado ser `agency_admin` ou possuir privilégio de escrita na equipe.
- **Dados de Entrada:** E-mail do convidado, papel atribuído (`agency_admin`, `agent`, `collaborator`), agência vinculada.
- **Validações:** O e-mail não pode pertencer a um membro já ativo na mesma agência.
- **Fonte Única de Verdade:** Tabela `public.user_roles`, `public.agency_members`, e `public.agency_invites`.
- **Regras de Negócio:**
  1. Isolamento multi-tenant estrito: RLS garante que membros só visualizem registros do seu próprio `agency_id`.
  2. Nível mínimo de permissão para ler logs e alterar configurações globais (`agency_admin`).
- **Estados Permitidos:** Convidado (`pending`), Membro Ativo (`active`), Inativo (`inactive`).
- **Transições de Estado:** `pending` -> `active` ao aceitar o convite em `/m/invite/$token`.
- **Persistência:** Tabelas `public.user_roles`, `public.agency_members`, e `public.agency_invites`.
- **Efeitos Colaterais:** Geração de token criptográfico de convite.
- **Integrações Chamadas:** Envio de e-mail de convite pelo Resend.
- **Eventos Gerados:** `invite_created`, `member_joined`.
- **Propagação para Outros Módulos:** Atualização automática do cache de permissões do cliente.
- **Condição de Sucesso:** O novo membro consegue se logar e ver os dados da agência.
- **Condição de Término:** Sessão ativa iniciada com o tenant ID correto.
- **Erros Possíveis:** Falha de envio de e-mail, expiração do convite (24h), violação de RLS.
- **Retentativas:** Reenvio manual do convite pelo admin da agência.
- **Idempotência:** Chave única composta em `user_roles(user_id, role, agency_id)`.
- **Rollback/Compensação:** Desfazer convite deleta o token gerado na tabela `agency_invites`.
- **Logs e Evidências:** Ação registrada em `audit_log` sob a tag `user_management`.

---

## 3. CRM e Leads

- **Evento Inicial:** Captura de formulário público de interesse (Lead B2C) ou criação manual de lead em `/agency/$slug/crm`.
- **Pré-condições:** Agência ativa.
- **Dados de Entrada:** Nome, e-mail, telefone, destino de interesse, orçamento aproximado, data de viagem, campos customizados.
- **Validações:** Nome e forma de contato (e-mail ou celular) obrigatórios.
- **Fonte Única de Verdade:** Tabela `public.leads` e `public.lead_activities`.
- **Regras de Negócio:**
  1. Leads recebidos por formulário público entram no estágio `novo`.
  2. Cada lead deve pertencer a um `assigned_agent_id` ou ficar na fila global de distribuição da agência.
- **Estados Permitidos:** `novo`, `qualificado`, `proposta_enviada`, `negociacao`, `convertido`, `perdido`.
- **Transições de Estado:** Kanban drag-and-drop ou manual via RPC `update_lead_status` para auditoria e controle de concorrência.
- **Persistência:** Tabela `public.leads`, `public.lead_activities`.
- **Efeitos Colaterais:** Geração de tarefa no calendário do agente para acompanhamento.
- **Integrações Chamadas:** Webhooks de notificação externa (WhatsApp/Slack configurados no integrador).
- **Eventos Gerados:** `lead_created`, `lead_promoted`, `lead_lost`.
- **Propagação para Outros Módulos:** Ao converter o lead, aciona RPC `promote_lead_to_client` para gerar a entidade de passageiro/cliente.
- **Condição de Sucesso:** Status do lead alterado com o log de histórico salvo em `lead_activities`.
- **Condição de Término:** Conversão em proposta de viagem ou arquivamento do lead.
- **Erros Possíveis:** Perda silenciosa de campos customizados JSONB, duplicidade de leads pelo mesmo formulário.
- **Retentativas:** O hook React Query reexecuta em caso de falha de conexão na listagem.
- **Idempotência:** Chave do webhook externo ou id único para formulários.
- **Rollback/Compensação:** A despromoção de um lead de volta a ativo não apaga o cliente criado para evitar perda de dados, mas altera o status do lead.
- **Logs e Evidências:** Histórico completo de alterações em `lead_activities` com o `actor_id` (agente responsável).

---

## 4. Cotações e Propostas

- **Evento Inicial:** Criação de proposta de orçamento em `/agency/$slug/proposals/new` a partir de um lead ou do zero.
- **Pré-condições:** Agência ativa, cliente ou lead vinculado.
- **Dados de Entrada:** Destino, datas, trechos aéreos, hotéis, regime, passeios, valores, moedas, taxa de câmbio e comissões.
- **Validações:** Valor total deve ser recalculado no backend para evitar fraudes client-side; moedas devem conter cotação base.
- **Fonte Única de Verdade:** Tabela `public.proposals` e tabelas filhas `public.proposal_items`.
- **Regras de Negócio:**
  1. Recálculo automático de comissões e totais baseados nos markups de fornecedores.
  2. Validade padrão da proposta é de 7 dias ou até alteração tarifária dos fornecedores.
- **Estados Permitidos:** `rascunho`, `enviada`, `aceita`, `recusada`, `expirada`.
- **Transições de Estado:** `rascunho` -> `enviada` -> `aceita` / `recusada`.
- **Persistência:** Tabela `public.proposals`, `public.proposal_items`.
- **Efeitos Colaterais:** Congelamento temporário da cotação de câmbio se aplicável.
- **Integrações Chamadas:** GDS Infotravel (opcional para busca de tarifas em tempo real), Gemini para sugestão de roteiros.
- **Eventos Gerados:** `proposal_created`, `proposal_viewed` (rastreio de abertura do link público).
- **Propagação para Outros Módulos:** Ao ser aceita, propaga dados para o módulo de Viagens para iniciar a conversão.
- **Condição de Sucesso:** Proposta salva no banco e link público `/m/proposal/$token` gerado e acessível.
- **Condição de Término:** Aceite jurídico ou cancelamento da proposta.
- **Erros Possíveis:** Recálculo errôneo por arredondamento de centavos, JSON de itens corrompido, e-mail de envio não disparado.
- **Retentativas:** Salvamento automático de rascunhos no client-side.
- **Idempotência:** `id` UUID gerado no client-side para o rascunho impede criação múltipla em cliques seguidos.
- **Rollback/Compensação:** Caso o aceite dê erro no banco, o estado no front é revertido e o usuário recebe um toast de erro.
- **Logs e Evidências:** Histórico gravado sob `audit_log` com os detalhes da visualização.

---

## 5. Conversão em Reserva / Viagem

- **Evento Inicial:** Clique em "Converter em Viagem" após o aceite da proposta em `/agency/$slug/proposals/$id` ou via webhook público.
- **Pré-condições:** Proposta no estado `aceita` e dados cadastrais mínimos do pagador preenchidos.
- **Dados de Entrada:** Proposta ID, dados de pagamento acordados, informações KYC dos passageiros.
- **Validações:** A proposta não pode ter sido previamente convertida para evitar reservas duplicadas no mesmo PNR.
- **Fonte Única de Verdade:** RPC `convert_proposal_to_trip` e tabela `public.trips`.
- **Regras de Negócio:**
  1. Copiar dados de hotéis, voos, transfers e serviços da proposta para as tabelas operacionais da viagem (`flight_itineraries`, `boarding_cards`, `trip_confirmation_items`).
  2. Vincular todos os passageiros da proposta como membros da viagem na tabela `trip_passengers`.
- **Estados Permitidos:** Conversão pendente, Convertido.
- **Transições de Estado:** Proposta passa para status `convertido` e cria uma viagem no status `reservado`.
- **Persistência:** Tabelas `public.trips`, `public.trip_passengers`, `public.flight_itineraries`, `public.boarding_cards`.
- **Efeitos Colaterais:** Geração de lançamentos a pagar e a receber no Financeiro da viagem.
- **Integrações Chamadas:** Nenhuma integração externa direta; manipulação de tabelas locais.
- **Eventos Gerados:** `trip_created_from_proposal`.
- **Propagação para Outros Módulos:** Notificação para o módulo financeiro de que existem novos recebíveis.
- **Condição de Sucesso:** A transação do Postgres concluir todas as inserções e retornar o ID da nova viagem.
- **Condição de Término:** Viagem ativa criada e listada em `/agency/$slug/trips`.
- **Erros Possíveis:** Falha de chave estrangeira (FK) se algum ID de passageiro não bater, falha de transação, dados de itens vazios.
- **Retentativas:** O agente é instruído a tentar novamente se houver falhas transacionais.
- **Idempotência:** A proposta é marcada com `converted_at` e `converted_trip_id`. Se a RPC rodar novamente para a mesma proposta, ela retorna o ID existente em vez de criar uma nova.
- **Rollback/Compensação:** Toda a operação ocorre em um bloco de transação (`BEGIN ... COMMIT`). Qualquer erro causa rollback automático.
- **Logs e Evidências:** Log detalhado com o mapa de conversão de IDs em `audit_log`.

---

## 6. Viagens e Grupos

- **Evento Inicial:** Criação de grupo terrestre em `/agency/$slug/group-tours` ou vinculação de viagens individuais a uma excursão.
- **Pré-condições:** Agência ativa.
- **Dados de Entrada:** Nome do grupo, destino principal, data de partida e retorno, capacidade de vagas, preços e regras.
- **Validações:** Data de retorno não pode ser menor que a data de partida; a capacidade deve ser um inteiro positivo.
- **Fonte Única de Verdade:** Tabela `public.group_tours` e associação em `public.trips.group_tour_id`.
- **Regras de Negócio:**
  1. O status financeiro do grupo é o acumulado das faturas de todas as viagens vinculadas.
  2. A exclusão de um grupo não remove as viagens individuais, apenas remove a associação (`group_tour_id = null`).
- **Estados Permitidos:** `planejamento`, `ativo`, `confirmado`, `encerrado`, `cancelado`.
- **Transições de Estado:** Manual pelo coordenador do grupo no painel.
- **Persistência:** Tabelas `public.group_tours`, `public.trips`.
- **Efeitos Colaterais:** Geração automática do mapa de assentos (ônibus virtual) e rooming list consolidado do grupo.
- **Integrações Chamadas:** Nenhuma.
- **Eventos Gerados:** `group_tour_status_changed`.
- **Propagação para Outros Módulos:** Se o grupo for cancelado, todas as viagens vinculadas entram em auditoria para estorno/cancelamento.
- **Condição de Sucesso:** Grupo criado e viagens associadas com sucesso.
- **Condição de Término:** Fechamento financeiro do grupo após o retorno.
- **Erros Possíveis:** Lotação estourada por inserções concorrentes de passageiros.
- **Retentativas:** Interface solicita recarregamento se houver conflito de vagas.
- **Idempotência:** Evitada colisão de assentos por chaves compostas em `bus_seat_allocations`.
- **Rollback/Compensação:** Desfazer o grupo restaura o status individual das viagens.
- **Logs e Evidências:** Registrado em `audit_log` sob categoria `group_operations`.

---

## 7. Passageiros (Passageiros e KYC)

- **Evento Inicial:** Inserção de passageiro em `/agency/$slug/trips/$id/passengers` ou via formulário de checkout público.
- **Pré-condições:** Viagem ou lead criada.
- **Dados de Entrada:** Nome completo, CPF, RG, passaporte, data de nascimento, celular, e-mail, restrições alimentares, dados de saúde.
- **Validações:** CPF ou passaporte obrigatório dependendo do destino (nacional/internacional).
- **Fonte Única de Verdade:** Tabela `public.trip_passengers`.
- **Regras de Negócio:**
  1. Um passageiro pode estar associado a múltiplas viagens, mas cada viagem armazena um snapshot dos documentos para fins de voucher e check-in histórico.
  2. O status dos documentos de viagem (visto, validade de passaporte > 6 meses) deve ser calculado dinamicamente.
- **Estados Permitidos:** Cadastro incompleto, Documentação pendente, Aprovado.
- **Transições de Estado:** Baseadas no preenchimento de campos obrigatórios e verificação de validade de passaporte.
- **Persistência:** Tabela `public.trip_passengers` e arquivos de documentos no bucket `client-documents`.
- **Efeitos Colaterais:** Notificação de vistos pendentes com base no destino.
- **Integrações Chamadas:** OCR de documentos (Gemini Flash) para extrair dados de passaportes e RGs anexados.
- **Eventos Gerados:** `passenger_document_uploaded`, `passport_expired_alert`.
- **Propagação para Outros Módulos:** Mapeamento de nomes nos bilhetes aéreos e listas de quartos (Rooming List).
- **Condição de Sucesso:** Passageiro inserido com os dados corretos e arquivo persistido no Storage.
- **Condição de Término:** Passageiro embarcado.
- **Erros Possíveis:** Sobrescrita de documentos por nomes duplicados no Storage, OCR falhar em extrair dados borrados.
- **Retentativas:** O agente pode acionar o OCR manualmente caso a ingestão automática falhe.
- **Idempotência:** Chave do passageiro baseada no CPF ou Passaporte para evitar cadastros duplicados na mesma agência.
- **Rollback/Compensação:** Deleção física do arquivo no Storage em caso de falha de persistência no banco.
- **Logs e Evidências:** Auditoria de acessos aos dados sensíveis (LGPD) em `audit_log`.

---

## 8. Pagamentos e Faturamento

- **Evento Inicial:** Cliente realiza pagamento de sinal de viagem em `/m/payment/$token` ou agente lança recebimento manual.
- **Pré-condições:** Fatura/Lançamento gerado no Financeiro da viagem.
- **Dados de Entrada:** Valor, método de pagamento (Pix, Cartão, Boleto), comprovante físico (arquivo PDF/PNG), código de autorização.
- **Validações:** Valor pago deve bater com o valor da parcela (ou tolerância de centavos); arquivo do comprovante deve ser real.
- **Fonte Única de Verdade:** Tabela `public.financial_records`, `public.financial_receipts` e bucket de arquivos `receipts`.
- **Regras de Negócio:**
  1. Upload Pix B2C real: O cliente deve obrigatoriamente fazer o upload do arquivo de comprovante e este deve ser gravado no bucket de `receipts`.
  2. A reconciliação bancária marca a fatura como `pago` e atualiza o DRE da agência.
- **Estados Permitidos:** `pendente`, `em_analise` (aguardando conferência do comprovante), `pago`, `cancelado`, `estornado`.
- **Transições de Estado:** `pendente` -> `em_analise` (após upload) -> `pago` (após aprovação do agente).
- **Persistência:** Tabelas `public.financial_records`, `public.financial_receipts`.
- **Efeitos Colaterais:** Disparo de e-mail de recibo para o cliente.
- **Integrações Chamadas:** Gateway de pagamento Pix (se integrado) ou envio manual de arquivo para o Supabase Storage.
- **Eventos Gerados:** `payment_received`, `receipt_approved`.
- **Propagação para Outros Módulos:** Atualiza o saldo restante da viagem e libera a emissão de vouchers se o contrato estiver assinado.
- **Condição de Sucesso:** Comprovante persistido no Storage, registro de faturamento associado criado e fatura atualizada.
- **Condição de Término:** Quitação total da viagem.
- **Erros Possíveis:** Perda silenciosa de uploads se a gravação no Storage falhar mas o registro do banco continuar ativo, upload de arquivos fakes (resolvido com a validação estrita do bucket).
- **Retentativas:** Notificação de falha de upload com solicitação de reenvio.
- **Idempotência:** ID da parcela vinculado ao pagamento impede duplicidade de registros financeiros no mesmo vencimento.
- **Rollback/Compensação:** A rejeição do comprovante devolve o status da fatura para `pendente` e gera notificação ao cliente.
- **Logs e Evidências:** Registros em `audit_log` e e-mails enviados salvos na thread de mensagens.

---

## 9. Fornecedores

- **Evento Inicial:** Cadastro de parceiro/fornecedor em `/agency/$slug/suppliers` ou importação de voucher/fatura via OCR.
- **Pré-condições:** Agência ativa.
- **Dados de Entrada:** Nome, CNPJ, Razão Social, contatos de emergência, produtos oferecidos, margem de comissão padrão.
- **Validações:** Nome fantasia único para o tenant.
- **Fonte Única de Verdade:** Tabela `public.suppliers`, `public.supplier_products`, `public.supplier_contacts` e `public.supplier_files`.
- **Regras de Negócio:**
  1. OCR Ingestion: Upload de faturas de hotéis e tarifas permite extrair contatos e produtos automaticamente usando Gemini Flash.
  2. Os produtos cadastrados ficam disponíveis no autocomplete das propostas e vouchers da agência.
- **Estados Permitidos:** `ativo`, `inativo`.
- **Transições de Estado:** Manual pelo painel administrativo do fornecedor.
- **Persistência:** Tabelas listadas em fonte de verdade.
- **Efeitos Colaterais:** Geração de base histórica de custos de viagem.
- **Integrações Chamadas:** Gemini Flash API via Edge Function `supplier-ocr-extractor`.
- **Eventos Gerados:** `supplier_created`, `supplier_ocr_processed`.
- **Propagação para Outros Módulos:** Alimentação do módulo de propostas com o catálogo de tarifas atualizadas.
- **Condição de Sucesso:** Inserção bem-sucedida de contatos e tarifas vinculadas no clique do agente.
- **Condição de Término:** Fornecedor cadastrado e revisado.
- **Erros Possíveis:** OCR retornar JSON corrompido, duplicidade de contatos após reprocessamento.
- **Retentativas:** Processamento em lote de arquivos OCR.
- **Idempotência:** A reimportação de um arquivo com o mesmo hash do Storage ignora a chamada da API do Gemini e lê o cache local.
- **Rollback/Compensação:** Reverter OCR apaga os contatos importados temporariamente se o agente não salvar.
- **Logs e Evidências:** logs de processamento na tabela `supplier_files.ocr_data`.

---

## 10. Pacotes e Roteiros

- **Evento Inicial:** Agente cria pacote público em `/agency/$slug/group-tours` com modelo de vitrine ativado.
- **Pré-condições:** Templates de roteiros criados no CMS.
- **Dados de Entrada:** Título, descrição comercial, galeria de fotos, cronograma diário, itens inclusos e não inclusos.
- **Validações:** Datas do pacote devem conter trechos de hospedagem correspondentes.
- **Fonte Única de Verdade:** Tabela `public.group_tours` e `public.portal_pages`.
- **Regras de Negócio:**
  1. A publicação gera um link público acessível na vitrine B2C da agência.
  2. A alteração de valores na vitrine não afeta reservas que já foram contratadas e estão com sinal pago.
- **Estados Permitidos:** `rascunho`, `publicado`, `vitrine_arquivada`.
- **Transições de Estado:** Botão publicar na interface do criador de pacotes.
- **Persistência:** Tabelas `group_tours` e `portal_pages` (seção de vitrine).
- **Efeitos Colaterais:** Criação automática de landing page SEO-friendly para o pacote.
- **Integrações Chamadas:** Nenhuma externa.
- **Eventos Gerados:** `package_published`.
- **Propagação para Outros Módulos:** Geração automática de leads para clientes que enviarem formulário de interesse na página pública.
- **Condição de Sucesso:** Pacote visível na rota pública `/p/$slug/tour/$id`.
- **Condição de Término:** Encerramento das vendas do pacote.
- **Erros Possíveis:** Roteiros sem imagens quebrando layout, links públicos quebrados devido a slugs duplicados.
- **Retentativas:** Manual pelo admin.
- **Idempotência:** Chave do slug do pacote garante integridade.
- **Rollback/Compensação:** Despublicar altera `is_published` para `false` removendo a visibilidade sem apagar dados.
- **Logs e Evidências:** Logs de auditoria do CMS.

---

## 11. Contratos e Adendos

- **Evento Inicial:** Envio de contrato para assinatura do cliente na aba Contratos da Viagem `/agency/$slug/trips/$id/contract`.
- **Pré-condições:** Passageiros e dados da viagem salvos no banco de dados.
- **Dados de Entrada:** Cláusulas selecionadas, dados KYC do contratante, assinatura manuscrita digitalizada, IP, logs do browser.
- **Validações:** As assinaturas exigem verificação multifator ou termos claros de aceite jurídico; o PDF deve ser um snapshot imutável.
- **Fonte Única de Verdade:** Tabela `public.trip_contracts`, `public.contract_signatures` e bucket de PDFs `contracts`.
- **Regras de Negócio:**
  1. O contrato assinado gera um hash criptográfico (SHA-256) dos dados no momento do aceite.
  2. Adendos geram um novo arquivo contratual anexo, encadeado ao contrato principal, mantendo o histórico de versões.
- **Estados Permitidos:** `rascunho`, `pendente_assinatura`, `assinado`, `cancelado`.
- **Transições de Estado:** `pendente` -> `assinado` no clique em `/m/contract/$token` coletando assinatura digital.
- **Persistência:** Tabelas `public.trip_contracts`, `public.contract_signatures` e arquivo PDF no storage.
- **Efeitos Colaterais:** Congelamento do itinerário da viagem (alterações exigirão um adendo contratual).
- **Integrações Chamadas:** html2pdf / pdfjs no frontend para geração de arquivos; e-mail de cópia assinado via Resend.
- **Eventos Gerados:** `contract_signed`, `addendum_attached`.
- **Propagação para Outros Módulos:** Liberação do status da viagem no financeiro e disparo de e-mails preventivos.
- **Condição de Sucesso:** Assinatura persistida, arquivo PDF real gravado no bucket de contratos, status do contrato `assinado`.
- **Condição de Término:** Contrato assinado por todos os passageiros pagadores.
- **Erros Possíveis:** Download de PDF com dados antigos se o cache local não reconciliar, falha no upload do PDF assinado deixando o status inconsistente com o Storage.
- **Retentativas:** Envio de lembrete de assinatura automático por e-mail ou WhatsApp.
- **Idempotência:** A assinatura gera um hash da transação; se a requisição for reenviada com o mesmo hash, ela apenas retorna o contrato já assinado.
- **Rollback/Compensação:** A recusa do contrato reverte para status `rascunho` para o agente poder editar as cláusulas.
- **Logs e Evidências:** Logs detalhados de IP, User-Agent, carimbo de data/hora e hash do documento salvos no banco.

---

## 12. Confirmação de Reserva

- **Evento Inicial:** Lançamento de localizadores na aba Confirmação `/agency/$slug/trips/$id/confirmation`.
- **Pré-condições:** Viagem no estado ativo.
- **Dados de Entrada:** Código localizador (PNR), fornecedor, tipo de serviço, notas de confirmação.
- **Validações:** PNR deve ter formato correspondente ao fornecedor (ex: 6 caracteres alfanuméricos para companhias aéreas).
- **Fonte Única de Verdade:** Tabela `public.trip_confirmation_items`.
- **Regras de Negócio:**
  1. A inserção do localizador atualiza o status de confirmação do item da viagem para `confirmed`.
  2. Localizadores inseridos são exibidos em tempo real no portal do cliente.
- **Estados Permitidos:** `pending`, `confirmed`, `rejected`.
- **Transições de Estado:** Manual pelo agente de viagens.
- **Persistência:** Tabela `public.trip_confirmation_items`.
- **Efeitos Colaterais:** Geração de bilhete correspondente se for um serviço aéreo.
- **Integrações Chamadas:** Nenhuma externa.
- **Eventos Gerados:** `item_confirmed`.
- **Propagação para Outros Módulos:** Notificação na linha do tempo da viagem.
- **Condição de Sucesso:** Localizador salvo e propagado ao portal.
- **Condição de Término:** Todos os itens da viagem marcados como confirmados.
- **Erros Possíveis:** PNR digitado errado induzindo passageiro ao erro no check-in.
- **Retentativas:** Edição manual do PNR pelo agente a qualquer momento.
- **Idempotência:** Chave única sobre `trip_id`, `service_type` e `record_locator`.
- **Rollback/Compensação:** Reversão do status de confirmação remove o item do portal do cliente.
- **Logs e Evidências:** Registrado no histórico da viagem (`trip_history`).

---

## 13. Vouchers e Documentos

- **Evento Inicial:** Geração de voucher de viagem na aba Vouchers da viagem ou central de vouchers `/agency/$slug/vouchers`.
- **Pré-condições:** Viagem com itens confirmados e contrato assinado.
- **Dados de Entrada:** Itinerários selecionados, hotéis confirmados, dados de contatos locais, logo da agência.
- **Validações:** O voucher deve conter telefones de suporte de emergência e horários locais corretos.
- **Fonte Única de Verdade:** Tabela `public.boarding_cards`, `public.flight_itineraries`.
- **Regras de Negócio:**
  1. O voucher pode ser gerado no formato A4 (Impressão) ou formato Story (Mobile).
  2. Vouchers impressos devem usar fontes seguras offline para evitar quebras em PDFs gerados localmente.
- **Estados Permitidos:** Rascunho, Gerado, Enviado.
- **Transições de Estado:** Ação de gerar e exportar PDF na interface.
- **Persistência:** PDFs de vouchers salvos no bucket `vouchers`.
- **Efeitos Colaterais:** Liberação para exibição no portal do cliente móvel.
- **Integrações Chamadas:** html2canvas e jsPDF no browser do cliente para compilar a imagem.
- **Eventos Gerados:** `voucher_generated`.
- **Propagação para Outros Módulos:** Notificação de liberação de documentos enviada por e-mail/WhatsApp.
- **Condição de Sucesso:** PDF do voucher salvo no bucket e disponível para download.
- **Condição de Término:** Cliente recebe o link de download.
- **Erros Possíveis:** Fontes do Google não carregarem a tempo deixando o layout desalinhado, timeout de renderização de imagens pesadas.
- **Retentativas:** Regeneração manual do voucher.
- **Idempotência:** A geração gera um arquivo estático nomeado com a versão e o ID da viagem, evitando re-gerações desnecessárias.
- **Rollback/Compensação:** Exclusão do voucher do bucket e recriação se os dados da viagem mudarem.
- **Logs e Evidências:** Logs de geração salvos em `audit_log`.

---

## 14. Aéreos, Reconciliação e Reacomodação

- **Evento Inicial:** Mudança de malha aérea detectada pela cia ou agente lança alternativa de voo em `/agency/$slug/trips/$id/flights`.
- **Pré-condições:** Viagem com voo confirmado associado.
- **Dados de Entrada:** Novo itinerário, trechos, horários de partida/chegada atualizados.
- **Validações:** As conexões de reacomodação devem respeitar o tempo mínimo de conexão (MCT).
- **Fonte Única de Verdade:** Tabelas `public.flight_itineraries`, `public.flight_segments` e `public.boarding_events`.
- **Regras de Negócio:**
  1. Motor de diff: A interface compara o itinerário vigente (`confirmed`) com a proposta da operadora (`operator_suggestion`) exibindo alertas visuais de atraso ou cancelamento.
  2. O aceite da reacomodação pelo cliente em `/m/checkin/$token` arquiva o itinerário antigo e promove a sugestão a confirmado, sincronizando os bilhetes de embarque.
- **Estados Permitidos:** Itinerário ativo (`active`), Sugestão de operadora (`operator_suggestion`), Arquivado (`archived`).
- **Transições de Estado:** `operator_suggestion` -> `confirmed` e antigo `confirmed` -> `archived` na RPC `accept_public_reaccommodation`.
- **Persistência:** Tabelas `flight_itineraries`, `flight_segments`, `boarding_events`.
- **Efeitos Colaterais:** Disparo de notificações via e-mail e WhatsApp para o cliente.
- **Integrações Chamadas:** Webhooks operacionais de WhatsApp (Evolution API/Z-API se ativas).
- **Eventos Gerados:** `reaccommodation_offered`, `reaccommodation_accepted`.
- **Propagação para Outros Módulos:** Atualiza transfer, hotéis e documentos regenerados no portal do cliente automaticamente.
- **Condição de Sucesso:** Novo itinerário promovido, logs criados, e itinerários sincronizados com os cartões de embarque.
- **Condição de Término:** Confirmação de novo assento pela operadora.
- **Erros Possíveis:** Exclusão acidental do itinerário ativo sem trigger de rollback de segurança, descompasso entre a aba "Aéreos" e a aba "Bilhetes".
- **Retentativas:** Processo manual de reacomodação pelo agente caso o cliente recuse a primeira alternativa.
- **Idempotência:** Garantida na RPC `accept_public_reaccommodation` validando se o itinerário proposto pertence de fato à viagem.
- **Rollback/Compensação:** O cancelamento da proposta de reacomodação pelo agente restaura o itinerário confirmed original.
- **Logs e Evidências:** Histórico auditável de versões e aceites armazenado em `boarding_events` com IP do cliente.

---

## 15. Check-in e Embarque

- **Evento Inicial:** Abertura da janela de check-in (geralmente 48h antes do voo) listada em `/agency/$slug/boarding` ou acesso do cliente a `/m/checkin/$token`.
- **Pré-condições:** Voos confirmados na viagem com localizadores preenchidos.
- **Dados de Entrada:** Status de check-in, checklists de bagagem/assentos marcados pelo passageiro, overrides manuais de links de companhias aéreas.
- **Validações:** Overrides de links de check-in devem conter URLs seguras (HTTPS).
- **Fonte Única de Verdade:** Tabela `public.boarding_cards`, `public.checkin_links`, `public.boarding_events`.
- **Regras de Negócio:**
  1. Ações no portal do cliente (clique em "Iniciar Check-in", "Voo Atrasado") geram eventos em `boarding_events` e criam tickets urgentes de suporte.
  2. O admin visualiza o status de todos os passageiros da viagem no painel Kanban de Embarques.
- **Estados Permitidos:** `unverified`, `checkin_open`, `checked_in`, `boarded`, `no_show`, `issue`.
- **Transições de Estado:** Baseadas nos cliques do passageiro ou atualizações do painel do agente.
- **Persistência:** Tabelas listadas em fonte de verdade.
- **Efeitos Colaterais:** Abertura de tickets com prioridade `high` se o cliente reportar atraso/cancelamento.
- **Integrações Chamadas:** Deeplinks inteligentes baseados nas regras das cias aéreas (utiliza sobrenome do passageiro e localizador).
- **Eventos Gerados:** `checkin_link_clicked`, `flight_emergency_reported`.
- **Propagação para Outros Módulos:** Geração automática de atendimentos no Omnichannel de suporte.
- **Condição de Sucesso:** Passageiro realiza o check-in na cia e marca o checklist como concluído no portal.
- **Condição de Término:** Passageiro embarcado (`boarded`) ou no-show.
- **Erros Possíveis:** Tabelas `checkin_links` ou `boarding_events` corrompidas ou sem políticas RLS corretas, quebrando o portal móvel.
- **Retentativas:** Tentativas de reconexão do formulário de checklist.
- **Idempotência:** ID único do evento de boarding impede duplicações na linha do tempo.
- **Rollback/Compensação:** Alterar status de embarque do passageiro reverte no Kanban do agente.
- **Logs e Evidências:** Logs detalhados de cliques com carimbo de hora salvos em `boarding_events`.

---

## 16. Rooming List

- **Evento Inicial:** Alocação de passageiros em quartos na aba Hospedagem `/agency/$slug/trips/$id/lodging` ou central `/agency/$slug/boarding`.
- **Pré-condições:** Hospedagem confirmada na viagem, lista de passageiros cadastrada.
- **Dados de Entrada:** Número do quarto, tipo de quarto (single, double, triple, etc.), hotel, passageiros alocados, regime alimentar, notas.
- **Validações:** O número de passageiros alocados no quarto não deve exceder a capacidade permitida do tipo de quarto.
- **Fonte Única de Verdade:** Tabela `public.boarding_rooming_list`.
- **Regras de Negócio:**
  1. Evitar dupla fonte de verdade: Lógica antiga usava JSONB desnormalizado em `group_tours.rooming_list`. A fonte oficial deve ser a tabela normalizada `boarding_rooming_list`.
  2. Permitir exportação de listas de quartos formatadas para envio ao hotel.
- **Estados Permitidos:** Quarto rascunho, Quarto confirmado.
- **Transições de Estado:** Manual pelo agente de hospedagem.
- **Persistência:** Tabela `public.boarding_rooming_list`.
- **Efeitos Colaterais:** Atualização automática do regime de refeições e observações no painel de embarque de passageiros.
- **Integrações Chamadas:** Geração de planilha Excel no frontend via XLSX library.
- **Eventos Gerados:** `room_allocated`, `room_deleted`.
- **Propagação para Outros Módulos:** Sincroniza dados com o Portal do Cliente (o hóspede visualiza o número do seu quarto e regime).
- **Condição de Sucesso:** Alocação salva no banco relacional e renderizada no painel de controle.
- **Condição de Término:** Todos os passageiros da viagem/grupo alocados em seus respectivos quartos.
- **Erros Possíveis:** Passageiro alocado em dois quartos concorrentes na mesma data, perda silenciosa se houver dupla gravação concorrente JSONB vs Normalizada.
- **Retentativas:** Interface alerta em caso de dados concorrentes modificados.
- **Idempotência:** Chave composta ou validação de concorrência baseada em versionamento.
- **Rollback/Compensação:** A deleção de um quarto desaloca os passageiros, retornando-os à lista de passageiros "sem quarto".
- **Logs e Evidências:** Linha do tempo da viagem registra as alocações.

---

## 17. Tickets, Gmail, Resend e Notificações (Omnichannel)

- **Evento Inicial:** Cliente abre ticket no portal do cliente, envia e-mail de resposta para a agência ou agente inicia conversa em `/agency/$slug/omnichannel`.
- **Pré-condições:** Agência com conexões de e-mail ativas.
- **Dados de Entrada:** Texto da mensagem, e-mail do remetente/destinatário, anexo, ID do ticket.
- **Validações:** Limite de tamanho de anexos (geralmente 10MB), cabeçalhos de resposta válidos para manter a thread.
- **Fonte Única de Verdade:** Tabelas `public.support_tickets` e `public.ticket_messages`.
- **Regras de Negócio:**
  1. Envio real: Integração real via Edge Function para disparar e-mails via Resend/Gmail utilizando cabeçalho `In-Reply-To` para Thread Sync.
  2. SLA de atendimento: Triggers monitoram tempo sem resposta e geram alertas visuais no admin.
- **Estados Permitidos:** Ticket `open`, `in_progress`, `resolved`, `closed`.
- **Transições de Estado:** `open` -> `in_progress` (quando o agente responde) -> `resolved` -> `closed` (pelo cliente ou inatividade).
- **Persistência:** Tabelas `support_tickets`, `ticket_messages` e fila de mensagens pendentes de envio.
- **Efeitos Colaterais:** Envio de web-push e-mails preventivos para agentes se o SLA for estourado.
- **Integrações Chamadas:** Edge Functions `gmail-send`, `gmail-sync`, API do Resend.
- **Eventos Gerados:** `ticket_created`, `message_sent`, `sla_breached`.
- **Propagação para Outros Módulos:** Tickets criados via botão de emergência de voos ganham prioridade máxima no painel Kanban de suporte.
- **Condição de Sucesso:** E-mail entregue na caixa postal externa e log gravado com sucesso na thread.
- **Condição de Término:** Ticket arquivado.
- **Erros Possíveis:** APIs fora do ar, e-mails enviados sem gravação na thread local (perda silenciosa), falha na extração de Reply-Headers corrompendo a thread de chat.
- **Retentativas:** Fila de envio local com retentativa exponencial.
- **Idempotência:** Chave do cabeçalho da mensagem (`Message-ID`) impede inserção em duplicidade na sincronização de e-mails.
- **Rollback/Compensação:** Mensagem marcada como `failed` na interface com opção de reenvio se falhar na API externa.
- **Logs e Evidências:** Registrado na tabela de mensagens com status `sent` ou `failed` e logs das chamadas de API externas no console do Edge.

---

## 18. Portal do Cliente

- **Evento Inicial:** Cliente acessa `/client/trips/$id` ou o link móvel usando token seguro `/m/passenger/$token`.
- **Pré-condições:** Agência com portal ativado (`portal_enabled = true` em `trips`).
- **Dados de Entrada:** Token de acesso, ID da viagem.
- **Validações:** Validade e assinatura do token de login único (`client_login_tokens`).
- **Fonte Única de Verdade:** Tabelas `public.trips` (visualização reduzida), `public.trip_passengers`, `public.destination_info` (apenas revisados).
- **Regras de Negócio:**
  1. O portal exibe itinerário completo atualizado, vouchers para download, checklist de embarque interativo e canal de suporte de emergência.
  2. Isolamento de dados: O cliente de uma agência não deve sob hipótese alguma acessar dados ou designs de outra agência (Roteamento baseado em slug/token).
- **Estados Permitidos:** Acesso concedido, Acesso negado.
- **Transições de Estado:** Autenticação via token seguro do cliente.
- **Persistência:** Leitura síncrona do banco com gravação de visualizações na tabela `portal_analytics_and_clicks`.
- **Efeitos Colaterais:** Atualização automática do status "visto" na proposta ou voucher.
- **Integrações Chamadas:** Nenhuma externa.
- **Eventos Gerados:** `portal_accessed`, `document_downloaded`.
- **Propagação para Outros Módulos:** Incremento de cliques nas métricas do admin.
- **Condição de Sucesso:** Renderização fluida e flat do portal em dispositivos móveis, sem flickers tipográficos.
- **Condição de Término:** Fechamento da viagem.
- **Erros Possíveis:** Expiração precoce do token gerando frustração ao cliente, falha de RLS impedindo a leitura das tabelas operacionais pelo cliente anônimo.
- **Retentativas:** Re-geração rápida do token de acesso pelo agente e envio direto por WhatsApp.
- **Idempotência:** Não aplicável para visualização; logs de acessos são cumulativos.
- **Rollback/Compensação:** Não aplicável.
- **Logs e Evidências:** Registrado em `portal_analytics_and_clicks` com geolocalização aproximada por IP.

---

## 19. Destination Intelligence

- **Evento Inicial:** Agente aciona "Gerar Dicas de Destino" na rota administrativa `/agency/$slug/destination-intelligence` ou o sistema gera automaticamente ao definir destino do lead.
- **Pré-condições:** Destino mapeado.
- **Dados de Entrada:** Nome da cidade/país, perfil da viagem (familiar, aventura, corporativo).
- **Validações:** As informações geradas por IA devem ser submetidas a revisão humana obrigatória antes da publicação (`reviewed_at IS NOT NULL`).
- **Fonte Única de Verdade:** Tabela `public.destination_info`.
- **Regras de Negócio:**
  1. Apenas cartões marcados como revisados são exibidos no portal móvel do cliente.
  2. O conteúdo inclui vacinas obrigatórias, requisitos de visto, nível de segurança consular, dicas de clima e moedas locais.
- **Estados Permitidos:** `draft` (pendente de revisão), `published` (revisado e liberado).
- **Transições de Estado:** `draft` -> `published` no clique de aprovação do agente (`reviewed_at` preenchido).
- **Persistência:** Tabela `public.destination_info`.
- **Efeitos Colaterais:** Enriquecimento do roteiro de viagem com cartões informativos.
- **Integrações Chamadas:** Gemini Flash para geração de textos; API de clima/câmbio para dados dinâmicos.
- **Eventos Gerados:** `destination_tips_generated`, `destination_tips_published`.
- **Propagação para Outros Módulos:** Exibição nas abas "Destino" do portal do cliente.
- **Condição de Sucesso:** Texto coerente gerado no admin e renderizado com tags de segurança no portal.
- **Condição de Término:** Disponibilização das dicas no celular do cliente.
- **Erros Possíveis:** IA sugerir dados desatualizados (ex: vacina de febre amarela não exigida), URLs de expiração nulas ou corrompidas.
- **Retentativas:** Acionamento de nova geração por IA se o agente desejar reescrever o texto.
- **Idempotência:** Cache de destinos mais acessados evita requisições redundantes à API do Gemini.
- **Rollback/Compensação:** Despublicar remove o timestamp de revisão, retirando o cartão da visualização pública imediatamente.
- **Logs e Evidências:** Histórico de alterações e revisões no banco.

---

## 20. Site Builder, Biolink e CMS

- **Evento Inicial:** Agente cria página institucional ou biolink de vendas em `/agency/$slug/portal/pages`.
- **Pré-condições:** Agência com CMS ativado no plano.
- **Dados de Entrada:** Título da página, slug personalizado, seções e blocos de conteúdo (JSONB), SEO metadata, tags sociais.
- **Validações:** Slug não pode conflitar com rotas do sistema ou outras páginas da mesma agência.
- **Fonte Única de Verdade:** Tabela `public.portal_pages` e `public.portal_settings`.
- **Regras de Negócio:**
  1. Editor de blocos: Permite adicionar, remover e reordenar seções (Hero, Depoimentos, Vitrine de Pacotes, FAQ).
  2. Biolink móvel: Layout enxuto vertical com botões de contato rápido para redes sociais.
- **Estados Permitidos:** `draft` (rascunho), `published` (visível na web).
- **Transições de Estado:** `draft` -> `published` no switch da interface salvando a data de publicação.
- **Persistência:** Tabela `public.portal_pages` e configurações de design na tabela `portal_settings`.
- **Efeitos Colaterais:** Alteração do arquivo sitemap.xml público da agência.
- **Integrações Chamadas:** Upload de imagens do editor para o bucket `agency-media`.
- **Eventos Gerados:** `page_published`, `biolink_updated`.
- **Propagação para Outros Módulos:** Atualiza as landing pages dos pacotes vinculados na vitrine pública.
- **Condição de Sucesso:** A página é renderizada de forma pública com o Brand Kit da agência na rota `/p/$agency_slug/$page_slug`.
- **Condição de Término:** Indexação no sitemap e compartilhamento.
- **Erros Possíveis:** Alteração sem salvar deixando estado inconsistente, conflito de domínios customizados, JSON de blocos corrompido quebrando a renderização.
- **Retentativas:** Salvamento automático local (Draft autosave).
- **Idempotência:** A reordenação gera chaves de ordenação sequenciais únicas via RPC, evitando desalinhamento no banco.
- **Rollback/Compensação:** Restauração rápida a partir de snapshots de versões da página (tabela de histórico de versões).
- **Logs e Evidências:** Logs do editor de CMS salvos.

---

## 21. Admin Global

- **Evento Inicial:** Equipe de suporte do TravelOS gerencia agências, faturamento e planos em `/admin/agencies` ou `/admin/plans`.
- **Pré-condições:** Usuário logado ser `global_admin` (papel verificado na tabela `user_roles`).
- **Dados de Entrada:** Valores de planos, dados cadastrais de agências, limite de cotas, faturas globais, chaves de API do sistema.
- **Validações:** Proibida auto-promoção de papel ou alteração de agências sem auditoria estrita.
- **Fonte Única de Verdade:** Tabelas globais do sistema (`public.agencies`, `public.system_plans`, `public.agency_billing_subscriptions`).
- **Regras de Negócio:**
  1. Suspensão de agências inadimplentes bloqueia acesso a rotas `/agency/$slug` com fallback amigável de faturamento.
  2. Provisionamento de novas cotas e controle de upgrades de forma atômica no banco de dados.
- **Estados Permitidos:** Agência `active`, `suspended`, `trial`.
- **Transições de Estado:** Automatizadas via cron de cobrança ou manuais pelo admin global.
- **Persistência:** Tabelas administrativas centrais.
- **Efeitos Colaterais:** Desativação de integradores externos da agência suspensa.
- **Integrações Chamadas:** Gateway Stripe/Asaas para cobrança recorrente e prorrogação de assinatura.
- **Eventos Gerados:** `agency_suspended`, `plan_upgraded`.
- **Propagação para Outros Módulos:** Bloqueio de APIs e tokens do portal do cliente da agência afetada.
- **Condição de Sucesso:** Alteração de plano concluída com as restrições aplicadas no tenant.
- **Condição de Término:** Fechamento de ciclo de faturamento mensal.
- **Erros Possíveis:** Agência suspensa incorretamente por lag de Webhook do gateway, vazamento de chaves de API administrativas.
- **Retentativas:** Processamento em background de faturamento pendente com 3 tentativas antes de suspensão.
- **Idempotência:** Tokens de pagamento garantem idempotência em transações financeiras.
- **Rollback/Compensação:** Estorno de cobranças indevidas e reativação imediata via painel global.
- **Logs e Evidências:** Todos os acessos e modificações na tabela global gravados em `audit_log` sob flag `system_admin`.

---

## 22. Logs e Auditoria

- **Evento Inicial:** Qualquer ação de mutação (Criação, Atualização, Deleção) em tabelas críticas do sistema.
- **Pré-condições:** Trigger do banco ativo ou serviço de auditoria inicializado no backend/frontend.
- **Dados de Entrada:** Usuário ID, agência ID, tabela afetada, ação (`INSERT`, `UPDATE`, `DELETE`), valor antigo (`old_data`), valor novo (`new_data`), IP, localidade.
- **Validações:** O log deve ser gravado de forma imutável (tabela append-only, sem permissão de update/delete para usuários normais ou admins de agência).
- **Fonte Única de Verdade:** Tabela `public.audit_log`.
- **Regras de Negócio:**
  1. Ações financeiras, assinaturas de contratos e alterações de permissões de usuários DEVEM gerar logs de auditoria detalhados.
  2. Logs de auditoria não devem sofrer expiração antes de 5 anos (LGPD compliance).
- **Estados Permitidos:** Ativo (Histórico imutável).
- **Transições de Estado:** Sem transição. Os logs são de escrita única (`INSERT`).
- **Persistência:** Tabela `public.audit_log` (RLS de leitura restrita a admins globais e donos da agência).
- **Efeitos Colaterais:** Nossos triggers geram tabelas de log secundárias para auditoria forense rápida.
- **Integrações Chamadas:** Nenhuma (persistência direta em Postgres).
- **Eventos Gerados:** `audit_entry_created`.
- **Propagação para Outros Módulos:** Painel de segurança e histórico da viagem `/agency/$slug/trips/$id/history`.
- **Condição de Sucesso:** Inserção do registro de log sem afetar a performance da transação principal (uso de triggers rápidos ou escrita assíncrona).
- **Condição de Término:** Escrita concluída no banco.
- **Erros Possíveis:** Trigger quebrar e impedir a transação principal (falha crítica resolvida com tratamento de erros dentro do trigger), estouro de armazenamento por logs redundantes.
- **Retentativas:** Logs em triggers falham junto com a transação principal (Rollback total), garantindo consistência transacional absoluta.
- **Idempotência:** Logs contêm UUID do evento principal vinculados, impedindo duplicações.
- **Rollback/Compensação:** Se a transação principal for revertida, o log também é revertido (consistência forte).
- **Logs e Evidências:** O próprio registro do log é a evidência absoluta de toda e qualquer modificação no ecossistema TravelOS.
