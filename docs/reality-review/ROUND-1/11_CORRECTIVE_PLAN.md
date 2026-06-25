# Plano Corretivo Contábil — Rodada 1 (TravelOS)

Este documento estabelece as fases corretivas prioritárias para corrigir brechas de RLS, eliminar simulações (mocks) no chat e plugar de forma real o Ledger e as travas financeiras.

---

## Fase P0: Segurança, RLS e Imutabilidade (Urgente)
* **Causa Raiz**: A política `ledger_entries_access` foi criada com escopo `FOR ALL`, permitindo exclusão (`DELETE`) e modificação (`UPDATE`) de lançamentos contábeis por usuários comuns da agência.
* **Impacto**: Perda de compliance financeiro; risco de fraude e quebra de imutabilidade do Livro-Razão.
* **Ações**:
  * Substituir a política de RLS em `financial_ledger_entries` para aceitar apenas `SELECT` (leitura) para membros gerais.
  * Restringir escritas (`INSERT`) apenas a triggers internas de servidor ou ao `service_role`.
  * Atualizar RLS de `seller_adjustments` para bloquear `DELETE` para vendedores, delegando apenas ao papel `agency_admin`.
* **Testes**: Executar scripts SQL simulando tentativas de deleção por conexões autenticadas sem privilégios de admin, verificando a negação de acesso.

---

## Fase P1: Expulsão de Mocks e Ações Reais (Chat de IA)
* **Causa Raiz**: Mais de 50% das ferramentas do chat agêntico em `ActionExecutor.ts` apenas simulam sucesso com UUIDs falsos e strings. A busca RAG do chat ignora embeddings.
* **Impacto**: O chat gera falsos positivos de alteração contábil para o operador.
* **Ações**:
  * Implementar no `ActionExecutor.ts` a criação real de contratos na tabela `contracts`, inserção de vouchers de voos/hotéis reais e geração de tarefas e vistos verídicos.
  * Substituir a busca flat limite 10 no chat por uma consulta semântica real usando a RPC `match_memories` com embeddings de cosseno.
* **Testes**: Simular tool calls reais no chat e conferir as inserções físicas no banco de dados correspondente.

---

## Fase P2: Integração Contábil e Telas de Fechamento
* **Causa Raiz**: O Ledger e as regras progressivas não possuem telas de parametrização no frontend e não são alimentados automaticamente pelas movimentações diárias.
* **Impacto**: O Ledger e os fechamentos contábeis viram estruturas órfãs/mortas.
* **Ações**:
  * Criar gatilhos contábeis (triggers BEFORE/AFTER INSERT ou UPDATE) que criem automaticamente lançamentos correspondentes em `financial_ledger_entries` sempre que transações em `cash_transactions` ou baixas em `financial_records` forem quitadas.
  * Criar tela simples de parametrização de faixas em `seller_commission_plans` e botão para abrir/fechar períodos em `monthly_closing_periods` na área administrativa.
* **Rollback**: Caso os travamentos de período gerem bloqueios indesejados em lançamentos válidos, o gatilho contábil pode ser desativado temporariamente.
