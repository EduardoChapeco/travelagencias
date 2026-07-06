# 14. Plano Corretivo Mestre

Este documento detalha o planejamento estratégico de correções recomendadas para o Turis, estruturado por dependência técnica com base nas vulnerabilidades, riscos e dívidas mapeados na auditoria forense de pré-produção.

---

## Fase 1: Suíte de Testes de Integração e RLS Automatizados (Playwright)

### Causa Raiz

O repositório priorizou o desenvolvimento da compilação de tipos, esquemas físicos de banco de dados e refinamento de layout, sem introduzir uma suíte de testes ponta a ponta (E2E) focada na validação sistemática de segurança e isolamento de tenants.

### Evidência

Ausência de arquivos de configuração do Playwright (`playwright.config.ts`) ou scripts de teste sob uma pasta correspondente.

### Impacto

Alterações futuras de esquemas ou código correm o risco de desativar triggers de RLS silenciosamente, expondo dados transacionais, documentos e informações contábeis entre agências concorrentes.

### Detalhes de Implementação

- **Arquivos**:
  - `[NEW] playwright.config.ts` (configuração básica).
  - `[NEW] tests/e2e/tenant-isolation.test.ts` (testes de segurança multi-tenant).
  - `[NEW] tests/e2e/financial-ledger.test.ts` (validação de imutabilidade).
- **Rotas**: `/agency/$slug`, `/ledger`, `/admin`.
- **Componentes**: `AppSidebar`, `PaymentReceiptModal`, `AIChat`.
- **Services**: `ai-chat.functions.ts`, `reaccommodation.ts`.
- **Schemas Zod**: Tipagens associadas à sessão ativa do operador.
- **Tabelas**: `financial_ledger_entries`, `monthly_closing_periods`, `boarding_rooming_list`.
- **Migrations SQL**: Nenhuma. As políticas existentes de RLS e triggers serão apenas validadas pelos testes de forma ativa.
- **RLS**: Testes simularão requisições utilizando tokens JWT de contas associadas a diferentes agências para comprovar a negação física de leitura/escrita.
- **APIs**: Testagem de acessos via endpoints do PostgREST.

### Compatibilidade e Migração de Dados

- **Compatibilidade**: Totalmente compatível. Não interfere no funcionamento da aplicação em produção.
- **Migração de dados**: Não se aplica.

### Rollback e Testes

- **Rollback**: Remoção do diretório de testes e da dependência de desenvolvimento no `package.json`.
- **Critério de Pronto**: Suíte de testes configurada e rodando no pipeline de integração contínua (CI/CD) com 100% de aprovação física em testes de evasão de privilégios e imutabilidade de dados contábeis.

---

## Fase 2: Resiliência e Monitoramento de Integrações e APIs Externas

### Causa Raiz

As funcionalidades core do chat, RAG e OCR de passaportes e faturas de fornecedores dependem diretamente da estabilidade operacional e de saldos ativos em chaves de APIs do OpenAI, Gemini e Meta.

### Evidência

Componentes de interface de chat e OCR não exibem sinalizadores visuais em tempo real quando as chaves de API estão com problemas de cota ou instabilidade de rede, o que pode induzir o operador ao erro.

### Impacto

Quedas ou expiração de tokens externos causam falhas silenciosas na interface ou erros 500 não capturados no runtime, afetando negativamente a experiência de autoatendimento e controle de leads.

### Detalhes de Implementação

- **Arquivos**:
  - `[MODIFY] src/components/AIChat.tsx` (inclusão de monitor de status).
  - `[MODIFY] src/components/vouchers/VoucherStudio.tsx` (fallbacks explícitos).
- **Rotas**: `/agency/$slug/crm`, `/client/trips/$id`.
- **Componentes**: `AIChatPanel`, `OCRUploadButton`.
- **Services**: `ai-chat.functions.ts`, `ActionExecutor.ts`.
- **Schemas Zod**: N/A.
- **Tabelas**: N/A.
- **Migrations SQL**: N/A.
- **RLS**: N/A.
- **APIs**: Monitoramento da latência dos endpoints de IA.

### Compatibilidade e Migração de Dados

- **Compatibilidade**: 100% retrocompatível. Introduz apenas fallbacks estruturados e alertas de UI.
- **Migração de dados**: Não aplicável.

### Rollback e Testes

- **Rollback**: Reverter modificações de interface e remover componentes de monitoramento de status da UI.
- **Critério de Pronto**: Exibição correta de banners informativos na UI ("Serviço de IA Indisponível - Modo Manual Ativo") ao simular timeouts ou falhas de conexão de rede com as APIs externas.

---

## Fase 3: Higienização e Remoção de Colunas Legadas de Banco de Dados

### Causa Raiz

Manutenção temporária de colunas JSONB desestruturadas e campos textuais antigos após a normalização das tabelas para evitar quebras em scripts legados não mapeados.

### Evidência

Presença da coluna JSONB `rooming_list` na tabela `group_tours` e de campos vazios originais em `suppliers`.

### Impacto

Desperdício de armazenamento em disco, aumento da complexidade dos esquemas lógicos e risco de inconsistência se lógicas legadas escreverem em colunas obsoletas.

### Detalhes de Implementação

- **Arquivos**:
  - `[MODIFY] src/integrations/supabase/types.ts` (remoção de propriedades excluídas).
- **Rotas**: N/A.
- **Componentes**: N/A.
- **Services**: N/A.
- **Schemas Zod**: Atualização para remoção dos campos legados.
- **Tabelas**: `group_tours`, `suppliers`.
- **Migrations SQL**:
  - `[NEW] supabase/migrations/20260723000000_drop_legacy_columns.sql` (execução do drop físico das colunas).
- **RLS**: N/A.
- **APIs**: PostgREST.

### Compatibilidade e Migração de Dados

- **Compatibilidade**: Pode quebrar integrações locais ou relatórios obsoletos que ainda façam referência à coluna `rooming_list` de `group_tours`. Exige varredura prévia de código.
- **Migração de dados**: Concluída na Fase 10 (dados transferidos para a tabela `boarding_rooming_list`).

### Rollback e Testes

- **Rollback**: Executar migration reversa adicionando novamente as colunas e restaurando o dump físico antes do drop.
- **Critério de Pronto**: Remoção bem-sucedida das colunas no banco de dados local e remoto, com o processo de build do Vite e o typecheck do compilador TypeScript completados com zero erros e warnings.
