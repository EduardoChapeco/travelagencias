# Promessas vs. Realidade Técnica — Rodada 3 (TravelOS)

Este documento analisa as promessas de escopo funcional contra o estado real do código-fonte local e produção, focando no saneamento de mocks e fallbacks.

---

## 1. Mapeamento de Entregas

### A. Livro-Razão Contábil (Ledger)
* **Prometido**: Razão contábil com partidas dobradas e controle imutável de lançamentos.
* **Estado Real**: **100% REAL**. A tabela `financial_ledger_entries` possui políticas RLS que impedem UPDATE/DELETE. Triggers gravam automaticamente lançamentos contábeis nas quitações. O frontend exibe a listagem de auditoria em nova aba (/ledger) com paginação e filtros.

### B. Otimização de Performance de Grupos
* **Prometido**: Substituição do processamento lento client-side de faturamento de grupos.
* **Estado Real**: **100% REAL**. A view `group_tours_financial_summary` executa todas as somas de custos operacionais (fixos e variáveis lineares), faturamento de passagens quitadas e ROI de forma nativa no banco. O frontend consome os dados paginados e suporta buscas por título.

### C. Busca Semântica de IA (RAG)
* **Prometido**: Consulta de memórias de agência por similaridade de cosseno com embeddings de vetores.
* **Estado Real**: **100% REAL**. O arquivo `ai-chat.functions.ts` foi reescrito, descontinuando o SELECT limit 10 e implementando chamadas à RPC `match_memories` por embeddings semânticos.

### D. Usabilidade do Recibo A4
* **Prometido**: Recibo A4 legível em celulares sem transbordos.
* **Estado Real**: **100% REAL**. O wrapper foi refatorado de `w-[595px]` fixo para `w-full max-w-[595px]` fluido com margens proporcionais no `PaymentReceiptModal.tsx`.
