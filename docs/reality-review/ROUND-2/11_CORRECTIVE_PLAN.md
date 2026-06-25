# Plano Corretivo Contábil — Rodada 2 (TravelOS)

Este plano corretivo estabelece as próximas etapas para resolver as vulnerabilidades de segurança (P0), plugar integrações pendentes (P1/P2) e refinamentos gerais.

---

## Fase P0: RLS, Segurança e Imutabilidade (Urgente)
* **Causa Raiz**: As políticas de RLS ativas em `financial_ledger_entries` e `seller_adjustments` usam diretivas genéricas `FOR ALL`, concedendo permissões físicas de exclusão (`DELETE`) e alteração (`UPDATE`) a membros comuns.
* **Impacto**: Risco severo de fraudes contábeis, perda de compliance regulatório e alteração de histórico de faturamento.
* **Ações**:
  1. Alterar a política RLS `ledger_entries_access` na tabela `financial_ledger_entries` para aceitar unicamente operações de `SELECT` para membros da agência. Operações de `INSERT`, `UPDATE` e `DELETE` devem ser negadas no nível geral, delegando escritas (`INSERT`) unicamente a funções de servidor `SECURITY DEFINER` ou ao `service_role`.
  2. Ajustar a política RLS `adjustments_access` em `seller_adjustments` de modo que apenas o papel `agency_admin` (ou `super_admin`) possa efetuar `INSERT`, `UPDATE` e `DELETE`. Vendedores comuns devem possuir permissão estrita de `SELECT` de seus próprios ajustes.
* **Testes**: Executar scripts SQL simulando acessos por tokens autenticados sem privilégios administrativos e conferir as recusas em inserções/exclusões.

---

## Fase P1: RAG Real de IA e Sincronização de Types
* **Causa Raiz**: O chat de IA lê memórias da agência de forma simples (`.limit(10)`), sem usar similaridade de cosseno com embeddings de vetores. A tipagem do Supabase está desatualizada no frontend.
* **Impacto**: O assistente perde precisão semântica ao responder o usuário e o código TypeScript recorre a coerções inseguras de tipo (`as any`).
* **Ações**:
  1. Integrar na server function `sendAIChatMessage` a geração de embeddings para a mensagem do usuário (via OpenAI API) e realizar a consulta semântica invocando a RPC de banco `match_memories`.
  2. Executar `supabase gen types typescript` para atualizar `src/integrations/supabase/types.ts` e remover as coerções `as any` no frontend e no executor.
* **Testes**: Validar respostas do chat frente a documentos carregados na base de memórias da agência e conferir no log do banco o uso da RPC.

---

## Fase P2: Integração do Ledger e Telas de Parametrização
* **Causa Raiz**: A tabela de Ledger Contábil e as regras de comissão progressiva estão criadas no banco, mas não são consumidas/alimentadas dinamicamente pela aplicação.
* **Impacto**: O ledger contábil e as travas continuam órfãos e inativos no dia a dia da agência.
* **Ações**:
  1. Criar gatilhos contábeis SQL (`AFTER INSERT OR UPDATE`) em `cash_transactions` e `financial_records` (quando liquidados) para inserir automaticamente lançamentos de débito e crédito no Livro-Razão Contábil `financial_ledger_entries`.
  2. Implementar uma tela simples administrativa para gerenciamento e travamento de períodos contábeis (`monthly_closing_periods`) e parametrização de faixas em `seller_commission_plans`.
* **Testes**: Simular quitações de viagens e conferir se os lançamentos de débito/crédito surgiram no Ledger no banco de dados.
