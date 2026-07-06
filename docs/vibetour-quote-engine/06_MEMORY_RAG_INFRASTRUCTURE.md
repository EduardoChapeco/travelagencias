# 06. Infraestrutura de Memória e Recuperação IA (Memory and RAG Infrastructure)

Este documento analisa as estruturas de vetores, embeddings e mecanismos de busca semântica (RAG) presentes no Turis.

---

## 1. Embeddings e pgvector

O Turis já possui suporte nativo a banco vetorial e geração de embeddings:

- **Tabela do Banco**: `public.omnichannel_message_embeddings` contém uma coluna `embedding` (do tipo `vector` de 1536 dimensões no PostgreSQL).
- **Gerador de Vetores**: O arquivo `src/lib/api/ai-chat.functions.ts` exporta a função `getEmbedding`:
  ```typescript
  async function getEmbedding(
    text: string,
    apiKey: string,
    isOpenRouter: boolean,
  ): Promise<number[] | null>;
  ```

  - _Modelo_: Utiliza `text-embedding-3-small` (1536 dimensões) da OpenAI.
  - _Gateway_: Direcionado à API oficial da OpenAI ou ao Gateway da Lovable (`https://ai.gateway.lovable.dev/v1/embeddings`).

---

## 2. Abstração e RAG

- **Busca por Similaridade**: As mensagens omnichannel geram embeddings e são consultadas semanticamente no banco PostgreSQL usando funções de similaridade vetorial (como produto interno ou distância coseno via pgvector).
- **Reaproveitamento para Cotações**: Esta mesma infraestrutura de geração de embeddings e pesquisa vetorial em PostgreSQL pode ser reaproveitada para buscar documentos de regras de viagem, conhecimento de destinos gateway e histórico de decisões anteriores do operador.
