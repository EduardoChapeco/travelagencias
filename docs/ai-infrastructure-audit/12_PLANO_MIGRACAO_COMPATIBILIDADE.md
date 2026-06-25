# Plano de Migração e Compatibilidade (Strangler Pattern)

Este documento define a estratégia de transição gradual das Edge Functions e serviços de IA legados para o novo orquestrador centralizado, garantindo zero quebra de fluxos em runtime.

---

## 1. Abordagem Strangler Pattern

Não faremos uma reescrita simultânea ("Big Bang") de todas as conexões do sistema. Adotaremos um padrão de estrangulamento em 3 fases:

1. **Fase 1 (Internal Redirect)**: Manteremos as assinaturas e as rotas das Edge Functions existentes (ex: `ocr-proposal`, `ocr-boleto`), mas reescreveremos o corpo interno delas para servir como meros adaptadores/clientes que redirecionam a chamada para o novo `AIOrchestrator` no backend.
2. **Fase 2 (Frontend Migration)**: Migraremos gradualmente os invokers de serviço no front-end para chamarem diretamente a rota central `/functions/v1/ai-orchestrator` especificando a `action`/`feature` correspondente.
3. **Fase 3 (Clean up)**: Removeremos as Edge Functions antigas da nuvem após monitorarmos o tráfego e confirmarmos que o volume de requisições nelas caiu a zero.

---

## 2. Matriz de Migração e Equivalência

| Função Antiga            | Novo Componente / Adaptador                  | Chamadores no Frontend                             | Estratégia de Compatibilidade                                                           | Status da Migração |
| :----------------------- | :------------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------- | :----------------- |
| `ocr-proposal`           | Central `AIOrchestrator` (`ocr_proposal`)    | `src/services/proposals.ts`                        | O adapter encapsula e devolve a estrutura JSON exata esperada pelo editor de propostas. | PENDENTE           |
| `ocr-passenger-document` | Central `AIOrchestrator` (`ocr_passenger`)   | `src/routes/agency.$slug.trips.$id.passengers.tsx` | Retorna o payload plano com os campos (`document_number`, `full_name`, etc).            | PENDENTE           |
| `ocr-boleto`             | Central `AIOrchestrator` (`ocr_boleto`)      | `src/routes/agency.$slug.trips.$id.financial.tsx`  | Devolve a linha digitável parseada e os dados de pagamento identificados.               | PENDENTE           |
| `ai-voucher-ocr`         | Central `AIOrchestrator` (`ocr_voucher`)     | `src/lib/ocr-ai.ts`                                | Converte o retorno estruturado na tipagem `VoucherAIResult` no front-end.               | PENDENTE           |
| `supplier-ocr-extractor` | Central `AIOrchestrator` (`ocr_supplier`)    | Interface de tarifário                             | Mapeia tabelas de custos do fornecedor para os campos de rateio.                        | PENDENTE           |
| `ai-message-processor`   | Central `AIOrchestrator` (`chat_suggestion`) | `AIHunterPanel.tsx`, `OmnichannelChat.tsx`         | Retorna texto plano e tags sugeridas.                                                   | PENDENTE           |

---

## 3. Garantia de Retrocompatibilidade de Contratos

Para evitar quebras no frontend durante o deploy:

- **Garantia de Assinatura**: O endpoint antigo deve receber os mesmos parâmetros (`file_base64`, `mime`, `text`, `agency_id`) e retornar o mesmo contrato de resposta (`{ result: { ... } }`).
- **Fallback Local em Caso de Erro de Rede**: Se a comunicação interna entre a função antiga e o orquestrador falhar, a função antiga deve conter uma lógica de fallback autônoma mínima usando `Deno.env` direto para evitar interrupções de serviço.
