# Gaps e Riscos de Implementação

Este documento lista as considerações operacionais remanescentes e os riscos de homologação do Chat Agêntico.

---

## 1. Gaps Técnicos e Arquitetura

* **Geração de Embeddings Offline**: A tabela `ai_agency_memories` possui o vetor de 1536 dimensões, mas na ausência de chaves de API Gemini/OpenAI ativas localmente, o sistema opera sob o fallback de carregamento de memórias contextuais gerais.
* **Latência Elevada**: A IA revisora dobra o consumo de tokens e adiciona de 1.5s a 2.5s de latência por resposta, rodando de forma síncrona no backend.

---

## 2. Riscos de Segurança e Operacionais

* **Falta de Testes Automatizados no Banco**: O isolamento RLS e as políticas de multi-tenant de memórias, feedback e mensagens foram validados de forma estática no SQL. Falta testar se queries forjadas com JWTs inválidos quebram a barreira.
* **Dependência de Chaves de API**: A plataforma depende do OpenRouter/Lovable-gateway para LLM e tool calling nativo. Sem chaves de API, o chat opera sob o simulador de fallback local inteligente de palavras-chave.
* **Funil de Vendas (CRM)**: Operações relacionadas ao estágio do CRM dependem da presença de registros corretos na tabela `lead_stages`. Caso a tabela esteja vazia na agência do usuário, as ações retornarão erro.
