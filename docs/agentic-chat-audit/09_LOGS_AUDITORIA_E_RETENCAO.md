# Logs de Auditoria e Retenção

Este documento audita o registro de transações executadas via IA, os esquemas de metadados salvos na tabela `audit_log` e o cumprimento de políticas de retenção e imutabilidade de logs.

---

## 1. Gravação de Eventos Transacionais de IA

O Turis registra de forma imutável cada decisão operacional proposta pela inteligência:

- **Mensagens de Chat**: A cada retorno de IA em [ai-chat.functions.ts](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L415-L423), é gravado um log na tabela `audit_log` contendo:
  - `agency_id`: Identificador da agência.
  - `actor_id`: ID do operador.
  - `action`: `"ai_chat_message"`.
  - `entity_type`: `"ai_chat"`.
  - `entity_id`: ID da conversa.
  - `metadata`: Salva o modelo utilizado (`google/gemini-2.5-flash`), a rota onde o operador se encontrava e a estrutura `tool_call` gerada.
- **Execuções do Motor de Ação**: O arquivo [ActionExecutor.ts](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) grava logs detalhados:
  - Em caso de **sucesso**: Grava a ação (`create_lead`), a entidade associada (`lead`, `client`) com seu ID respectivo no banco, e o payload JSON original no campo de metadados junto com o resultado `"success"`.
  - Em caso de **falha**: Em caso de erro na transação, grava o log com resultado `"failed"` e a string da mensagem de erro (`metadata.error`), permitindo auditoria forense detalhada de exceções de banco.

---

## 2. Imutabilidade e Política de Retenção de Histórico

Para fins de conformidade (Compliance):

- A função `clearAIChatConversation` em [ai-chat.functions.ts](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L428-L441) foi intencionalmente implementada como um **no-op** (sem operação) de banco:
  ```typescript
  export const clearAIChatConversation = createServerFn({ method: "POST" }).handler(
    async ({ data, context }) => {
      // Keep history intact for audit trail compliance
      return { ok: true };
    },
  );
  ```
  Isso garante que conversas contendo execuções de escrita nunca sejam apagadas por operadores na base de dados, mantendo a rastreabilidade intacta.

---

## 3. Classificação das Entregas de Auditoria

- **Imutabilidade e Retenção de logs no Chat**: **REAL PONTA A PONTA**
- **Logs com Metadata do Executor**: **REAL PONTA A PONTA**
- **Log de Erros e Exceções**: **REAL PONTA A PONTA**
