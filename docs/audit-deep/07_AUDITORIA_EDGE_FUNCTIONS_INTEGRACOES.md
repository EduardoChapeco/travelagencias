# 07. Auditoria de Edge Functions e Integrações Externas

Este documento descreve a integridade das Edge Functions do Deno deployadas no Supabase e a qualidade de suas integrações com APIs externas.

---

## 1. Auditoria Física das Edge Functions

### 1.1 `supplier-ocr-extractor` (Excelente Nível Técnico)

- **Status:** Deployada e ativa na produção.
- **Propósito:** Processar documentos de fornecedores e extrair dados relacionais estruturados.
- **Qualidade do Código:**
  - **Segurança de API Keys:** Robusta. A função não possui chaves hardcoded. Ela busca dinamicamente chaves criptografadas na tabela do banco usando a RPC `pick_active_api_key` de forma isolada por agência. Possui fallback para o repositório seguro do Deno Secrets.
  - **Multimodal Vision:** Conecta-se à API do Gemini Flash 1.5 (`generativelanguage.googleapis.com`) enviando o prompt do sistema estruturado e o documento em base64. Se o Gemini falhar, possui fallback determinístico para o Groq Vision (usando Llama 3.2 11B Vision).
  - **Tratamento de Saída:** Filtra o Markdown retornado, faz o parse de segurança do JSON e grava diretamente no registro de metadados da tabela `supplier_files`.
  - **Validação de Auth:** Executa `supabase.auth.getUser()` no cabeçalho `Authorization` recebido para garantir que chamadores não autenticados sejam barrados imediatamente.

### 1.2 `destination-intelligence`

- **Status:** Deployada e ativa na produção.
- **Propósito:** Geração automática de dicas de viagem, voltagens, moedas e vistos.
- **Consumo:** Acionada pelo botão da interface administrativa (`destination-intelligence.tsx`), gravando as dicas retornadas na tabela `destination_info`.

### 1.3 `gmail-send` e `gmail-sync`

- **Status:** Deployadas na produção.
- **Propósito:** Sincronização de threads e envio de respostas na central de atendimento.
- **Gargalo Técnico:** O código do painel de chat de tickets (`support.$ticket_id.tsx`) **não dispara** requisições HTTP para estas funções no envio de respostas. A integração está comentada no frontend, gerando o status de **UI FAKE / SEM INTEGRAÇÃO REAL**.

---

## 2. Lacunas e Oportunidades de Integração Externa

- **Gargalo no Checkout B2C (Pix Upload):** O portal de pacotes públicos não faz upload do comprovante Pix para o Storage. A Edge Function para conciliação automática do Pix (ou leitura de comprovante via OCR) não existe; o comprovante de pagamento Pix depende exclusivamente de auditoria manual humana do agente.
- **Falta de Webhooks Operacionais de Notificação:** Não há gatilhos configurados na tabela `flight_change_cases` para enviar alertas de alteração de voo via WhatsApp ou E-mail para os passageiros afetados no momento em que a alteração é detectada.
- **Registry de Links de Check-in:** A ausência da tabela `checkin_links` impede o armazenamento e a validação de status de funcionamento dos links de companhias aéreas gerados para o cliente final.
