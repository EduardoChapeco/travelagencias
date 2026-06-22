# Resumo Executivo Honesto — Auditoria de IA e OCR

Este documento consolida os resultados da auditoria de infraestrutura de Inteligência Artificial, OCR e scraping no TravelAgencias/TravelOS, expondo falhas latentes e definindo o plano de ação técnico.

---

## 1. Mapeamento Quantitativo de Baseline

* **Quantidade de Features que usam IA**: **14 features** mapeadas (envolvendo OCR de propostas, vouchers, passageiros, boletos, sugestão de mensagens, inteligência de destinos e tarefas).
* **Quantidade de Edge Functions**: **24 functions** registradas localmente e deploiadas remotamente.
* **Quantidade de Providers homologados**: **5 providers** principais (Gemini, OpenAI, Groq, OpenRouter, Firecrawl).
* **Chaves Cadastradas**: O sistema possui suporte para armazenar chaves ilimitadas na tabela `api_keys` (específicas por agência) e configurações legadas descriptografáveis na tabela `global_settings`.

---

## 2. Principais Vulnerabilidades e Causas Raiz Descobertas

### A. Vazamento de Tenant (Risco Crítico)
* **Falha**: A função central `ai-orchestrator` e outras como `generate-site-ai` e `google-business-post` **não cruzam** a identidade do usuário logado contra as permissões da agência informada no body do request (`user_roles`).
* **Impacto**: Um agente da agência A pode fazer requisições de IA e consumir a cota (dinheiro) da agência B se souber o `agency_id` dela.

### B. Vazamento de Chaves de API (Risco Alto)
* **Falha**: A tabela `api_keys` envia o segredo encriptado/em texto para o frontend nas consultas de leitura (`settings.ts`).
* **Impacto**: Administradores podem extrair os segredos pelo painel DevTools. O segredo nunca deve sair da fronteira do banco e Edge Functions.

### C. Fallback Incompatível (Groq PDF Exception)
* **Falha**: As rotas de OCR definem o Groq (`llama-3.2-11b-vision-preview`) como fallback direto para PDFs.
* **Causa Raiz**: O Groq não suporta PDF nativo em base64. O fallback quebra sempre que o Gemini falha em ler um PDF.

### D. Edge Function Órfã / 404
* **Falha**: A tela de Inteligência de Destinos tenta acionar a Edge Function `destination-intelligence`, que **não está criada localmente e nem deploiada** no Supabase remoto, resultando em erro 404 persistente.

---

## 3. Arquitetura Proposta: AI Orchestration Layer

Substituiremos a dispersão de acessos por uma camada única de orquestração baseada no padrão **Strangler**:
1. O frontend cria um Job de processamento no banco (`ai_jobs`).
2. O orquestrador central seleciona a chave ideal baseada em prioridade, cota e status de circuit breaker da agência proprietária.
3. Executa a chamada do provedor de forma assíncrona protegida contra picos de latência (Job Attempts).
4. Sanitiza e valida o JSON de retorno usando schemas rígidos.
5. Persiste e atualiza o status do Job, notificando a UI em tempo real.
