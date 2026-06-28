# 09. Secrets Security and RLS (Segurança de Segredos e Políticas RLS)

## 1. Tratamento de Chaves Sensíveis
* Chaves de API e tokens de acesso (como `whatsapp_access_token` e `instagram_access_token`) **nunca** devem ser acessados diretamente pelo frontend.
* As chaves sensíveis são salvas criptografadas e restritas a acessos do backend. Apenas a Edge Function de envio (que roda com `service_role` ou privilégios elevados de execução) possui acesso às credenciais brutas descriptografadas.
* O frontend acessa apenas a view pública `whatsapp_connections_public` que omite as colunas de secrets e tokens.

## 2. Isolamento de Dados via Row Level Security (RLS)
* **Tabelas protegidas:** `channels`, `contacts`, `conversations`, `messages`, `whatsapp_connections`.
* **Políticas multitenant:** Cada operação de SELECT, INSERT ou UPDATE obrigatoriamente valida se a agência do registro (`agency_id`) é uma agência na qual o usuário autenticado (`auth.uid()`) é membro.
* **Privilégios de Coluna (PostgreSQL):** Revogamos o privilégio de SELECT sobre as colunas `secret_reference` e `verify_token_reference` da tabela `whatsapp_connections` para o role `authenticated`, garantindo segurança em nível de banco de dados.
