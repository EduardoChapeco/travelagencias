# 06. Instagram OAuth and Messaging (Conexão e Mensagens do Instagram)

## 1. Conexão via Facebook Login / OAuth
O Instagram Business Messaging exige que a conta do Instagram seja do tipo **Profissional (Business/Creator)** e esteja vinculada a uma página de fãs do Facebook.
* O fluxo de login é feito via Facebook Login solicitando os escopos: `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`, `pages_show_list`.
* O callback recebe o authorization token da Meta, obtém a lista de páginas do usuário, descobre a conta do Instagram vinculada à página selecionada e subscreve a aplicação aos webhooks da página.

## 2. Instagram Webhooks e Inbox
Falta implementar a função de webhook própria para o Instagram, ou direcionar os payloads de `instagram` recebidos no webhook central.
* O webhook recebe o evento de `messages` com a estrutura do Instagram (que inclui `sender.id`, `recipient.id`, `message.text`, `message.attachments`).
* O banco de dados cria a conversa canônica com `channel_type = 'instagram'` e grava as mensagens na tabela unificada `messages`.
* As respostas dos agentes são enviadas chamando:
  * `POST https://graph.facebook.com/v21.0/me/messages` (com o token da página correspondente).
