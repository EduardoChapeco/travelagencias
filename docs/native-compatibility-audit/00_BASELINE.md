# Baseline de Auditoria: Ambiente e Implantação

Este documento registra a linha de base técnica do ambiente de desenvolvimento local, repositório de controle de versão (Git) e a instância de produção remota do Supabase para a auditoria forense de integridade do Motor de Cotações VibeTour.

---

## 1. Dados Baselines do Sistema

- **Repositório Workspace**: `c:\Users\Turis Tecnologia SMO\.gemini\antigravity-ide\scratch\travelagencias`
- **Sistema Operacional**: Windows 11 (PowerShell / CMD)
- **Branch Git Ativo**: `main` (em sincronia com `origin/main`)
- **URL do Supabase Remoto**: `https://esmppoxxnyiscidzsjvy.supabase.co`
- **ID do Projeto Supabase**: `esmppoxxnyiscidzsjvy`
- **Mecanismo de Autenticação**: JWT Supabase Auth com persistência via cookies/localStorage
- **Escopo de Multi-Tenant**: Baseado em `agency_id` UUID mapeado nas tabelas públicas.

---

## 2. Inventário do Workspace Local (Git Status)

A análise do diretório de trabalho local revela alterações não rastreadas (_untracked_) e modificadas (_modified_) que afetam diretamente o Motor de Cotações VibeTour:

### 2.1. Arquivos Modificados (Modificados)

- `package.json` & `package-lock.json`: Modificados para inclusão do driver do PostgreSQL (`pg` v8.22.0) em ambiente de desenvolvimento.
- `src/integrations/supabase/types.ts`: Atualizado com definições de tipos para tabelas de cotação core (ex: `quote_requests`), mas sem as definições das tabelas de RAG/Conhecimento.
- `src/routeTree.gen.ts`: Regenerado automaticamente para incluir rotas do VibeTour.

### 2.2. Arquivos Não Rastreados (Untracked)

- Rotas da UI do VibeTour:
  - `src/routes/agency.$slug.quotes.tsx` (Layout principal de cotações)
  - `src/routes/agency.$slug.quotes.index.tsx` (Painel central de listagem e ingestão RAG)
  - `src/routes/agency.$slug.quotes.$id.tsx` (Workspace de detalhe e decisões)
- Serviços do Motor VibeTour:
  - `src/services/quotes.ts` (Persistência, cenários, alternativas)
  - `src/services/quotes-rag.ts` (Integração semântica com OpenAI Embeddings e RAG)
  - `src/services/quotes-scoring.ts` (Motor de regras de pontuação de conforto e conexões)
  - `src/services/quotes-simulation.ts` (Simulação agêntica por persona via Gemini/Orchestrator)
  - `src/types/quotes.ts` (Contratos TypeScript canônicos de intenção, oferta normalizada, scorecards)
- Migrations Relacionadas:
  - `supabase/migrations/20260726000000_vibetour_quote_tables.sql` (Tabelas Core e RLS)
  - `supabase/migrations/20260727000000_vibetour_global_rules_security.sql` (Correção de políticas RLS)
  - `supabase/migrations/20260728000000_vibetour_memory_rag_tables.sql` (Tabelas RAG, índices HNSW e RPC de busca vetorial)

---

## 3. Estado Físico do Banco de Dados Remoto

O banco de dados de produção remota foi verificado diretamente por meio de conexões TCP nativas e chamadas HTTP REST:

- **Tabelas Core VibeTour**: Existem fisicamente no schema `public` (como `quote_requests`, `quote_travelers`, `quote_preferences`, `package_candidates`, `package_scorecards`, `score_profiles`).
- **Tabelas RAG/Conhecimento**: **AUSENTES** (`knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, `knowledge_embeddings`).
- **Função RPC Vetorial**: **AUSENTE** (`public.match_knowledge_embeddings`).
- **Políticas RLS**: O estado atual de RLS no banco está vulnerável, pois a migração de segurança `20260727000000` não foi aplicada, permitindo que usuários autenticados modifiquem perfis e regras globais sem privilégios de `super_admin`.
