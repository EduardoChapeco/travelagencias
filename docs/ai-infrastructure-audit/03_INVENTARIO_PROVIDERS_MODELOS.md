# Inventário de Provedores e Modelos de IA

Este documento lista todos os provedores de APIs de IA, OCR, automações e scraping integrados ao TravelAgencias/TravelOS, detalhando as URLs de endpoints de destino, os modelos utilizados em produção e suas respectivas finalidades.

---

## 1. Provedores e Modelos em Produção

| Provedor | Modelo Utilizado | Endpoint Oficial | Uso no Sistema | Finalidade / Modalidade |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini** | `gemini-2.5-flash` | `generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent` | OCR de propostas, vouchers, boletos, passageiros e assistente inteligente | Texto + Visão (OCR nativo estruturado) |
| **OpenAI** | `gpt-4o-mini` | `api.openai.com/v1/chat/completions` | AI Assistente (`ai-orchestrator` Completion) | Texto (Smart Completer) |
| **OpenAI** | `dall-e-3` | `api.openai.com/v1/images/generations` | Geração de Capas de Proposta | Imagem (Text-to-Image) |
| **Groq** | `llama-3.2-11b-vision-preview` | `api.groq.com/openai/v1/chat/completions` | OCR Fallback em todas as rotas de extração | Visão (OCR de documentos) |
| **Groq** | `llama3-70b-8192` | `api.groq.com/openai/v1/chat/completions` | AI Assistente Fallback (`ai-orchestrator` Completion) | Texto (Fast Completer) |
| **OpenRouter** | `anthropic/claude-3-haiku` | `openrouter.ai/api/v1/chat/completions` | AI Assistente Fallback final | Texto (Haiku Completer) |
| **OpenRouter** | `stabilityai/stable-diffusion-xl`| `openrouter.ai/api/v1/images/generations` | Geração de Capas Fallback | Imagem (Text-to-Image) |
| **Firecrawl** | Scraping v0 | `api.firecrawl.dev/v0/scrape` | Monitoramento e extração de sites concorrentes | Scraping de páginas web |
| **Steel.dev** | (Simulado) | - | Browser automation (em testes) | Automação e navegação |

---

## 2. Padrões Técnicos e Endpoints de Acesso

* **Upgrade de Versão do Gemini**: No commit `16aa64b` do working tree local, as chamadas do Gemini foram migradas para o endpoint de API `/v1/` com o modelo `gemini-2.5-flash` (anteriormente usava `/v1beta/` e `gemini-1.5-flash`).
* **Estrutura de Fallback Sequencial**:
  * **Completions**: Tenta `Gemini` -> Tenta `OpenAI` (`gpt-4o-mini`) -> Tenta `Groq` (`llama3-70b-8192`) -> Tenta `OpenRouter` (`claude-3-haiku`).
  * **OCR**: Tenta `Gemini` (`gemini-2.5-flash`) -> Tenta `Groq` (`llama-3.2-11b-vision-preview`).
  * **Scraping**: Tenta `Steel.dev` -> Tenta `Firecrawl`.
  * **Image Generation**: Tenta `OpenAI` (`dall-e-3`) -> Tenta `OpenRouter` (`stable-diffusion-xl`).
