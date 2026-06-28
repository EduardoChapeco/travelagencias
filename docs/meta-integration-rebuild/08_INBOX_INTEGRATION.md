# 08. Inbox Integration (Integração com a Caixa de Entrada)

## 1. Conexão das Conversas com o Inbox
O módulo Inbox (`agency.$slug.inbox.tsx`) está estruturado para carregar as conversas e mensagens diretamente a partir do modelo canônico.
* **Consumo de Canais:** O filtro de canais no topo do menu lateral lê as opções dinamicamente da tabela `channels`.
* **Filtros e Realtime:**
  * O Realtime do Supabase escuta a tabela `messages` e recarrega a lista de conversas quando uma nova mensagem entra.
  * O operador pode filtrar por "Minhas Conversas" (onde `assigned_user_id = auth.uid()`) ou ver a fila geral da agência.
* **Composição e Envio:**
  * Quando o operador digita uma resposta e clica em enviar, a interface insere um registro na tabela `messages` com `direction = 'outbound'`, `status = 'queued'` e `body = text`.
  * O banco dispara a trigger que invoca a Edge Function correspondente para fazer o despacho da mensagem na API de destino.
  * A UI exibe um indicador visual de "enviando" enquanto o status for `queued`. Após o webhook do canal atualizar o status da mensagem para `sent` ou `delivered`, a interface atualiza o status em tempo real via Realtime.
