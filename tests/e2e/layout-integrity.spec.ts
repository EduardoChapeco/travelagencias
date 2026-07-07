import { test, expect } from "@playwright/test";

test.describe("Auditoria de Integridade Geométrica e Layout (AppShell)", () => {
  test.beforeEach(async ({ page }) => {
    // Tenta acessar a página principal. O middleware deve redirecionar para login.
    // Para testar a geometria básica do layout, precisamos estar logados.
    // Como os testes rodam contra o ambiente local, podemos usar cookies ou mock se necessário.
    // Por enquanto, auditamos a página pública de login e termos para garantir paridade.
    await page.goto("/auth/login");
  });

  test("Root window e html não devem ter barra de rolagem horizontal", async ({ page }) => {
    const overflowX = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).overflowX;
    });
    expect(overflowX).not.toBe("scroll");
  });

  test("Cadeia de altura do AppShell deve ser contida", async ({ page }) => {
    // O formulário de login deve ter sua altura contida e não estourar o viewport
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const bodyHeight = await page.evaluate(() => document.body.clientHeight);
    
    // A altura do body não deve exceder a viewport
    expect(bodyHeight).toBeLessThanOrEqual(viewportHeight + 5);
  });

  test("Não deve existir rolagem dupla na página de autenticação", async ({ page }) => {
    const windowScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight;
    });
    
    // O formulário de login deve caber na tela sem scroll do root window
    expect(windowScrollable).toBeFalsy();
  });

  test("AppShell e workspaces devem renderizar corretamente sem quebra de viewport", async ({ page }) => {
    // Mock Supabase HTTP endpoint
    await page.route("**/rest/v1/agencies**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "00000000-0000-0000-0000-000000000000",
          slug: "excelencia-turismo",
          name: "Excelência Turismo",
          status: "active"
        }])
      });
    });

    await page.route("**/rest/v1/desktop_notes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    await page.route("**/rest/v1/profiles**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "00000000-0000-0000-0000-000000000000",
          full_name: "Administrador de Testes"
        }])
      });
    });

    // Mock localStorage auth session
    await page.addInitScript(() => {
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3ODEyNTM4NDgsImV4cCI6MjA5NjgyOTg0OCwic3ViIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwiZW1haWwiOiJhZG1pbkZha2VAZXhjZWxlbmNpYXRvdXIuY29tLmJyIn0.fake-signature";
      window.localStorage.setItem(
        "sb-esmppoxxnyiscidzsjvy-auth-token",
        JSON.stringify({
          access_token: mockJwt,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "mock-refresh",
          user: {
            id: "00000000-0000-0000-0000-000000000000",
            email: "admin@excelenciatour.com.br",
            role: "authenticated"
          }
        })
      );
    });

    // Acessa o dashboard da agência
    await page.goto("/agency/excelencia-turismo/crm");

    // Verifica se a barra superior e o espaço de trabalho estão renderizados
    const workspace = page.locator(".os-workspace");
    await expect(workspace).toBeVisible();

    // A janela principal (html/body) não deve possuir rolagem vertical nem horizontal
    const windowScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight || 
             document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(windowScrollable).toBeFalsy();
  });
});
