# Fluxos Operacionais e Integrações — Rodada 3 (TravelOS)

Este documento valida a consistência dos fluxos transacionais ponta a ponta e o correto acoplamento de APIs e motores de IA.

---

## 1. Fluxo de Aprovação Idempotente de Inscrição B2C

1. O operador clica em "Aprovar" na listagem de inscritos da excursão.
2. A mutation executa uma única chamada à RPC `approve_group_enrollment`.
3. O banco de dados realiza o lock pessimista, valida a disponibilidade de vagas no grupo para evitar overbooking e a exclusividade do assento (`seat_number`).
4. A transação insere ou vincula o cliente, cria a viagem individual, cria o plano de parcelamento, quita a primeira parcela, gera a movimentação de entrada no fluxo de caixa e altera o status da inscrição para confirmado. Tudo de forma atômica e idempotente.

---

## 2. Fluxo de Busca Semântica da IA (RAG)

- **Embeddings e Similaridade**: A server function `sendAIChatMessage` em `ai-chat.functions.ts` agora utiliza embeddings gerados pela API do OpenAI para pesquisar os playbooks e memórias da agência no PostgreSQL por similaridade de cosseno, chamando a RPC `match_memories`. Isso substitui o SELECT simples limit 10 por um motor de busca semântica de alta precisão.

---

## 3. Geração de Flyers e Imagens de Brochura

- **Exportação Gráfica**: A exportação de flyers comerciais no formato PNG utiliza a biblioteca `html2canvas` renderizando o componente de divulgação de forma fiel. O Proposal Studio é chamado para criar brochuras comerciais dinamicamente vinculadas à excursão através do campo `group_tour_id` no banco, evitando registros redundantes.
