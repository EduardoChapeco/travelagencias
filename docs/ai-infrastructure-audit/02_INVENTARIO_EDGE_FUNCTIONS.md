# Inventário e Auditoria de Edge Functions

Este documento cataloga todas as Edge Functions ativas do projeto, identificando o chamador (frontend ou serviço), validação de token JWT, validação de membro do tenant (membership), uso de chaves administrativas (service role), timeouts, e estado de deploy.

---

## Tabela de Edge Functions

| Function                 | Chamador                                  | JWT | Membership | Role | Service role | Provider                         | Chave              | Timeout | Persistência | Deploy remoto |
| :----------------------- | :---------------------------------------- | :-: | :--------: | :--: | :----------: | :------------------------------- | :----------------- | :-----: | :----------: | :-----------: |
| `ai-orchestrator`        | Vários módulos (CRM, Proposta, etc)       | Sim |    Não     | Não  |     Sim      | Gemini, OpenAI, Groq, OpenRouter | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ocr-proposal`           | `src/services/proposals.ts`               | Sim |    Sim     | Sim  |     Sim      | Gemini, Groq                     | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ocr-passenger-document` | `TripsIdPassengers` (Passageiros)         | Sim |    Sim     | Sim  |     Sim      | Gemini                           | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ocr-boleto`             | `TripsIdFinancial` (Faturas)              | Sim |    Sim     | Sim  |     Sim      | Gemini                           | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ai-voucher-ocr`         | `src/lib/ocr-ai.ts` (Vouchers)            | Sim |    Sim     | Sim  |     Sim      | Gemini, Groq                     | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `supplier-ocr-extractor` | Tarifário fornecedores UI                 | Sim |    Sim     | Sim  |     Sim      | Gemini, Groq                     | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ai-message-processor`   | Omnichannel Chat, AI Hunter               | Sim |    Sim     | Sim  |     Sim      | Gemini                           | RPC/Decryption/Env |   60s   |     Não      |    ACTIVE     |
| `ai-task-evaluator`      | `src/routes/agency.$slug.daily-tasks.tsx` | Sim |    Não     | Não  |     Sim      | Gemini                           | Env                |   60s   |     Não      |    ACTIVE     |
| `generate-site-ai`       | `AILandingPageSheet.tsx`                  | Sim |    Não     | Não  |     Sim      | Gemini, OpenAI                   | Env                |   60s   |     Não      |    ACTIVE     |
| `landing-page-agent`     | `AILandingAgent.tsx`                      | Sim |    Não     | Não  |     Sim      | Gemini                           | Env                |   60s   |     Não      |    ACTIVE     |
| `google-business-post`   | `src/routes/agency.$slug.portal.blog.tsx` | Sim |    Não     | Não  |     Sim      | Google Business                  | Env                |   60s   |     Não      |    ACTIVE     |
| `whatsapp-sender`        | Disparo automático / suporte              | Sim |    Não     | Não  |     Sim      | Evolution API                    | Env                |   60s   |     Não      |    ACTIVE     |
| `whatsapp-webhook`       | Webhook de chat (Externo)                 | Não |    Não     | Não  |     Sim      | Interno                          | -                  |   60s   |     Sim      |    ACTIVE     |
| `gmail-send`             | Suporte e Envio de E-mails                | Sim |    Não     | Não  |     Sim      | Gmail API                        | Env                |   60s   |     Não      |    ACTIVE     |
| `gmail-sync`             | Sincronizador de e-mails suporte          | Sim |    Não     | Não  |     Sim      | Gmail API                        | Env                |   60s   |     Sim      |    ACTIVE     |
| `search-unsplash`        | Upload de capas / Mídia                   | Sim |    Não     | Não  |     Sim      | Unsplash API                     | Env                |   60s   |     Não      |    ACTIVE     |
| `infotravel-connector`   | `src/services/infotravel.ts`              | Sim |    Não     | Não  |     Sim      | InfoTravel API                   | Env                |   60s   |     Não      |    ACTIVE     |

---

## Legenda dos Campos de Auditoria

- **JWT**: Se a função exige e valida o cabeçalho `Authorization: Bearer <JWT>` usando `supabase.auth.getUser()`.
- **Membership**: Se a função valida se o ID do usuário autenticado no JWT realmente pertence à agência (`agency_id`) informada no body, consultando a tabela `user_roles`.
- **Role**: Se valida se o usuário possui a role necessária (como `agency_admin` ou `agent`) para executar a operação.
- **Service role**: Se a função instancia o cliente administrativo `createClient(url, service_role_key)` para poder burlar políticas de RLS ou interagir com tabelas restritas (como `api_keys`).
- **Timeout**: O tempo máximo padrão configurado na nuvem Deno (geralmente 60 segundos).
- **Persistência**: Se a função escreve logs ou armazena o resultado em tabelas físicas no banco de dados.

---

## Principais Falhas de Arquitetura Identificadas

1. **Uso Indiscriminado de Service Role**: Quase todas as funções de IA instanciam um cliente com a `SUPABASE_SERVICE_ROLE_KEY` para poder rodar consultas, mas algumas funções como `ai-orchestrator`, `generate-site-ai`, `landing-page-agent` e `google-business-post` **não validam a relação de membership** do usuário autenticado com a agência dona dos dados!
2. **Duplicação de Decryptors AES**: As funções de OCR importam codificadores Base64 do Deno e decodificam as credenciais localmente duplicando toda a lógica criptográfica em vez de consumirem uma API centralizada ou módulo utilitário comum de import.
3. **Ausência de Jobs Assíncronos**: Nenhuma das Edge Functions de OCR possui suporte a fila. O upload é síncrono e os binários em base64 são enviados diretamente na payload JSON.
