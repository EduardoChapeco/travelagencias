# Promessas vs. Realidade — Rodada 2 (TravelOS)

Este documento compara individualmente cada funcionalidade planejada com a realidade física de sua implementação na árvore de trabalho local e no banco de dados.

---

## 1. Classificação Detalhada de Funcionalidades

### 1.1 Livro-Razão Imutável (Ledger Contábil)
* **Prometido**: Salvar lançamentos contábeis de débito e crédito (`financial_ledger_entries`) de todas as movimentações.
* **Realidade**: A tabela física existe no banco de dados local com políticas de RLS e índices. No entanto, **nenhum código de frontend ou server function no diretório `src/` realiza escritas ou leituras nessa tabela** durante movimentações ou baixas de registros. Não há gatilhos SQL criados que convertam registros em lançamentos contábeis automaticamente.
* **Classificação**: **SÓ BANCO**

### 1.2 Travas de Fechamento Contábil
* **Prometido**: Impedir alterações retroativas em lançamentos de meses já fechados pelo gestor.
* **Realidade**: O gatilho de banco de dados `enforce_closed_period_lock` existe e está operando como bloqueador (`BEFORE INSERT OR UPDATE OR DELETE`) nas tabelas principais. Contudo, não há **nenhuma tela ou handler para abrir/fechar períodos** na interface do usuário. O controle de status de meses precisa ser operado de forma manual no banco.
* **Classificação**: **PARCIAL**

### 1.3 Comissão Progressiva por Fatias
* **Prometido**: Resolver comissão do vendedor com alíquotas marginais baseadas no volume de faturamento do mês.
* **Realidade**: As funções matemáticas de cálculo de escala (`calculate_progressive_commission` e `resolve_agent_commission`) e o gatilho automático de atualização em `trip_commissions` existem e estão ativos. Mas não há **nenhuma tela no frontend para parametrizar os planos de comissão e tiers**. Na prática, o cálculo utiliza a escala padrão codificada no fallback da função de banco.
* **Classificação**: **SÓ BANCO**

### 1.4 Conciliação Diária de Recibos Pix
* **Prometido**: Substituir os dados mockados na tela de conciliação por dados reais e persistentes.
* **Realidade**: O arquivo [reconciliation.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx) foi limpo de fallbacks estáticos. A interface de conciliação diária de recibos agora lê registros reais com status `pending` e insere registros de movimentações reais e saldos reais em `financial_transactions` ao aprovar.
* **Classificação**: **REAL PONTA A PONTA**

### 1.5 Motor de Ações do Chat (Action Executor)
* **Prometido**: Execução real das ações sugeridas pelo chat do assistente de inteligência artificial.
* **Realidade**: O [ActionExecutor.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) foi ampliado e agora possui suporte real a todas as 27 ações do catálogo. Diferente da auditoria anterior, as ações de geração de rascunhos de contratos (`generate_contract`) e vouchers (`generate_voucher`) já contêm códigos de inserção física nas tabelas `contracts` e `vouchers`.
* **Classificação**: **REAL PONTA A PONTA**

### 1.6 Busca de Memórias Semânticas (RAG no Chat)
* **Prometido**: Busca vetorial baseada em embeddings para associar perguntas do chat a memórias da agência.
* **Realidade**: A extensão `vector` e a RPC de banco `match_memories` existem. No entanto, no código de servidor [ai-chat.functions.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L203-L207), o carregamento de memórias ainda está implementado como uma consulta SQL simples direta (`.select("category, content").limit(10)`), sem gerar ou consultar similaridade com embeddings do usuário.
* **Classificação**: **MOCK/SIMULADO**

### 1.7 WebScraping de Concorrência
* **Prometido**: Extração inteligente de dados e concorrência a partir de links de sites enviados no chat.
* **Realidade**: A lógica está funcional, efetuando requisições HTTP para a Edge Function `ai-orchestrator` e filtrando tags XML para evitar injeções de prompt no chat.
* **Classificação**: **REAL PONTA A PONTA**

### 1.8 Feedbacks de Resposta de IA
* **Prometido**: Capturar a avaliação do operador (+1 / -1) para cada resposta da IA.
* **Realidade**: O componente `AIChatPanel.tsx` exibe botões de joinha para cima/baixo que invocam a mutação de servidor `submitAIChatFeedback`, inserindo de forma isolada na tabela `ai_chat_feedback` sob políticas de RLS de agência.
* **Classificação**: **REAL PONTA A PONTA**
