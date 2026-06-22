# Fluxos e Integrações Quebrados

Documentação dos fluxos operacionais de usuário e conexões de API que apresentam falhas de execução, segurança ou incompatibilidades técnicas.

---

## 💥 Integrações e Chamadas Quebradas / Ignoradas

### 1. OCR do Caixa Financeiro (`financial.cash.tsx`)
- *Arquivo*: [agency.$slug.financial.cash.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.cash.tsx)
- *Falha*: A funcionalidade de ler boleto para lançar contas no caixa ainda chama diretamente a Edge Function `/functions/v1/ocr-boleto` na linha 320, em vez de rotear pela rota central do Orquestrador de IA. 
- *Impacto*: Se a chave do Groq ou Gemini da agência estiver cadastrada no novo painel central `ai_api_credentials`, o caixa financeiro **não** conseguirá lê-la, pois a função legada `/ocr-boleto` falhará ao tentar decodificar ou achar a chave da agência caso ela não esteja na tabela obsoleta `api_keys`.

### 2. Extrator OCR de Fornecedores (`suppliers.$id.tsx`)
- *Arquivo*: [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx)
- *Falha*: O upload de tarifários/documentos de fornecedores para leitura automática de produtos chama diretamente `/functions/v1/supplier-ocr-extractor` na linha 468, ignorando a infraestrutura unificada do `ai-orchestrator`.
- *Impacto*: Bypassa o monitoramento de cotas do orquestrador, limitações de fallback de provedores e pode falhar caso chaves de API não estejam na tabela antiga.

---

## 🛠️ Falhas Corrigidas nesta Etapa de Auditoria (Hardening)

1. **ReferenceError de `supabase` em `landing-page-agent`**:
   - *Falha*: Ao tentar converter um chat de visitante da landing page em lead de CRM, o chatbot disparava um erro em tempo de execução `"supabase is not defined"` ao chamar o RPC `submit_public_lead`.
   - *Resolução*: Substituído por `supabaseAdmin.rpc`, restabelecendo o fluxo ponta a ponta.
2. **Deno Engine Parser Error em `ai-orchestrator`**:
   - *Falha*: Uma chave de fechamento adicional órfã na linha 881 causava rejeição de compilação no deployer Deno.
   - *Resolução*: Linha limpa.
3. **Erros de Types do Frontend em Integrations e Settings**:
   - *Falha*: Erros de compilação TS relativos a parâmetros implícitos e tabelas inexistentes no client auto-gerado que travavam o build normal.
   - *Resolução*: Adicionados castings e tipagens explícitas.
