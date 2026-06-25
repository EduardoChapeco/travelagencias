# Histórico Recente de Commits e Promessas (TravelOS)

Este relatório compila os commits recentes do Git e as promessas de implementação declaradas localmente no working tree, identificando quais arquivos foram modificados e o estado contábil de cada promessa.

---

## 1. Tabela de Commits e Alterações Locais

| Promessa | Commit / Branch | Arquivos | Alteração real | Evidência | Estado atual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bypass do Base64 em Edge Functions** | Commit `8e68dc9` | `supabase/functions/` | Remove prefixos de decrypt no decodificador base64. | Chamadas HTTP bem-sucedidas. | Concluído na produção |
| **Múltiplas API Credentials por Provedor** | Commit `0c1e4ad` | `supabase/migrations/...` | Adição de tabelas com chaves de api e labels customizadas. | Migrações na main. | Concluído na produção |
| **Reestruturação e Drag Resizer da Sidebar** | Commit `8e7bdf6` | `src/components/`, `supabase/` | Conversão de modais para SheetPages e redimensionador de sidebar. | Layout com sidebar ajustável. | Concluído na produção |
| **Estabilização do Rooming List** | Commit `2ac19cc` | `src/components/` | Correções de tipagem e integridade do banco. | Typecheck sem falhas. | Concluído na produção |
| **Auditoria do Chat Agêntico (Corretiva)** | Local (Não comitado) | `src/components/shell/ChatBlockRenderer.tsx`, `src/lib/ai/`, `src/routes/agency.$slug.settings.ai-audit.tsx`, `supabase/migrations/20260715000000_ai_chat_improvements.sql` | Criação do motor de ações (`ActionExecutor`), validador Zod (`ActionRegistry`), roteador de personas (`AgentRouter`) e painel de auditoria. | Visualização das rotas e typecheck limpo. | Local pendente de commit/deploy |
| **Re-arquitetura Financeira (Ledger & Mocks)** | Local (Não comitado) | `src/routes/agency.$slug.financial.reconciliation.tsx`, `supabase/migrations/20260716000000_financial_rearchitecture_core.sql`, `supabase/migrations/20260717000000_financial_rearchitecture_logic.sql` | Criação do Ledger Imutável, Travas Contábeis de Fechamento, Comissão Progressiva e Expurgo de Mocks de parcelas na conciliação. | Código real e typecheck bem-sucedido. | Local pendente de commit/deploy |
