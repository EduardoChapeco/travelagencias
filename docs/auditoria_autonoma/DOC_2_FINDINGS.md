# REGISTRO DE FINDINGS

## MÓDULO: FINANCEIRO (RODADA 1 — RESOLVIDO)
*(Consulte o histórico de alterações para detalhes dos findings F001 a F008 que foram totalmente remediados).*

---

## MÓDULO: GRUPOS & PACOTES (RODADA 2 — RESOLVIDO)
*(Todos os findings F011 a F017 do Módulo de Grupos e Pacotes foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F011** | Lógica de Negócio / BD | RPC `approve_group_enrollment` | O fluxo de aprovação de inscrição de grupo via RPC do Supabase cria um registro em `financial_records` como `paid`, mas não insere nenhum lançamento na tabela `cash_transactions`. | **Corrigido** (migration 20260813000000) |
| **F012** | Lógica de Negócio / UI | `agency.$slug.group-tours.$id.lazy.tsx` | Não há botão ou ação na interface para cancelar, excluir ou rejeitar uma inscrição de passageiro. | **Corrigido** (Botões Rejeitar/Cancelar implementados) |
| **F013** | Concorrência e UX | `agency.$slug.group-tours.$id.lazy.tsx` | Ao selecionar um passageiro para um assento já ocupado no mapa, o sistema executa o update removendo o ocupante antigo silenciosamente. | **Corrigido** (Modal de swap de assento implementado) |
| **F014** | Falhas Silenciosas | `agency.$slug.financial.groups.tsx` | Se as queries `ledgerQ` ou `paginatedToursQ` falharem por RLS ou erro de rede, o painel exibe listas vazias e mensagens de "Nenhum resultado" sem apresentar erros na UI. | **Corrigido** (Banner de erro adicionado) |
| **F015** | Falhas Silenciosas | `agency.$slug.group-tours.index.tsx` | Se a query principal de busca de excursões (`q`) falhar, a UI exibe o estado vazio "Sem excursões. Crie uma excursão...", ocultando o erro. | **Corrigido** (Banner de erro adicionado) |
| **F016** | Falhas Silenciosas | `agency.$slug.group-tours.$id.lazy.tsx` | Se a query de inscrições (`enrolQ`) falhar por permissões ou timeout, a interface renderiza "Nenhum passageiro inscrito" em vez de um alerta. | **Corrigido** (Banner de erro já presente no código) |
| **F017** | Consistência do Design System | `agency.$slug.financial.groups.tsx` | Uso de elementos `<button>` de paginação nativos estilizados localmente ao invés do componente `GhostButton` do Design System. | **Corrigido** (Padronizado com GhostButton) |

---

## MÓDULO: COTAÇÕES & PROPOSTAS (RODADA 3 — RESOLVIDO)
*(Todos os findings F021 e F022 do Módulo de Cotações foram resolvidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F021** | Lógica de Negócio / BD | RPC `convert_proposal_to_trip` | A conversão de proposta comercial aceita para viagem cria o registro financeiro pendente mas deixa de criar o plano de pagamento (`payment_plans`) e parcelas (`payment_installments`), gerando descasamento no Contas a Receber. | **Corrigido** (Plano de pagamento e parcelas criados na conversão) |
| **F022** | Falhas Silenciosas | Rotas de Propostas e Cotações | Várias queries assíncronas do React Query em listagem, edição, visualização do cliente e centrais de decisão exibem estados vazios ("Sem dados") ocultando erros em caso de problemas de rede ou RLS. | **Corrigido** (Tratamento visual robusto adicionado em todas as rotas) |

---

## MÓDULO: BOARDING & VIAGENS (RODADA 4 — RESOLVIDO)
*(Todos os findings F031-F037 do Módulo de Boarding/Trips foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F031** | Falhas Silenciosas | `agency.$slug.trips.index.tsx` | Se a query `list` falhar, a lista de viagens exibe estado vazio sem nenhum aviso de erro. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F032** | Falhas Silenciosas | `agency.$slug.trips.$id.tsx` | Se `tripQ.isError`, o layout da viagem não exibe tela de erro — apenas "Viagem não encontrada". | **Corrigido** (Tela de erro com isError guard adicionada) |
| **F033** | Falhas Silenciosas | `agency.$slug.trips.$id.financial.tsx` | Falhas nas queries `recordsQ` ou `planQ` ficam ocultas; usuário vê tela em branco. | **Corrigido** (Banner de erro unificado para todas as queries) |
| **F034** | Falhas Silenciosas | `agency.$slug.trips.$id.passengers.tsx` | Queries `list`, `tripQ` e `docsQ` sem tratamento visual de erro — mostra lista vazia. | **Corrigido** (Banner AlertCircle adicionado no início do render) |
| **F035** | Falhas Silenciosas | `agency.$slug.trips.$id.contract.tsx` | Falhas em `contractQ` ou `tripQ` exibem spinner sem fim ou tela vazia sem mensagem. | **Corrigido** (Tela de erro com isError guard adicionada) |
| **F036** | Lógica de Negócio / Contabilidade | `src/services/trips.ts` | Pagamentos de parcelas marcadas como `is_third_party` eram inseridos no caixa oficial da agência (`cash_transactions`), sujando o fluxo contábil. | **Corrigido** (Guard `!inst.is_third_party` adicionado antes de inserir `cash_transactions`) |
| **F037** | Negócio / UX | `agency.$slug.financial.operators.tsx` (NOVO) | Não havia aba ou dashboard dedicado para visualização do volume operado via operadoras/financeiras (market share externo, separado do caixa oficial). | **Corrigido** (Nova rota criada com KPIs de Volume Total, Recebido e Pendente via Operadoras, tabelas de Lançamentos e Parcelas externas) |

---

## MÓDULO: CRM, CONTRATOS E INBOX (RODADA 5 — RESOLVIDO)
*(Todos os findings F041-F043 foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F041** | Falhas Silenciosas | `agency.$slug.crm.$lead_id.lazy.tsx` | Se `leadQ` falhar, o drawer retornava `null` silenciosamente sem nenhuma mensagem de erro. | **Corrigido** (Tela de erro com botão "Voltar ao CRM" adicionada; estado de loading explícito também adicionado) |
| **F042** | Falhas Silenciosas | `agency.$slug.contracts.tsx` | Falha na query `q` de contratos renderizava o estado vazio "Nenhum contrato gerado" sem indicar erro. | **Corrigido** (Banner de erro com AlertCircle adicionado acima do estado vazio) |
| **F043** | Falhas Silenciosas | `agency.$slug.inbox.tsx` | Falhas nas queries de `channels` e `conversations` ficavam silenciosas — listas apareciam vazias sem aviso. | **Corrigido** (Toast/Banner fixo de erro na parte inferior do layout + isError extraído das queries) |


---

## MÓDULO: MÓDULOS SECUNDÁRIOS & PORTAL/CMS (RODADA 6 — RESOLVIDO)
*(Todos os findings F051-F061 foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F051** | Falhas Silenciosas | `agency.$slug.suppliers.index.tsx` | Falha na query de parceiros/fornecedores mostrava tela vazia "Nenhum fornecedor encontrado". | **Corrigido** (Banner de erro adicionado com AlertCircle) |
| **F052** | Falhas Silenciosas | `agency.$slug.support.tsx` | Falha ao buscar tickets de suporte era silenciada, quebrando os KPIs e a tabela sem feedback visual. | **Corrigido** (Banner de erro adicionado no topo do container de conteúdo) |
| **F053** | Falhas Silenciosas | `agency.$slug.vouchers.tsx` | Falha nas queries de Vouchers ou Auditoria de Voos renderizava telas em branco ou vazias. | **Corrigido** (Banners de erro adicionados em ambas as abas) |
| **F054** | Falhas Silenciosas | `agency.$slug.visas.tsx` | Falha ao buscar estágios ou processos de vistos exibia Kanban vazio. | **Corrigido** (Banner de erro adicionado acima do grid do DndContext) |
| **F055** | Falhas Silenciosas | `agency.$slug.calendar.tsx` | Falhas na query de compromissos ou usuários do calendário quebravam a agenda silenciosamente. | **Corrigido** (Banner de erro adicionado acima do grid mensal do calendário) |
| **F056** | Falhas Silenciosas | `agency.$slug.team.tsx` | Falha nas queries de membros ou convites resultava em listas vazias sem alertas de erro. | **Corrigido** (Banner de erro adicionado acima das tabelas de membros/convites) |
| **F057** | Falhas Silenciosas | `agency.$slug.rooming-list.tsx` | Falha nas queries de grupos ou quartos (expandidos) exibia tela vazia. | **Corrigido** (Banners de erro e indicadores de loading adicionados nos grupos e painéis) |
| **F058** | Falhas Silenciosas | `portal.settings.tsx` | Falha ao carregar configurações do portal silenciosamente impedia edição. | **Corrigido** (Banner de erro adicionado no formulário) |
| **F059** | Falhas Silenciosas | `portal.pages.index.tsx` | Falha na query de páginas ou analytics mostrava painel vazio sem indicar o erro. | **Corrigido** (Banner de erro adicionado acima do analytics de páginas) |
| **F060** | Falhas Silenciosas | `portal.pages.$page_id.tsx` | Falha ao abrir página inexistente no construtor visual retornava erro mudo/indefinido. | **Corrigido** (Tela de erro com botão "Voltar às Páginas" adicionada) |
| **F061** | Falhas Silenciosas | `portal.blog.tsx` | Falha ao buscar posts do blog resultava em painel de controle vazio. | **Corrigido** (Banner de erro adicionado com AlertCircle) |


---

## MÓDULO: REMOÇÃO DE MOCKS E HARDCODES (SESSÃO 7 — RESOLVIDO)
*(Todos os findings F062-F063 foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F062** | Mock / Hardcode | `BotCanvas.tsx` | O salvamento de fluxos do chatbot visual estava mockado em console.log sem persistência no banco. | **Corrigido** (Tabela `chatbot_flows` criada no Supabase e integrada com useQuery/useMutation) |
| **F063** | Mock / Hardcode | `useDailyDigest.ts` | A saudação do sumário diário de produtividade estava hardcoded como "Bom dia!" para todos os usuários. | **Corrigido** (Integrado Supabase Auth getUser para saudar dinamicamente pelo primeiro nome do usuário logado) |

---

## MÓDULO: RESILIÊNCIA DE ERROS NO PAINEL ADMINISTRATIVO (SESSÃO 8 — RESOLVIDO)
*(Todos os findings F064-F073 foram corrigidos e validados).*

| ID | Dimensão | Arquivo | Descrição | Status |
|----|----------|---------|-----------|--------|
| **F064** | Falhas Silenciosas | `admin.agencies.tsx` | Falha na query de agências deixava o painel vazio sem sinalizar erro. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F065** | Falhas Silenciosas | `admin.agencies.$id.tsx` | Falha ao buscar detalhes da agência causava tela de carregando eterno. | **Corrigido** (isError adicionado com banner de erro e link de voltar) |
| **F066** | Falhas Silenciosas | `admin.agents.tsx` | Falha na busca de agentes resultava em listagem vazia mútia. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F067** | Falhas Silenciosas | `admin.api-keys.tsx` | Falha ao carregar chaves globais de API silenciosamente quebrava a edição. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F068** | Falhas Silenciosas | `admin.audit.tsx` | Falha ao recuperar logs de auditoria globais silenciosamente falhava. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F069** | Falhas Silenciosas | `admin.billing.tsx` | Falha na query de faturamento global deixava página em branco. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F070** | Falhas Silenciosas | `admin.plans.tsx` | Falha ao buscar planos do sistema resultava em lista vazia. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F071** | Falhas Silenciosas | `admin.policies.tsx` | Falha ao buscar termos LGPD globais silenciosamente ocultava termos. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F072** | Falhas Silenciosas | `admin.travelers.tsx` | Falha na listagem global de viajantes causava listagem silenciosamente vazia. | **Corrigido** (Banner de erro com AlertCircle adicionado) |
| **F073** | Falhas Silenciosas | `admin.trips.tsx` | Falha na busca global de viagens causava tela de carregando infinito ou vazia. | **Corrigido** (Banner de erro com AlertCircle adicionado) |

---

## TOTAL DE FINDINGS ATIVOS: 0
Críticos: 0 | Altos: 0 | Médios: 0 | Baixos: 0 | Informativos: 0

