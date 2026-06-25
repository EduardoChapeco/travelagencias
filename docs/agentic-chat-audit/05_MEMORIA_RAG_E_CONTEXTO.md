# Memória, RAG e Contexto

Este documento analisa as tabelas de memórias da agência, a busca semântica por similaridade de cossenos baseada na extensão `vector` e o limite de tokens do contexto do chat.

---

## 1.pgvector e Busca de Similaridade

A infraestrutura de banco de dados para busca de similaridade e memórias persistentes foi aplicada na migração [20260715000000_ai_chat_improvements.sql](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260715000000_ai_chat_improvements.sql):

- **Extensão vector**: Executa `CREATE EXTENSION IF NOT EXISTS vector`.
- **Coluna de Embedding**: Adiciona a coluna `embedding vector(1536)` na tabela `ai_agency_memories`.
- **RPC match_memories**: Implementa a função de banco de dados baseada no operador `<=>` (similaridade por cosseno):
  ```sql
  CREATE OR REPLACE FUNCTION public.match_memories (
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    _agency_id uuid
  )
  RETURNS TABLE (
    id uuid,
    category text,
    content text,
    similarity float
  )
  ...
  ```
  Esta busca assegura que apenas registros pertencentes à agência em questão sejam consultados (`WHERE m.agency_id = _agency_id`).

---

## 2. Injeção de Contexto (RAG) no Chat

No backend do chat de IA:

- **Recuperação de Memórias**: Em [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L203), o sistema faz uma consulta inicial sobre a tabela `ai_agency_memories` filtrando pelo tenant da agência e limitando a 10 registros.
- **Injeção de Prompt**: As memórias recuperadas são formatadas e injetadas no prompt de sistema enviado ao modelo da IA:
  ```txt
  [MEMÓRIAS E INSTRUÇÕES ESPECÍFICAS DA AGÊNCIA]:
  - [PROCESS]: ...
  - [PREFERENCE]: ...
  ```
- **Gaps**: A geração de embeddings do texto do usuário client-side em tempo de execução e a chamada à RPC `match_memories` não estão acopladas diretamente no fluxo do chat do backend local, que hoje usa o carregamento de memórias simples limitado como RAG básico por ausência de pipeline de embeddings ativa no ambiente de homologação.

---

## 3. Classificação das Entregas de RAG

- **pgvector e match_memories no Banco**: **REAL PONTA A PONTA**
- **Busca Semântica no Backend**: **REAL, MAS NÃO TESTADA**
- **Geração de Embeddings Online**: **AUSENTE** (o sistema utiliza fallbacks ou injeções parametrizadas simples).
