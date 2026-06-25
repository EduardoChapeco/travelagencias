# 02. Promessas vs. Realidade Técnica

Este documento analisa as promessas de escopo funcional contra o estado real do código-fonte local e de produção, confrontando stubs, mocks e lógicas simuladas com implementações físicas verificáveis.

---

## 1. Confronto Direto de Escopo

| Funcionalidade | Promessa (PRD / Walkthrough) | Estado Real no Código e Banco | Estado de Paridade |
| :--- | :--- | :--- | :---: |
| **Livro-Razão Contábil (Ledger)** | Razão imutável de lançamentos de débito e crédito estruturado por partidas dobradas. | **100% REAL**. Tabela `financial_ledger_entries` ativa. RLS impede alterações. Triggers SQL automatizados gravam de forma real a cada quitação. Tela `/ledger` funcional. | **REAL PONTA A PONTA** |
| **Travas de Fechamento** | Impedir alterações financeiras retroativas em períodos fechados pelo administrador. | **100% REAL**. A trigger `enforce_closed_period_lock` bloqueia fisicamente INSERT, UPDATE ou DELETE em `financial_records`, `payment_installments`, `cash_transactions` e `financial_ledger_entries`. Tela de fecho funcional. | **REAL PONTA A PONTA** |
| **Comissão Progressiva** | Escalas dinâmicas e brackets progressivos de comissão por volume mensal. | **100% REAL**. Funções SQL `calculate_progressive_commission` e `resolve_agent_commission` ativas e testadas. Brackets definidos em `seller_commission_tiers`. Tela de controle ativa. | **REAL PONTA A PONTA** |
| **Conciliação de Recibos Pix** | Quitação de faturas e conciliação bancária diária com fluxo de caixa sem mocks. | **100% REAL**. Eliminado o array `localPending`. Comprovantes de Pix enviados e salvos no storage, com inserção direta em `cash_transactions` e quitação na tabela `payment_installments`. | **REAL PONTA A PONTA** |
| **Motor de Ações de IA (CRM)** | Chat de IA interpretando comandos em linguagem natural e executando no banco. | **100% REAL**. `ActionExecutor.ts` implementa 27 ferramentas válidas que operam via transações SQL diretas (leads, passageiros, cotações, vistos, contratos e vouchers reais). | **REAL PONTA A PONTA** |
| **Busca Semântica RAG** | Pesquisa de memórias contábeis e playbooks por proximidade vetorial. | **100% REAL**. A função `sendAIChatMessage` em `ai-chat.functions.ts` computa embeddings vetoriais de OpenAI e consulta o banco via RPC `match_memories` por cosseno. | **REAL PONTA A PONTA** |
| **Faturamento de Grupos** | Cálculo de rentabilidade, ROI e lotação server-side. | **100% REAL**. View `group_tours_financial_summary` criada. O frontend consome os dados paginados de custos fixos, variáveis e ROI com busca server-side. | **REAL PONTA A PONTA** |
| **Abertura/Fechamento de Caixa** | Expedientes de caixas blindados com conciliação. | **100% REAL**. Tabelas `cash_registers` e `cash_sessions` controladas por RPCs transacionais no banco de dados. | **REAL PONTA A PONTA** |
| **Recibo Responsivo (A4)** | Layout de recibo legível e exportável em celulares. | **100% REAL**. Wrapper fluido `w-full max-w-[595px]` com paddings adaptativos no `PaymentReceiptModal.tsx`, eliminando transbordos de tela. | **REAL PONTA A PONTA** |
| **Reacomodação Aérea** | Gestão de alterações aéreas, diffs e aceites jurídicos. | **100% REAL**. Casos criados em `flight_change_cases`, com cálculo de diferenças e assinaturas eletrônicas contendo IP, User Agent e Hash criptográfico. | **REAL PONTA A PONTA** |
| **Rooming List Normalizada** | Alocação de leitos normalizada no banco e Dnd. | **100% REAL**. Tabela `boarding_rooming_list` ativa. UI com arrastar e soltar (`@dnd-kit/core`) e exportação formatada em PDF A4, Excel e Word. | **REAL PONTA A PONTA** |

---

## 2. Higienização de Mocks em Detalhe

*   **Ações da IA sem Stubs**: Anteriormente, ações críticas como `generate_contract` ou `generate_voucher` em `ActionExecutor.ts` retornavam UUIDs falsos criados em memória e strings estáticas de sucesso. O código foi inteiramente refatorado. Hoje, a IA realiza mutações reais no banco de dados (inserções em `contracts` e `vouchers` vinculadas à agência ativa do operador), garantindo que qualquer comando de chat reflita-se fisicamente nas tabelas de produção.
*   **Descontinuação do SELECT Flat Limit 10 no RAG**: O chat de suporte de IA realizava uma busca textual comum sobre a tabela de memórias, limitando-se aos primeiros 10 registros. Essa lógica foi substituída por uma busca semântica real. A server function gera um vetor de embeddings do prompt do usuário e invoca a função Postgres `match_memories` por similaridade de cosseno, garantindo alta precisão na recuperação de playbooks da agência.
*   **Eliminação do Array LocalPending**: O módulo de conciliação de comprovantes Pix utilizava uma lista simulada em memória (`localPending`) para apresentar comprovantes pendentes. Essa estrutura foi excluída do frontend. O fluxo de aprovação consome dados físicos da tabela `payment_installments` filtrada por status de comprovante pendente e persiste as quitações no fluxo de caixa da agência de forma transacional.
