# Custos, Latência e Fallback Local

Este documento analisa as chaves de API necessárias para funcionamento em produção, o custo de rede introduzido pela IA revisora e a lógica de fallback do simulador de ações.

---

## 1. Dependência de Provedores e Custos

O chat de IA consome serviços externos via requisições HTTP:

- **Provedores**: O backend suporta chamadas para **OpenRouter** (`https://openrouter.ai`) ou o gateway padrão da **Lovable** (`https://ai.gateway.lovable.dev`).
- **Modelo**: Configurado para usar o `google/gemini-2.5-flash` por sua velocidade de resposta e suporte a schemas complexos.
- **Custo da IA Revisora**: O double-pass de segurança em [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L369) executa um segundo processamento síncrono. Isso duplica o custo de tokens consumidos por mensagem e eleva a latência da resposta do chat em 1.5s a 2.5s adicionais. Contudo, é uma proteção importante de integridade da resposta de texto.

---

## 2. Simulador de Fallback Inteligente (Offline/Local)

Dado que o ambiente de desenvolvimento local e de testes automatizados frequentemente não possui chaves de API válidas no arquivo `.env` (`OPENROUTER_API_KEY` ou `LOVABLE_API_KEY` ausentes):

- **Gatilho de Fallback**: Caso as variáveis de ambiente não existam, o sistema desvia o processamento para um **gerador determinístico de intenções**.
- **Frases Mapeadas**:
  - `"cadastre Maria Silva lead..."` -> gera tool call `create_lead` com dados mockados de Maria Silva.
  - `"telefone do lead Maria Silva..."` -> gera tool call `update_lead` com o ID correspondente.
  - `"cotação para Cancun..."` -> gera tool call `start_quote`.
  - `"cliente Maria Silva..."` -> gera tool call `create_client`.
- **Benefício**: Viabiliza testes completos da interface do usuário (chat visual, cards, botões de confirmar/cancelar, persistência em localStorage e mutações no banco local) sem depender de crédito ou conexão com provedores de inteligência artificial.

---

## 3. Classificação das Entregas

- **Simulador de Fallback**: **REAL PONTA A PONTA**
- **Tratamento de Exaustão de Créditos (402)**: **REAL PONTA A PONTA**
- **Rate Limiting por Hora**: **REAL PONTA A PONTA** (limite de 50 mensagens configurado no banco e verificado antes de salvar).
