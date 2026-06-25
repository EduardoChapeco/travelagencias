# Fluxos e Integrações Quebrados

Documentação dos fluxos operacionais de usuário e conexões de API que apresentam falhas de execução, segurança ou incompatibilidades técnicas.

---

## 💥 Integrações e Chamadas Quebradas / Ignoradas

### 1. OCR do Caixa Financeiro (`financial.cash.tsx`)

- _Arquivo_: [agency.$slug.financial.cash.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.cash.tsx)
- _Falha_: A funcionalidade de ler boleto para lançar contas no caixa ainda chama diretamente a Edge Function `/functions/v1/ocr-boleto` na linha 320, em vez de rotear pela rota central do Orquestrador de IA.
- _Impacto_: Se a chave do Groq ou Gemini da agência estiver cadastrada no novo painel central `ai_api_credentials`, o caixa financeiro **não** conseguirá lê-la, pois a função legada `/ocr-boleto` falhará ao tentar decodificar ou achar a chave da agência caso ela não esteja na tabela obsoleta `api_keys`.

### 2. Extrator OCR de Fornecedores (`suppliers.$id.tsx`)

- _Arquivo_: [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx)
- _Falha_: O upload de tarifários/documentos de fornecedores para leitura automática de produtos chama diretamente `/functions/v1/supplier-ocr-extractor` na linha 468, ignorando a infraestrutura unificada do `ai-orchestrator`.
- _Impacto_: Bypassa o monitoramento de cotas do orquestrador, limitações de fallback de provedores e pode falhar caso chaves de API não estejam na tabela antiga.

---

## 🛠️ Falhas Corrigidas nesta Etapa de Auditoria (Hardening)

1. **ReferenceError de `supabase` em `landing-page-agent`**:
   - _Falha_: Ao tentar converter um chat de visitante da landing page em lead de CRM, o chatbot disparava um erro em tempo de execução `"supabase is not defined"` ao chamar o RPC `submit_public_lead`.
   - _Resolução_: Substituído por `supabaseAdmin.rpc`, restabelecendo o fluxo ponta a ponta.
2. **Deno Engine Parser Error em `ai-orchestrator`**:
   - _Falha_: Uma chave de fechamento adicional órfã na linha 881 causava rejeição de compilação no deployer Deno.
   - _Resolução_: Linha limpa.
3. **Erros de Types do Frontend em Integrations e Settings**:
   - _Falha_: Erros de compilação TS relativos a parâmetros implícitos e tabelas inexistentes no client auto-gerado que travavam o build normal.
   - _Resolução_: Adicionados castings e tipagens explícitas.
