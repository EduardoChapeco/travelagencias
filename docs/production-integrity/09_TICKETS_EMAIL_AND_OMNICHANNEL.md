# 09. Suporte, Omnichannel e Integração Gmail

Este documento analisa a integridade do sistema de chamados (tickets) e a veracidade da integração "Omnichannel" com o Gmail e Resend.

## 1. Funcionamento do Envio de E-mails

O chat de suporte no arquivo [support.$ticket_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.support.$ticket_id.tsx) faz requisições para a Edge Function `gmail-send` ao disparar mensagens externas.

* **Fluxo de Saída (Outbox):**
  * Caso a agência possua tokens configurados em `integrations_config.gmail_tokens`, a Edge Function realiza uma chamada POST para `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`.
  * Se não houver tokens do Gmail, ela tenta recuperar a chave `resend` da tabela `api_keys` e faz o disparo via API do Resend.
  * O ID do e-mail retornado (`threadId` ou `id` do Resend) é salvo no campo `email_thread_id` da tabela `support_tickets`.
  * *Ponto de Falha no Envio:* O construtor MIME na Edge Function não injeta os cabeçalhos de email `In-Reply-To` ou `References`. As respostas enviadas não se agrupam corretamente em threads na caixa de entrada do destinatário se o cliente de e-mail dele exigir essas tags, enviando e-mails soltos com o assunto alterado.

## 2. Auditoria da Sincronização Reversa (Recepção de E-mails)

A funcionalidade de recepção e atualização de tickets com e-mails recebidos é **QUEBRADA / MOCK**:

1. **Edge Function `gmail-sync` Comentada:** Ao auditar o arquivo da Edge Function [gmail-sync/index.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/gmail-sync/index.ts), descobriu-se que a lógica de consulta à API do Gmail (`/me/history`) está **completamente comentada** (linhas 51-63).
2. **Lógica de Mock em Produção:** Em vez de sincronizar mensagens reais, a função executa um mock estático permanente (linhas 65-89):
   ```typescript
   const mockReceivedThreadId = "thread_abc123";
   const mockContent = "Resposta do Fornecedor / Cliente recebida via Gmail.";
   const mockFrom = "fornecedor@hotel.com";
   ```
   A função finge ter recebido um e-mail com a string fixa acima e insere esse mock na tabela `ticket_messages` sempre que é acionada por um Pub/Sub.
3. **Inexistência de Webhooks e Triggers:** Não há nenhum gatilho, agendamento no banco de dados (`pg_cron`) ou chamada no frontend da aplicação que invoque a Edge Function `gmail-sync` ou configure o webhook do Pub/Sub do Google Cloud.
4. **Armazenamento de E-mails:** As mensagens enviadas são gravadas localmente em logs append-only na tabela `ticket_messages`, respeitando a LGPD, porém sem receber respostas.

## 3. Conclusão da Auditoria Omnichannel

O sistema **não é Omnichannel**.
Ele é exclusivamente um **Envio Unidirecional de E-mails** com fallback para Resend.
Qualquer resposta enviada pelo cliente ou fornecedor no e-mail recebido nunca entrará no chat da agência, exigindo comunicação manual externa e quebrando a promessa operacional descrita no walkthrough.
