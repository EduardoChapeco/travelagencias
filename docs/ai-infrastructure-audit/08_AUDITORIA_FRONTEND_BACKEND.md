# Auditoria de Fronteira Frontend e Backend

Este documento analisa as divisões de responsabilidade entre o cliente (navegador) e o servidor (Supabase Edge Functions e Banco de Dados) no processamento de IA e OCR do TravelAgencias/TravelOS.

---

## 1. Mapeamento de Dependências e SDKs

- **SDKs no Cliente**:
  - **Conformidade**: O frontend do projeto não importa SDKs pesados de IA como `@google/generative-ai`, `openai` ou `groq-sdk`. Isso garante que o bundle inicial do cliente não seja sobrecarregado com lógica de requisições a provedores.
  - **Interface Homogênea**: Todas as chamadas de IA no frontend são direcionadas exclusivamente para as Edge Functions usando a biblioteca client `supabase.functions.invoke(...)`.

---

## 2. Riscos de Vazamento de Segredos e Chaves de API

Apesar de não haver importações de SDKs, existem pontos críticos de vazamento de credenciais na arquitetura frontend/backend atual:

### A. Exposição na Tela de Configurações (`settings.ts`)

O serviço frontend `src/services/settings.ts` executa a seguinte consulta:

```typescript
let q = supabase.from("api_keys").select("*").eq("agency_id", agencyId);
```

- **Vulnerabilidade**: Como RLS e tabelas enviam todas as colunas selecionadas, o valor real da chave API (`key_value`) é transmitido via rede JSON para a UI do administrador.
- **Solução Esperada**: O backend (ou uma View filtrada) deve mascarar o valor da chave (retornando apenas os primeiros e últimos 4 caracteres, ex: `AIzaSy...4x9Z`) e nunca retornar o secret real para o frontend, mantendo-o apenas no cofre seguro.

### B. Ingestão de Credenciais no Body do Request

Em algumas integrações legadas, o frontend tenta obter configurações e enviá-las no body da Edge Function. Isso permite a adulteração de parâmetros de quota e limite do lado do cliente.

- **Solução Esperada**: Todo o processo de resolução de credenciais deve ser server-side. O frontend apenas informa o `agency_id` (o qual é validado contra o JWT do usuário), e o servidor resolve a credencial a partir do banco de dados interno ou cofre de segredos.
