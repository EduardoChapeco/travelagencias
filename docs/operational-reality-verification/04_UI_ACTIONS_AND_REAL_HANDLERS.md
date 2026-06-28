# 04. UI Actions and Real Handlers (Ações de Interface e Manipuladores Reais)

## 1. Conectar WhatsApp / Instagram no Inbox
* **Interface:** Rota `/agency/$slug/inbox` -> Botão "Configurações" -> Selecionar canal.
* **Ação/Handler:** Abre um modal onde o usuário escolhe o tipo e preenche os campos de Token e IDs.
* **Código Real:**
  * No caso do WhatsApp: Preenche chaves manuais (Verify Token, Access Token, Phone Number ID) que são salvas via `saveApiKey` na tabela `agency_api_keys` (ou `whatsapp_connections`).
  * No caso do Instagram: Invoca a Edge Function `ai-orchestrator` com a action `save-credential` para guardar o `instagram_access_token` e insere um registro na tabela `channels` com `type = 'instagram'`.
* **Diagnóstico:** Não há conexão real ponta a ponta com a API do Instagram, apenas a criação lógica do canal no banco de dados.

## 2. Renomear Coluna do Kanban
* **Interface:** Rota `/agency/$slug/daily-tasks` ou Kanban de Tarefas -> Menu da coluna -> "Renomear".
* **Ação/Handler:** Abre um input de texto inline. Ao confirmar, executa a função local `handleColumnRename`.
* **Código Real:**
  ```javascript
  const handleColumnRename = (status, newLabel) => {
    setCustomColumnLabels((prev) => {
      const updated = { ...prev, [status]: newLabel };
      localStorage.setItem("ta_kanban_column_labels_v2", JSON.stringify(updated));
      return updated;
    });
  };
  ```
* **Diagnóstico:** A ação de renomeação não invoca nenhum endpoint de backend ou banco de dados, sendo 100% dependente do `localStorage` do navegador do dispositivo atual.
