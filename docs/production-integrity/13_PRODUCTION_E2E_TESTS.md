# 13. Plano de Testes E2E de Produção (Smoke Tests)

Este plano descreve uma suíte de testes de fumaça (smoke tests) segura para ser executada em produção, atestando a saúde dos módulos sem impactar ou corromper dados de clientes reais.

## 1. Regras de Conduta dos Testes em Produção

- **Isolamento de Dados:** Todos os registros inseridos devem conter a flag `is_test = true` ou tags contendo `[AUDIT_TEST]` no nome/campo de descrição para fácil auditoria.
- **Limpeza Garantida:** Ao final de cada ciclo de teste, uma rotina scriptada deve arquivar/apagar logicamente os dados criados.
- **Sem Efeito Colateral Externo:** Os disparos de e-mail e WhatsApp devem ser feitos exclusivamente para caixas postais e números de testes configurados (`sandbox@travelagencias.com.br`, etc.).

## 2. Relação de Casos de Teste (Cenários)

### 1. Autenticação e Onboarding

- **Ação:** Logar no painel com credenciais de teste, deslogar e logar em outra agência.
- **Validação:** Verificar se o token JWT é gravado/removido do cookie e se as variáveis CSS do Brand Kit mudam para refletir a agência correta no `AgencyProvider`, sem herança do tenant anterior.

### 2. Criação de Lead e Viagem (CRM)

- **Ação:** Inserir um lead teste e criar uma viagem teste (`[AUDIT_TEST] Viagem de Validação`).
- **Validação:** Confirmar se o registro persiste e se o lead avança nas raias do Kanban sem erros de concorrência ou duplicação.

### 3. Upload e Extração OCR Controlada

- **Ação:** Enviar um PDF fictício no VoucherStudio ou anexo de parceiro.
- **Validação:** Verificar se a Edge Function de OCR extrai os campos em formato JSON. Confirmar se a gravação de contatos e produtos no banco de dados não causa duplicação se o botão for clicado repetidamente.

### 4. Geração de Contrato e Assinatura

- **Ação:** Gerar um contrato teste de viagem.
- **Validação:** Verificar se o snapshot das cláusulas (`clause_snapshot`) é gravado de forma estruturada. Testar a imutabilidade enviando um update ao contrato assinado via API e confirmando que o banco rejeita alterações após a assinatura.

### 5. Check-in e Embarques

- **Ação:** Acessar o portal do passageiro `m/checkin/$token` usando o token de um cartão de embarque teste.
- **Validação:** Clicar nos links de check-in para GOL, Azul e LATAM e verificar o redirecionamento. Reportar um alerta de atraso de voo ("Voo Atrasou") e atestar se o evento chega ao painel da agência.

### 6. Alocação no Rooming List (DnD)

- **Ação:** Mover passageiros de teste entre quartos no painel da excursão.
- **Validação:** Confirmar o salvamento em `boarding_rooming_list`. Em seguida, abrir a mesma tela em outra aba e simular um salvamento simultâneo para verificar se o banco impede o Lost Update.

## 3. Roteiro de Execução Automatizável (Playwright Script)

O teste pode ser automatizado através do seguinte roteiro Playwright:

```javascript
import { test, expect } from "@playwright/test";

test("Audit Flow - Zero Trust Production Test", async ({ page }) => {
  // 1. Login
  await page.goto("https://turis.com/login");
  await page.fill('input[type="email"]', "audit-agent@travelagencias.com");
  await page.fill('input[type="password"]', "SenhaAudit123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/agency\/[a-z0-9-]+/);

  // 2. Tenant Isolation Check
  // Tentar acessar diretamente uma agência não autorizada e verificar bloqueio
  const response = await page.request.get("/api/v1/agency/another-agency-uuid");
  expect(response.status()).toBe(403);
});
```

O script completo de testes de fumaça deve ser implantado no repositório em `tests/smoke/` e acionado manualmente ou pós-deploy.
