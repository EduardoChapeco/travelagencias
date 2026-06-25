# Promessas vs. Realidade

Este documento apresenta um confronto objetivo entre as declarações de conclusão (promessas) de implementações anteriores e o estado real verificado no código fonte e banco de dados.

---

## 🔍 Matriz de Confrontação Forense

### 1. Orquestração e Unificação de Chaves de IA

- **Dito Concluído**: O sistema agora usa a tabela `ai_api_credentials` e a RPC `pick_active_api_key` de forma unificada e segura, eliminando mocks e duplicações.
- **Estado Real**: **PARCIAL / DUPLICADO**.
  - Embora a Edge Function `/ai-orchestrator` tenha sido implementada para ler desta tabela, outras Edge Functions de OCR ativas ainda contêm a mesma lógica duplicada de descriptografia e acesso à tabela `global_settings` internamente (ex: `ocr-boleto/index.ts` linhas 85-120 e `supplier-ocr-extractor/index.ts` linhas 30-80).
  - Componentes do frontend ainda chamam estas funções legadas diretamente bypassing o orquestrador (ex: `agency.$slug.financial.cash.tsx` chamando `/functions/v1/ocr-boleto` e `agency.$slug.suppliers.$id.tsx` chamando `/functions/v1/supplier-ocr-extractor`).

### 2. Integridade e Sincronização do Schema do Banco

- **Dito Concluído**: Migrations foram geradas e o banco de dados está sincronizado com contratos TypeScript.
- **Estado Real**: **QUEBRADO / DIVERGENTE**.
  - O arquivo de migração `20260710000000_ai_orchestrator_schema.sql` existe localmente, mas não foi aplicado à base de dados de produção (ou não foi sincronizado com `src/integrations/supabase/types.ts`).
  - O frontend precisou ter seu código adulterado com coerções `(supabase as any)` em `src/services/settings.ts` para poder compilar, pois a tabela `ai_api_credentials` é desconhecida no contrato estático TypeScript.

### 3. Modularidade e Otimização do Heap de Build

- **Dito Concluído**: O build funciona e o bundle inicial diminuiu graças ao code-splitting.
- **Estado Real**: **MOCK ARQUITETURAL / RECORTE SIMPLISTA**.
  - O code-splitting foi feito recortando arquivos gigantes em arquivos `.lazy.tsx` (ex: `agency.$slug.crm.$lead_id.lazy.tsx` com 1636 linhas; `agency.$slug.group-tours.$id.lazy.tsx` com 1917 linhas).
  - Não houve modularização de lógica ou criação de componentes reutilizáveis. O heap de memória continuou estourando, o que exigiu o aumento manual para 8GB no script de deploy (`NODE_OPTIONS=--max-old-space-size=8192`), mascarando o vazamento de memória do bundler.

### 4. Cotações / Proposals (SheetPage vs InPage)

- **Dito Concluído**: O formulário de cotações foi unificado na rota `/proposals/new`.
- **Estado Real**: **INCONSISTENTE / ÓRFÃO**.
  - O componente `NewProposalSheet` (drawer lateral) continua existindo e sendo importado na listagem de propostas e no CRM Kanban, enquanto a tela de detalhes do Lead agora redireciona para a rota `/proposals/new`. O fluxo de cliques e a usabilidade ficaram inconsistentes entre as abas do sistema.
