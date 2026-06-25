# Promessas vs. Realidade (TravelOS)

Este documento avalia individualmente cada funcionalidade prometida nos planos anteriores com o estado real do código no repositório, atribuindo classificações rígidas e baseadas em evidências técnicas.

---

## 1. Classificação Detalhada de Funcionalidades

### 1.1 Livro-Razão Imutável (Ledger Contábil)
* **Prometido**: Salvar logs contábeis de débito e crédito (`financial_ledger_entries`) de todas as movimentações.
* **Realidade**: A tabela existe com suas políticas de RLS e índices. Porém, **nenhuma rota do frontend ou função de servidor grava dinamicamente nessa tabela** durante novos lançamentos operacionais. O sistema continua operando unicamente em cima de `financial_records` e `cash_transactions`.
* **Classificação**: **SÓ BANCO**

### 1.2 Travas de Fechamento Contábil
* **Prometido**: Impedir alterações retroativas em meses já fechados pelo gestor.
* **Realidade**: O gatilho no banco de dados `enforce_closed_period_lock` existe e está vinculado às tabelas principais, bloqueando operações. No entanto, não há **nenhuma tela ou handler para abrir/fechar meses** no frontend. O status de períodos contábeis precisa ser alterado manualmente direto no banco.
* **Classificação**: **PARCIAL**

### 1.3 Comissão Progressiva por Fatias
* **Prometido**: Resolver comissão com alíquotas marginais com base no faturamento mensal do vendedor.
* **Realidade**: As funções matemáticas existem no banco e o gatilho as chama. Contudo, não há **nenhuma tela no frontend para parametrizar planos contábeis ou faixas marginais** na tabela `seller_commission_plans`. Na prática, o cálculo cai no fallback integral padrão (3%, 5%, 7%).
* **Classificação**: **SÓ BANCO**

### 1.4 Conciliação Diária de Recibos
* **Prometido**: Substituir os dados falsos e simulações na tela de auditoria de comprovantes Pix.
* **Realidade**: O arquivo [reconciliation.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx) foi limpo de fallbacks mockados (`localPending`). O painel agora consome e atualiza a tabela `payment_installments` via TanStack Query de forma real.
* **Classificação**: **REAL PONTA A PONTA**

### 1.5 Motor de Ações do Chat (Action Executor)
* **Prometido**: Execução real de 23 ações do catálogo contidas no chat de IA.
* **Realidade**: O [ActionExecutor.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) possui lógica real para cadastrar leads, atualizar leads, mudar estágio, criar clientes, adicionar passageiros, iniciar cotação, adicionar hotéis/voos e disparar templates de WhatsApp. Contudo, ações como `query_installments`, `generate_contract`, `generate_voucher`, `query_supplier`, `start_ocr`, `query_groups` e `generate_report` **apenas retornam mensagens estáticas de sucesso e simulam IDs com UUIDs aleatórios** (linhas 744-748), sem executar alterações reais nas tabelas do banco.
* **Classificação**: **MOCK/SIMULADO** (Para mais da metade do catálogo)

### 1.6 Busca de Memórias Semânticas (RAG no Chat)
* **Prometido**: RAG vetorial conectando dúvidas do chat a embeddings de memórias.
* **Realidade**: O chat apenas faz uma busca direta comum em `ai_agency_memories` limitando a 10 resultados (`.select("category, content").limit(10)`), sem calcular similaridade por cosseno com embeddings no banco.
* **Classificação**: **MOCK/SIMULADO**
