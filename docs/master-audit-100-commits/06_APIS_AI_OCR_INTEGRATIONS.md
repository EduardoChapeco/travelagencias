# 06. APIs, Inteligência Artificial, OCR e Integrações

Este documento inventaria e analisa as integrações externas da plataforma TravelOS, avaliando o fluxo de dados, tratamento de erros, autenticação, resiliência de rede e contingências aplicadas.

---

## 1. Inventário de Integrações Ativas

### 1.1 Gemini 2.5 Flash (OCR & Inteligência de Fornecedores)
*   **Finalidade**: Upload e processamento automático de passaportes de viajantes, boletos bancários e faturas de fornecedores.
*   **Funcionamento**: A Edge Function `supplier-ocr-extractor` recebe o arquivo do storage e realiza uma chamada HTTP para a API oficial do Gemini (`v1/models/gemini-2.5-flash:generateContent`). O prompt força a inteligência artificial a retornar um JSON estrito contendo nome do fornecedor, CNPJ, contatos, produtos e valores.
*   **Tratamento de Erro & CORS**: A função sanitiza o retorno contra injeções e valida o JSON. Em caso de timeout ou falha na API do Gemini, a Edge Function retorna um código HTTP correspondente que é capturado pelo frontend, apresentando uma mensagem amigável no painel e liberando o preenchimento manual dos dados como contingência.

### 1.2 OpenAI Embeddings API (Busca Semântica RAG)
*   **Finalidade**: Geração de vetores numéricos do chat de suporte.
*   **Funcionamento**: A server function `sendAIChatMessage` em `ai-chat.functions.ts` captura o prompt do operador, faz uma chamada de embeddings para o OpenAI (`v1/embeddings`) e realiza a busca vetorial por proximidade no PostgreSQL chamando a RPC `match_memories`.
*   **Tratamento de Erro**: Caso a chave de API da OpenAI não esteja configurada no ambiente do Supabase, o sistema reverte automaticamente para uma busca textual clássica (`ILIKE`) com limite de 10 itens no banco, registrando a ocorrência no console e mantendo o chat ativo.

### 1.3 WhatsApp WABA & Omnichannel
*   **Finalidade**: Disparo de mensagens automáticas de status, cobranças Pix e links de cotações/contratos.
*   **Funcionamento**: A ação `send_whatsapp_template` em `ActionExecutor.ts` e as triggers SQL `reaccommodation_whatsapp_trigger` criam sessões e disparam mensagens de saída via Meta Graph API para o contato cadastrado.
*   **Resiliência & Idempotência**: Se a integração não possuir credenciais ativas, a transação é criada localmente com status de "pendente" de envio, permitindo reenvio manual ou notificação do operador no painel, garantindo que o fluxo operacional da agência nunca pare por instabilidade da API externa.

### 1.4 Resend & Gmail (Edge Functions)
*   **Finalidade**: Abertura de tickets de suporte e envio de vouchers.
*   **Funcionamento**: Edge Functions `gmail-sync` e `gmail-send` integradas ao banco. O processador de e-mails utiliza cabeçalhos `In-Reply-To` e `References` para agrupar as conversas sob a mesma thread do ticket.

---

## 2. Hardening de Segredos e Chaves

*   **Vazamento de Chaves**: Não existem chaves de API, credenciais ou segredos em texto claro hardcoded no frontend do TravelOS.
*   **Gerenciamento de Secrets**: Todas as chaves secretas (`OPENAI_API_KEY`, `RESEND_API_KEY`, tokens da Meta, etc.) são armazenadas nas variáveis de ambiente seguras do Supabase Edge Functions (`supabase secrets set`) e resolvidas em tempo de execução no backend ou criptografadas no banco via CRUD administrativo de chaves mestras.
*   **CORS e Isolamento de Chamadas**: As Edge Functions validam a assinatura do JWT enviado na requisição (`requireSupabaseAuth`), impedindo que agentes maliciosos disparem requisições de processamento ou OCR externos usando robôs fora do contexto da plataforma.
