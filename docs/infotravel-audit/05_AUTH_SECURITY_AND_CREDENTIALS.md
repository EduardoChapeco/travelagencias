# 05. Arquitetura de Autenticação e Segurança de Credenciais

Este documento descreve as políticas de segurança de dados e a arquitetura recomendada para gerenciar as credenciais da API **Infotravel/Infotera** de forma estritamente isolada por agência (multi-tenant) e com proteção absoluta contra vazamentos para a camada de cliente (frontend).

---

## 1. Fluxo de Handshake Seguro e Autenticação

Para garantir a integridade dos dados contábeis e operacionais, a comunicação segue o modelo de isolamento de privilégios de ponta a ponta:

```txt
UI (React Component)
  → Envia requisição sem credenciais contendo apenas o ID da Agência (obtido do contexto seguro de sessão).
  → Server Function do TanStack Start intercepta a chamada.
  → Valida se a sessão do operador está ativa e se ele de fato pertence à agência solicitada (Prevenção de IDOR).
  → Supabase Edge Function (rodando como service_role) busca as credenciais cifradas na tabela `api_keys`.
  → Efetua chamada de login à API do Infotravel (`POST /api/v1/user/login`).
  → Recebe o token JWT da operadora.
  → Salva o token JWT em cache volátil (Memory cache ou Redis com expiração rápida).
  → Executa a chamada final da API Infotravel usando o cabeçalho `Authorization: Bearer <token>`.
  → Retorna os resultados normalizados à UI (sem expor segredos ou tokens da operadora).
```

---

## 2. Regras de Segurança e Hardening de Credenciais

### 2.1. Credenciais Estritamente Server-Side
As chaves `infotravel_username`, `infotravel_password`, `infotravel_client` e `infotravel_agency` devem ser armazenadas exclusivamente no banco de dados e lidas apenas no runtime do servidor (Edge Function) sob o papel `service_role`. **Nenhuma credencial ou token de acesso JWT da Infotravel pode ser retornado para o navegador do operador em nenhuma circunstância.**

### 2.2. Prevenção de Invasão de Tenant (Multi-Tenant Isolation)
O conector na Edge Function deve sempre realizar a validação cruzada do usuário logado contra a tabela `user_roles` antes de ler as credenciais na tabela `api_keys`:

```typescript
const { data: roleData, error: roleError } = await supabaseClient
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("agency_id", agencyId)
  .maybeSingle();

if (roleError || !roleData) {
  throw new Error("Acesso não autorizado para esta agência.");
}
```
Isso impede fisicamente que um operador mal-intencionado da Agência A passe o `agencyId` da Agência B no payload da requisição para ler ou usar as credenciais da concorrente.

### 2.3. Gestão e Renovação de Tokens JWT da API
* **Expiração**: Os tokens retornados pela API do Infotravel possuem tempo de vida limitado (tipicamente 1 hora a 12 horas).
* **Estratégia de Cache**: Para evitar chamadas excessivas de login a cada busca (o que causaria throttling e lentidão na UI), os tokens devem ser cacheados localmente no servidor de forma associada à agência (`infotravel_token_${agencyId}`) utilizando tempo de expiração (`TTL`) igual a 90% do tempo de vida do token.
* **Sanitização de Logs**: Todas as Edge Functions devem filtrar os objetos de log para remover quaisquer propriedades contendo `password`, `key_value` ou `token` antes de gravar no log do console ou no banco de dados, garantindo conformidade com a LGPD e políticas de segurança de dados.
