# 14. Estratégia de Testes e Evidências Físicas

Este documento descreve a estratégia de testes do **Turis**, catalogando as suítes de testes automatizados e e2e físicas do projeto e fornecendo roteiros de execução e evidências de validação.

---

## 1. Suíte de Testes Automatizados E2E (Playwright)

O projeto possui testes de ponta a ponta reais configurados com **Playwright** que validam regras de segurança multi-tenant e ledger financeiro:

### A. Teste de Isolamento Tenant e RLS
* **Arquivo**: [tests/e2e/tenant-isolation.spec.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/tests/e2e/tenant-isolation.spec.ts)
* **Casos Cobertos**:
  1. *Redirecionamento Autenticação*: Garante que acessos diretos a rotas internas da agência (ex: `/agency/excelencia-turismo/crm`) sem login ativo redirecionem o navegador à tela de autenticação.
  2. *Bloqueio RLS Viagens*: Valida que chamadas diretas anônimas para selecionar dados de viagens (`trips`) retornem zero registros ou erros de privilégio.
  3. *Isolamento de Caixa*: Valida que consultas ao histórico de caixas (`cash_transactions`) retornem lista vazia para acessos não autenticados.

### B. Teste de Integridade do Ledger Financeiro
* **Arquivo**: [tests/e2e/financial-ledger.spec.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/tests/e2e/financial-ledger.spec.ts)
* **Casos Cobertos**:
  * Validação de restrições de escrita em transações financeiras e isolamento de balanços de caixas.

---

## 2. Roteiro de Execução da Validação

Para rodar os testes em seu ambiente de homologação, utilize as tarefas configuradas no `package.json`:

1. **Testes de Integração de Tipagem (TypeScript)**:
   ```bash
   npm run typecheck
   ```
   * *Resultado*: **Compilado com sucesso**.
2. **Executar Testes E2E (Playwright)**:
   ```bash
   npx playwright test
   ```
   * *Resultado*: Executa os testes de isolamento de rotas e tabelas em navegadores virtuais (Chromium, Firefox, WebKit) para certificar que o sandbox da aplicação está seguro.
