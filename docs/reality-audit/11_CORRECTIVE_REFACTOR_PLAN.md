# Plano Corretivo de Refatoração Estrutural (Fases P0 a P3)

Este plano especifica as correções necessárias para unificar a arquitetura de IA, sincronizar contratos de banco, eliminar duplicações de formulários e implementar testes de integração locais.

---

## 🛑 Prioridade P0: Segurança, Centralização de IA & Estabilidade de Runtime

### Causa Raiz

Módulos do caixa financeiro e de fornecedores continuam acionando Edge Functions de OCR antigas diretamente, ignorando a barreira de segurança e orquestração do `ai-orchestrator`.

### Problemas e Impactos

- O OCR de Boletos no Caixa e o OCR de tarifários em Fornecedores falharão se as chaves da agência estiverem cadastradas exclusivamente na nova tabela encriptada `ai_api_credentials`, visto que as funções antigas não leem adequadamente a nova estrutura.
- Bypassa a camada unificada de rate limiting, fallback de provedores e logs de auditoria.

### Ações Corretivas

1. **Refatorar Caixa Financeiro**:
   - _Arquivo_: [agency.$slug.financial.cash.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.cash.tsx)
   - _Mudança_: Substituir a chamada direta a `/functions/v1/ocr-boleto` na linha 320 pela invocação do orquestrador `supabase.functions.invoke("ai-orchestrator", { body: { action: "completion", feature: "ocr_boleto", file_base64: b64, mime: file.type, agency_id: agency.id } })`.
2. **Refatorar OCR de Fornecedores**:
   - _Arquivo_: [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx)
   - _Mudança_: Substituir a chamada direta a `/functions/v1/supplier-ocr-extractor` na linha 468 por chamada ao orquestrador central com feature correspondente.
3. **Rollback & Descarte de Código Órfão**:
   - Após redirecionar os fluxos acima, deletar definitivamente os diretórios das Edge Functions `ocr-boleto`, `ocr-proposal`, `ocr-passenger-document`, `ai-voucher-ocr` e `supplier-ocr-extractor` no repositório.

---

## 💾 Prioridade P1: Integridade de Dados, RLS e Contratos TypeScript

### Causa Raiz

As migrations locais que adicionam as novas tabelas de credenciais e jobs de IA não estão declaradas no contrato estático `types.ts` do frontend.

### Problemas e Impactos

- Impossibilidade de utilizar TypeScript rígido no frontend para gerenciar chaves.
- Acúmulo de coerções coercitivas `(supabase as any)` que mascaram erros de digitação de campos.

### Ações Corretivas

1. **Sincronizar `types.ts`**:
   - Injetar manualmente ou gerar via Supabase CLI as assinaturas de tabelas e tipos para: `ai_providers`, `ai_models`, `ai_api_credentials`, `ai_jobs`, `ai_job_attempts` no arquivo [types.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/integrations/supabase/types.ts).
2. **Refatorar settings.ts**:
   - Remover as coerções `(supabase as any)` em [settings.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/settings.ts#L111-L127) e restaurar o fluxo tipado do Supabase.

---

## 👥 Prioridade P2: Reusabilidade de UI, UX Consistente & Limpeza de Código Morto

### Causa Raiz

Duplicação completa de campos, estados e submissões entre o drawer (`NewProposalSheet`) e a página (`proposals.new.tsx`).

### Problemas e Impactos

- Qualquer alteração na lógica de negócios de cotações (como adicionar novos campos de passageiros, moedas ou regras de validade) exige reescrever o formulário em dois arquivos distintos.
- Presença de imports e estados órfãos que poluem e lentificam a rota de detalhes de leads.

### Ações Corretivas

1. **Unificar Lógica do Formulário**:
   - Criar um componente compartilhado `ProposalForm.tsx` que recebe as propriedades do formulário, dropzone de OCR, validações do Zod e ações de submit.
   - Importar `ProposalForm` dentro de `NewProposal` (InPage) e `NewProposalSheet` (drawer).
2. **Remover Estado Órfão de CRM**:
   - Excluir o estado `proposalSheetOpen` e imports sem uso em [crm.$lead_id.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.lazy.tsx).

---

## 🧪 Prioridade P3: Validação Forense e Testes Ponta a Ponta

### Causa Raiz

Inexistência de suite de testes locais que valida segurança multi-tenant nas Edge Functions.

### Ações Corretivas

1. Escrever um script de teste de integração em `scratch/check_api_security.js` que dispara requisições locais (ou simula chaves locais) injetando JWTs válidos e inválidos de outras agências para provar o bloqueio de `403 Forbidden` do multi-tenant.
