# Relatório de Resultados de Testes

Este documento registra os resultados de testes automatizados de compilação, lints e validações de integridade executados no Motor VibeTour.

---

## 1. Teste de Compilação Estática (TypeScript Typecheck)

- **Comando Executado**: `npx tsc --noEmit`
- **Resultado**: **FALHOU** (Retornou exit code 1)
- **Erros Identificados**:

### Erro 1: Acesso de Propriedade Não Tipada em `normalized_intent`

- **Local**: `src/services/quotes-simulation.ts` (linha 104, coluna 67)
- **Mensagem**: `error TS2339: Property 'destinations' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.`
- **Causa Raiz**: O compilador TypeScript não permite acessar propriedades de um campo `Json` retornado pelo Supabase (tabela `quote_requests.normalized_intent`) sem realizar cast explícito para a interface canônica `TravelIntent`.

### Erro 2: Acesso do Método `.join()` em Campo JSONB

- **Local**: `src/services/quotes-simulation.ts` (linha 131, coluna 43)
- **Mensagem**: `error TS2339: Property 'join' does not exist on type 'string | number | true | { [key: string]: Json | undefined; } | Json[]'.`
- **Causa Raiz**: O campo `warnings` da tabela `package_candidates` é do tipo JSONB no banco de dados. O Supabase o tipa como `Json` (que pode ser string, number, boolean ou objeto). O compilador rejeita a execução do método `.join()` sem que haja validação ou coerção para `string[]`.

---

## 2. Testes de Integração e Persistência de Banco de Dados

- **Teste Executado**: Criação de Cotação VibeTour manual e por IA.
  - _Resultado_: **APROVADO**. Os registros são inseridos com sucesso nas tabelas `quote_requests`, `quote_travelers` e `quote_preferences` na base remota Supabase.
- **Teste Executado**: Indexação de Documentos de Conhecimento e Busca Semântica RAG.
  - _Resultado_: **FALHOU**. Como as tabelas RAG (`knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, `knowledge_embeddings`) e o RPC vetorial `match_knowledge_embeddings` não foram criados no banco de dados de produção (migration pendente), a chamada gera exceções e erros HTTP 400 no painel de controle do agente.
- **Teste Executado**: Isolamento de Tenant (RLS Multi-Tenant).
  - _Resultado_: **FALHOU**. Agentes comuns conseguem alterar perfis de scoring e regras de decisão globais porque a migration de segurança `20260727000000_vibetour_global_rules_security.sql` não está ativa no remote.
