# Action Registry e Tool Calling

Este documento audita o registro central de ações da IA, os esquemas de validação associados e a integração com as chamadas de ferramentas (Tool Calling).

---

## 1. Catálogo e Registro de Ações

O TravelOS possui um registro central de ferramentas declarativas que impede lógica difusa ou espalhada em prompts textuais:
* **Arquivo**: [ActionRegistry.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionRegistry.ts)
* **Estrutura**: Define a interface `ActionDefinition` e exporta o objeto `ActionRegistry` contendo as **23 ações de negócio** mapeadas.
* **Campos Obrigatórios**: Cada ação possui `code`, `name`, `description`, `domain`, `inputSchema` (Zod), `allowedRoles`, `requiresConfirmation` e `riskLevel`.

---

## 2. Inventário de Ferramentas Registradas

O catálogo mapeia exatamente as seguintes ferramentas de negócio:
1. `create_lead` (CRM): Cadastra lead com nome e destino.
2. `update_lead` (CRM): Atualiza telefone, e-mail ou notas.
3. `change_lead_stage` (CRM): Altera o estágio do funil do CRM.
4. `create_client` (CRM): Cadastra cliente físico.
5. `add_traveler` (Viagens): Vincula passageiro à viagem.
6. `update_traveler` (Viagens): Atualiza passaporte ou dados do viajante.
7. `start_quote` (Viagens): Inicia orçamento.
8. `create_proposal` (Viagens): Gera proposta comercial vinculada à cotação.
9. `add_hotel` (Viagens): Reserva de hotel.
10. `add_flight` (Viagens): Reserva de trecho aéreo.
11. `create_trip` (Viagens): Cria viagem de proposta ganha.
12. `query_trip` (Viagens): Consulta status e passageiros de viagem.
13. `create_task` (Operacional): Cria tarefa com data.
14. `create_ticket` (Suporte): Abre ticket de pós-vendas.
15. `register_payment` (Financeiro): Registra recebimento.
16. `query_installments` (Financeiro): Consulta parcelas de viagem.
17. `generate_contract` (Documentos): Emite contrato de viagem.
18. `generate_voucher` (Documentos): Emite voucher oficial.
19. `query_supplier` (Operacional): Consulta fornecedores ativos.
20. `start_ocr` (Documentos): Inicia processamento inteligente de arquivos.
21. `query_groups` (Operacional): Consulta excursões terrestres.
22. `update_rooming` (Operacional): Distribui leitos de hotel de grupo.
23. `generate_report` (Financeiro): Emite relatórios de comissões/vendas.

---

## 3. Integração com a Requisição de IA (Tool Calling)

No arquivo [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts):
* **Conversor de Schemas**: A função `zodToOpenAiSchema` lê as propriedades do schema Zod de entrada e converte para o formato JSON Schema suportado pela API de chat da OpenAI/Gemini.
* **Mapeamento de Ferramentas**: Converte o catálogo `ActionRegistry` em ferramentas nativas (`type: "function"`).
* **Parâmetro de Envio**: As ferramentas mapeadas são enviadas na propriedade `tools` da requisição HTTP do LLM.
* **Leitura de Retorno**: Lê a propriedade `tool_calls` da resposta da IA, faz o parse de `arguments` em JSON e retorna o objeto estruturado.

---

## 4. Classificação das Entregas

* **Action Registry Central**: **REAL PONTA A PONTA**
* **Integração de Tool Calling com API**: **REAL, MAS NÃO TESTADA** (depende de chave de API em ambiente de homologação, mas o código está 100% implementado e tipado).
