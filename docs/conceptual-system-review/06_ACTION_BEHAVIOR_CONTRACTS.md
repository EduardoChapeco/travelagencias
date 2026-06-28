# 06 CONTRATO FUNCIONAL DE AÇÕES

## Ação: Aprovar Proposta
- **Ator:** Cliente (via Link Público) ou Agente.
- **Estado Inicial:** `sent` ou `viewed`.
- **Transação:** Deve atualizar status da proposta e transitar o Lead no CRM para `won`.
- **Efeitos Colaterais:** Disparo de email (Webhook).
- **Implementação Real:** Encontrada no `client.consents.tsx` e RPCs.
