# Inventário de Funcionalidades com IA, OCR e Scraping

Este documento cataloga todas as funcionalidades do sistema que dependem de Inteligência Artificial, OCR, Scraping ou processamento inteligente, mapeando os handlers frontend, as Edge Functions acionadas, providers, e classificando o estado real de cada uma.

---

## Tabela Geral de Funcionalidades IA / OCR / Scraping

| Feature / Funcionalidade              | Tela / Rota Frontend                 | Handler / Serviço                                      | Edge Function Acionada     | Provider e Modelo Utilizado                                | Status Real da Integração                                                                   |
| :------------------------------------ | :----------------------------------- | :----------------------------------------------------- | :------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **OCR de Propostas**                  | Criar Cotação / Propostas            | `src/services/proposals.ts`                            | `ocr-proposal`             | Gemini (`gemini-2.5-flash`), Groq (`llama-3.2-11b-vision`) | **REAL PONTA A PONTA** (Sem persistência automática; depende de salvamento manual na UI)    |
| **OCR de Vouchers**                   | Detalhe da Viagem (Vouchers)         | `src/lib/ocr-ai.ts`                                    | `ai-voucher-ocr`           | Gemini (`gemini-2.5-flash`), Groq (`llama-3.2-11b-vision`) | **REAL PONTA A PONTA** (Resultados passados de volta para o formulário no frontend)         |
| **OCR de Documentos/Passageiros**     | Passageiros da Viagem                | `src/routes/agency.$slug.trips.$id.passengers.tsx`     | `ocr-passenger-document`   | Gemini (`gemini-2.5-flash`), Groq                          | **PARCIAL** (Falta robustez no parsing de RG/Passaporte sob imagens rotacionadas)           |
| **OCR de Boletos / Pix**              | Financeiro da Viagem                 | `src/routes/agency.$slug.trips.$id.financial.tsx`      | `ocr-boleto`               | Gemini, Groq                                               | **REAL PONTA A PONTA** (Lê a linha digitável e dados Pix da fatura)                         |
| **OCR de Fornecedores**               | Tarifários e Faturas de Fornecedores | (Chamada direta via UI / Serviço)                      | `supplier-ocr-extractor`   | Gemini, Groq                                               | **SÓ EDGE FUNCTION** (Interface frontend incompleta / órfã na navegação principal)          |
| **Geração Inteligente de Cotações**   | Editor de Cotações / Proposals       | `src/components/proposals/MagicAIAssistant.tsx`        | `ai-orchestrator`          | Gemini (`gemini-2.5-flash`)                                | **REAL PONTA A PONTA** (Gera opções de hotéis e voos estruturados via prompt)               |
| **Geração de Capas de Proposta**      | Editor de Cotações (Capa)            | `src/components/studio/sections/SectionCover.tsx`      | `ai-orchestrator`          | OpenAI (`dall-e-3`), OpenRouter (`stability-xl`)           | **QUEBRADA** (Imagens falham na resposta devido a credenciais ausentes ou limites de custo) |
| **Pesquisa de Imagens Unsplash**      | Upload de Mídia / Capas              | `src/lib/unsplash.ts`                                  | `search-unsplash`          | Unsplash API (Não-IA)                                      | **REAL PONTA A PONTA**                                                                      |
| **Destination Intelligence**          | Inteligência de Destinos             | `src/routes/agency.$slug.destination-intelligence.tsx` | `destination-intelligence` | Gemini / OpenAI                                            | **QUEBRADA** (Função `destination-intelligence` não listada/deploiada remotamente!)         |
| **Supplier Intelligence / Scraping**  | Monitoramento de Concorrentes        | `src/routes/agency.$slug.competitors.tsx`              | `ai-orchestrator` (scrape) | Firecrawl / Steel.dev                                      | **MOCK / QUEBRADA** (Respostas mockadas na Edge Function se chaves falharem)                |
| **Sugestão de Respostas Omnichannel** | Inbox Omnichannel / CRM              | `src/components/crm/lead-details/AIHunterPanel.tsx`    | `ai-message-processor`     | Gemini (`gemini-2.5-flash`)                                | **PARCIAL** (Funciona local, mas rate limits causam falhas frequentes de timeout)           |
| **AI Landing Page Builder**           | Configurações do Portal              | `src/components/ui/AILandingPageSheet.tsx`             | `generate-site-ai`         | Gemini / OpenAI                                            | **REAL PONTA A PONTA** (Cria código e estrutura para site público do cliente)               |
| **Geração Inteligente de Tarefas**    | Tarefas Diárias                      | `src/routes/agency.$slug.daily-tasks.tsx`              | `ai-task-evaluator`        | Gemini                                                     | **REAL PONTA A PONTA**                                                                      |
| **Análise de Perfil de Clientes**     | CRM Clientes                         | `src/components/clients/AIAnalysisPanel.tsx`           | `ai-orchestrator`          | Gemini                                                     | **REAL PONTA A PONTA** (Analisa histórico de compras e gera perfil de interesse)            |

---

## Diagnóstico Técnico do Inventário

1. **Edge Function Ausente**: A tela `Destination Intelligence` tenta acionar a função `destination-intelligence` que **não existe remotamente**. Isso faz com que toda a funcionalidade retorne erro `404` para o cliente.
2. **Duplicação Crítica de Lógica**: A maioria das Edge Functions de OCR (`ocr-proposal`, `ocr-passenger-document`, `ocr-boleto`, `ai-voucher-ocr`) duplicam a lógica de carregamento e descriptografia de credenciais e a chamada direta a Gemini/Groq via `fetch`.
3. **Persistência Volátil (Falta de Jobs)**: Nenhuma das operações de OCR utiliza uma tabela de fila de processamento assíncrono (`ai_jobs`). Os documentos são convertidos em base64 no navegador e enviados via requisição HTTP longa, sujeitos a timeout do gateway.
