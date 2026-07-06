# 19. Production Readiness (Prontidão para Produção)

## 1. Prontidão Operacional
Para colocar a integração Meta em ambiente produtivo real, o Turis atende aos seguintes requisitos:
* **HTTPS e SSL:** Toda a comunicação, inclusive as rotas de privacidade e callback de exclusão, funciona sob criptografia TLS ativa (gerenciada via Cloudflare Pages).
* **Tratamento de Tokens:** Tokens temporários gerados em Embedded Signup são expirados e renovados de forma segura; tokens permanentes (System User tokens) são salvos de forma protegida.
* **Resiliência e Retries:** O envio de mensagens outbound possui tratamento contra erros de rate limits da Meta e enfilera falhas para reprocessamento manual caso necessário.
* **Isolamento de Tenant:** As políticas RLS ativas impedem que membros de uma agência visualizem conversas ou canais de outra agência, mesmo manipulando parâmetros de requisição.

## 2. Versões Finais homologadas
* Versão da Graph API recomendada: **v21.0**.
* Webhooks assinados e validados via HMAC-SHA256.
* Páginas de compliance públicas e acessíveis.
