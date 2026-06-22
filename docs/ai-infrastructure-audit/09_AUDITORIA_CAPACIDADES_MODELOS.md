# Auditoria de Capacidades de Modelos e Matriz de Compatibilidade

Este documento apresenta a matriz de capacidades reais de cada provedor de IA e modelo integrados ao sistema, servindo como base técnica para as políticas de roteamento e fallback do orquestrador.

---

## Matriz de Capacidades Reais por Provedor / Modelo

| Capability / Modalidade | Gemini (`gemini-2.5-flash`) | Groq (`llama-3.2-11b-vision`) | OpenAI (`gpt-4o-mini`) | OpenRouter (`claude-3-haiku`) | Firecrawl |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Processamento de Texto** | Excelente | Excelente | Excelente | Excelente | N/A |
| **Processamento de Imagens** | Excelente (Vision) | Bom (Vision) | Excelente (Vision) | N/A | N/A |
| **PDF Direto (Inline Data)** | **Nativo (Suporta Deno/D1)**| **NÃO SUPORTADO** | **NÃO SUPORTADO** | **NÃO SUPORTADO** | N/A |
| **JSON Schema Estruturado** | Excelente | Parcial | Excelente | Parcial | N/A |
| **Geração de Imagens** | N/A | N/A | Excelente (`dall-e-3`)| N/A | N/A |
| **Web Scraping / Crawl** | N/A | N/A | N/A | N/A | Excelente |

---

## Diagnóstico Importante para Roteamento de Fallback

1. **Problema do PDF no Groq**:
   * As Edge Functions de OCR (`ocr-proposal`, `ai-voucher-ocr`) possuem um fallback para Groq (`llama-3.2-11b-vision-preview`) caso a chamada do Gemini falhe.
   * **Incompatibilidade**: O Groq **não suporta PDF nativo no payload de imagem**! Ele aceita apenas URLs de imagens (`image/jpeg`, `image/png`, etc).
   * **Resultado**: Se o usuário submete um arquivo PDF, o Gemini o processa nativamente. Se o Gemini falhar e o sistema tentar o fallback no Groq passando o PDF em base64 com mime `application/pdf`, o Groq retornará erro de payload incompatível, fazendo com que o fallback falhe sistematicamente.
2. **Recomendação Técnica**:
   * O orquestrador central deve apenas tentar fallback para Groq/Llama Vision se o arquivo de entrada for uma **imagem** (JPEG/PNG).
   * Para arquivos PDF, se o Gemini falhar, o fallback deve ser direcionado a outro provedor que suporte processamento de texto estruturado após extração de texto local (como converter o PDF para texto bruto e enviar ao `gpt-4o-mini`).
