# 17. Security and Secrets (Segurança e Armazenamento de Segredos)

## 1. Segredos no Código e Banco de Dados
* **P1.1 Token Restriction:** A migração `20260730000001` restringiu com sucesso o SELECT das colunas `secret_reference` e `verify_token_reference` da tabela `whatsapp_connections` para usuários normais (`authenticated`).
* **View Pública:** O frontend consome apenas a view `whatsapp_connections_public` que oculta estas colunas sensíveis.
* **Evolution API fallback:** No arquivo `whatsapp-sender/index.ts`, se a descriptografia falhar, ele usa o `META_VERIFY_TOKEN` obtido do env local como fallback. Os segredos brutos nunca são devolvidos ao frontend nas queries normais.

## 2. RLS e Cross-tenant
* A validação de membros da agência (`is_agency_member(auth.uid(), agency_id)`) está ativa em todas as tabelas críticas de comunicação, impedindo vazamentos de mensagens ou canais de outras agências.
