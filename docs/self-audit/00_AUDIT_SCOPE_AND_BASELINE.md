# 00. Escopo da Auditoria e Baseline do Sistema

Este documento estabelece o escopo físico, técnico e conceitual da autoauditoria de integridade realizada no **Turis / VibeTour**, definindo a linha de base (baseline) do sistema, os arquivos analisados e a metodologia de verificação.

---

## 1. Escopo Físico Auditado

A auditoria cobriu os seguintes domínios e seus respectivos componentes no repositório local:

### A. Motor de Decisão e Cotações VibeTour (Quote Engine)
* **Páginas e Rotas**:
  * [src/routes/agency.$slug.quotes.index.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.quotes.index.tsx)
  * [src/routes/agency.$slug.quotes.$id.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.quotes.$id.tsx)
* **Camada de Serviços**:
  * [src/services/quotes.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes.ts) (Orquestração local de requisições)
  * [src/services/quotes-scoring.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes-scoring.ts) (Scoring determinístico e gateway RAG)
  * [src/services/quotes-simulation.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes-simulation.ts) (Simulação preditiva de personas)
  * [src/services/quotes-rag.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes-rag.ts) (Indexação e busca semântica de regras)
* **Edge Functions (Deno)**:
  * [supabase/functions/ai-quote-engine/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/ai-quote-engine/index.ts)

### B. Integração Omnichannel e Suporte SLA
* **Páginas e Rotas**:
  * Canais e telas de chat de atendimento omnichannel (integrados ao banco e triggers).
* **Edge Functions (Deno)**:
  * [supabase/functions/whatsapp-webhook/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts)
* **Estrutura de Banco e Migrações**:
  * [supabase/migrations/20260729000001_inbox_and_whatsapp_architecture.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260729000001_inbox_and_whatsapp_architecture.sql)

### C. Fluxo de Caixa e Conciliação Financeira
* **Páginas e Rotas**:
  * [src/routes/agency.$slug.financial.cash.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.cash.tsx)
* **Estrutura de Banco e Migrações**:
  * [supabase/migrations/20260724000000_omnichannel_and_cash_audit.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260724000000_omnichannel_and_cash_audit.sql)
  * [supabase/migrations/20260628000000_cash_registers_and_group_costs.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql)

---

## 2. Metodologia de Verificação Forense

A auditoria abdicou de quaisquer premissas de documentação ou relatos prévios. Empregamos a seguinte metodologia baseada em evidências rígidas:

1. **Leitura Direta de Código Executável**: Análise estática linha a linha das rotas, mutations, RPCs e funções Deno para rastrear a cadeia exata de chamadas.
2. **Auditoria Física do Banco de Dados**: Consulta de tabelas, colunas, chaves estrangeiras, constraints e rotinas (RPCs) na instância remota do Supabase (`esmppoxxnyiscidzsjvy`) via cliente Postgres real.
3. **Verificação de Paridade Estática (TS/DB)**: Rastreamento de coerções (`as any`, `@ts-ignore`) versus a definição real no arquivo de tipos gerado `src/integrations/supabase/types.ts`.
4. **Análise Adversarial de Segurança**: Teste de integridade de RLS, isolamento de inquilinos (multi-tenant) e possibilidade de desvios através do uso indiscriminado da `serviceRoleKey`.

---

## 3. Estado de Compilação do Workspace

* **Status Técnico**: O projeto compila com sucesso.
* **Comando**: `npm run typecheck` (`tsc --noEmit`)
* **Resultado**: Concluído sem erros, indicando paridade sintática estática em nível de código TypeScript.
