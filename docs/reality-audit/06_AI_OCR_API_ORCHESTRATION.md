# Orquestração de Provedores de IA, OCR e API Keys

Este documento detalha o estado técnico e de segurança do orquestrador central de IA e OCR (`ai-orchestrator`) e a integração de APIs externas.

---

## 🔒 Arquitetura de Criptografia & Armazenamento

A tabela centralizada `ai_api_credentials` e a Edge Function `ai-orchestrator` gerenciam o ciclo de vida das credenciais de forma segura:
1. **Escrita (Save)**: A chave em texto aberto é enviada à Edge Function (ação `save-credential`). A chave é criptografada usando algoritmo **AES-GCM** com o segredo `API_KEY_SECRET`. É gerada uma dica mascarada (`masked_hint`) e um hash seguro (`fingerprint`). A chave criptografada é salva em `secret_reference`.
2. **Leitura (List)**: O painel administrativo chama `list-credentials`, que retorna apenas a dica mascarada (`masked_hint`), o status e o timestamp de atualização. A chave descriptografada **nunca** é exposta ao navegador do cliente em consultas comuns.
3. **Consumo interno**: A função `pick_active_api_key` (executada em modo `SECURITY DEFINER` e restrita exclusivamente ao `service_role`) retorna a chave criptografada para o orquestrador, que faz a descriptografia no servidor (Deno Deploy) e consome as APIs.

---

## 🤖 Fluxo de Fallback & Capacidades de Modelos

O orquestrador implementa fallbacks dinâmicos caso o provedor principal (`gemini-2.5-flash`) apresente falha ou esgote sua cota:
1. **Gemini 2.5 Flash**: Preferencial. Utiliza a API real `/v1/`. Suporta entrada de PDFs inteiros e imagens codificadas em base64.
2. **OpenAI (`gpt-4o-mini`)**: Fallback secundário. Suporta imagens base64, mas não aceita PDF direto.
3. **Groq (`llama-3.2-11b-vision-preview` / `llama3-70b-8192`)**: Fallback terciário. Utiliza modelo vision para imagens e modelo text-only para prompts gerais.
4. **OpenRouter (`anthropic/claude-3-haiku`)**: Fallback final para processamento puramente textual.

---

## 🚨 Vulnerabilidades Auditadas e Corrigidas

Durante a auditoria forense do orquestrador e das funções de IA, foram localizadas e sanadas três anomalias impeditivas:

1. **Syntax Error no ai-orchestrator**:
   - *Causa raiz*: Uma chave de fechamento adicional órfã (`    }`) estava inserida na linha 881 de `supabase/functions/ai-orchestrator/index.ts`.
   - *Impacto*: Deno não conseguia realizar o parse do script, impedindo o deploy ou execução de qualquer ação.
   - *Correção*: Linha órfã deletada. Arquivo validado e compilado com sucesso.
2. **ReferenceError no landing-page-agent**:
   - *Causa raiz*: A função tentava disparar a gravação de leads via `(supabase.rpc as any)` na linha 165, mas a variável `supabase` era nula/indefinida no escopo.
   - *Impacto*: O chatbot público de captação de leads nas landing pages quebrava silenciosamente ao tentar registrar um contato no CRM.
   - *Correção*: Substituído por `supabaseAdmin.rpc`, que está devidamente instanciado com permissão administrativa de banco.
3. **Duplicação de Lógica OCR (Bypass)**:
   - *Problema*: As funções `ocr-boleto` e `supplier-ocr-extractor` continuam ativas e replicam a lógica de resolução e descriptografia de chaves internamente. O frontend ainda chama esses endpoints legados diretamente em alguns fluxos (como no fluxo do caixa financeiro), burlando o orquestrador central.
