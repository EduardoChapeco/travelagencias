# 03. Raio-X Geral da Arquitetura do Sistema

Este documento apresenta o mapeamento completo dos componentes lógicos, físicos e integrados do ecossistema Turis, detalhando as rotas, serviços, banco de dados, Edge Functions e infraestrutura de segurança.

---

## 1. Mapeamento de Rotas (TanStack Router)

O sistema adota o TanStack Router com roteamento baseado em arquivos sob o diretório `src/routes/`. As rotas principais identificadas são:

- **Painel Administrativo Geral (SaaS Superadmin)**:
  - `/admin`: Dashboard corporativo de controle de agências.
  - `/admin/plans`: Parametrização de planos de assinatura.
  - `/admin/billing`: Faturamento e controle de inadimplência.
  - `/admin/api-keys`: Monitoramento e CRUD de chaves mestras.
  - `/admin/audit`: Logs transacionais globais de auditoria.
- **Painel Administrativo da Agência (B2B SaaS Tenant)**:
  - `/agency/$slug`: Dashboard financeiro e operacional da agência.
  - `/agency/$slug/crm`: Kanban de leads e acompanhamento de funil.
  - `/agency/$slug/trips`: Listagem de pacotes e viagens.
  - `/agency/$slug/trips/$id/reaccommodation`: Sub-rota contextual de reacomodação aérea.
  - `/agency/$slug/financial/cash`: Abertura, fechamento e controle de fluxo de caixas.
  - `/agency/$slug/financial/ledger`: Relatório do Livro-Razão Contábil.
  - `/agency/$slug/rooming-list`: Gestão unificada de leitos de grupos.
  - `/agency/$slug/settings/financial`: Parametrização de travas contábeis e comissões.
- **Portal Público da Agência (CMS Builder)**:
  - `/p/$agency_slug`: Landing page pública customizada pelo CMS.
  - `/p/$agency_slug/tour/$id`: Detalhes e inscrição pública em excursões.
- **Portal do Cliente B2C**:
  - `/client/trips/$id`: Autoatendimento do passageiro, visto, vacinas e aceite de reacomodação.
- **Portal Móvel de Autoatendimento (Magic Link Tokens)**:
  - `/m/checkin/$token`: Cartão de embarque online/offline e emergência.
  - `/m/contract/$token`: Assinatura digital e telemetria KYC.

---

## 2. Componentes e Estrutura Lógica

### 2.1 Componentes Canônicos do Design System (Light Editorial SaaS)

- **SlimSidebar**: Barra lateral ultrafina de 56px focada em ícones centrais e navegação persistida no `localStorage`.
- **AppSidebar**: Painel expandido de 220px com submenus contextuais baseados no pathname ativo.
- **PaymentReceiptModal**: Componente de conciliação diária de recibos Pix com proporção responsiva fluida A4 (`w-full max-w-[595px]`).
- **ChatBlockRenderer / ConfirmationCard**: Cards de chat com botões físicos de confirmação que ativam a execução real de ferramentas de IA.

### 2.2 Camada de Serviços (Services & Utils)

- `reaccommodation.ts`: Agregação de voos, cálculo determinístico de diferenças aéreas, score de risco e resolução definitiva de alterações de malhas.
- `exportRoomingList.ts`: Geração formatada da Rooming List em PDF A4 (com cabeçalhos, rodapés e numeração corporativa), Excel (.xlsx) e Word (.doc).
- `ai-chat.functions.ts`: Interface de chat omnichannel, computação de embeddings de OpenAI e busca vetorial baseada na similaridade de cosseno.

---

## 3. Banco de Dados, RLS e Objetos de Banco

O Supabase PostgreSQL 15 gerencia os dados estruturais e de controle de acesso.

### 3.1 Tabelas Core Auditadas

- `financial_ledger_entries`: Lançamentos do Livro-Razão (débito, crédito, conta, data e fonte).
- `monthly_closing_periods`: Controle de fechamentos mensais por agência (ano, mês, status).
- `seller_commission_plans` & `seller_commission_tiers`: Regras progressivas de cálculo de comissão.
- `boarding_rooming_list`: Alocação normalizada de passageiros em quartos, tipos de acomodação e hotéis.
- `destination_info` & `destination_review_logs`: Curadoria de dicas de destinos, visto, vacinas e logs de revisão.
- `flight_change_cases`, `flight_alternatives`, `flight_difference_analysis`, `customer_travel_decisions`, `operator_reaccommodation_requests`: Fluxo completo de reacomodação aérea.

### 3.2 Vistas e RPCs (Stored Procedures)

- `group_tours_financial_summary`: View SQL isolada com agregação server-side de receita, custos operacionais e cálculo de ROI.
- `match_memories`: RPC para busca semântica de memórias por embeddings de cosseno.
- `calculate_progressive_commission` & `resolve_agent_commission`: Funções matemáticas estáveis para escala marginal de comissão.
- `enforce_closed_period_lock`: Trigger BEFORE INSERT/UPDATE/DELETE que impede mutações financeiras em meses fechados.

### 3.3 Buckets de Storage

- `contracts`: Armazena os pacotes jurídicos compactados em `.ZIP` (Contrato PDF + logs de telemetria + selfie KYC).
- `payment_receipts`: Comprovantes de Pix enviados pelos passageiros para conciliação financeira.

---

## 4. Edge Functions (Deno Deploy)

- `supplier-ocr-extractor`: Processa faturas e documentos de fornecedores via Gemini 2.5 Flash, extraindo contatos e produtos com parse JSON estruturado.
- `destination-intelligence`: Edge Function acionada para buscar informações consulares, vistos e vacinas de destinos usando IA.
- `gmail-sync` / `gmail-send`: Sincronização e envio de e-mails omnichannel integrados à thread de suporte.
