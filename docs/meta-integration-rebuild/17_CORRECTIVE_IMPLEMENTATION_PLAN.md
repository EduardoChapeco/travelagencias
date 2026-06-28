# 17. Corrective Implementation Plan (Plano de Refatoração Corretiva)

## 1. Escopo das Ações de Refatoração
Para consolidar a integração Meta de acordo com as diretrizes oficiais de segurança e usabilidade, dividimos as correções em três fases principais:

### Fase 1: Segurança e Consolidação do Schema (P0)
* **Encryption de Tokens:** Implementar funções auxiliares de banco/triggers para descriptografar os segredos e tokens salvos em `channels` e `whatsapp_connections` utilizando pgcrypto de forma interna e transparente para a Edge Function de envio.
* **Segurança de Webhook:** Assegurar que a assinatura HMAC seja validada em todas as chamadas POST do webhook.

### Fase 2: Interface e Fluxos (P1)
* **Embedded Signup Setup:** Adicionar o botão "Conectar com Facebook / WhatsApp" no frontend carregando o SDK oficial de Login.
* **Unificação do Inbox:** Garantir que todas as DMs do Instagram e mensagens do WhatsApp alimentem as tabelas canônicas de `conversations` e `messages` consumidas pelo Inbox.

### Fase 3: Compliance e Páginas Legais (P2)
* **Rotas Públicas:** Criar os componentes e rotas para as políticas, termos de uso e fluxo de exclusão de dados.
* **Data Deletion Endpoint:** Implementar a API de callback para receber solicitações de exclusão enviadas pela Meta.
