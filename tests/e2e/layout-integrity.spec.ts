import { test, expect, type Page } from "@playwright/test";

// ─── Constantes de teste ──────────────────────────────────────────────────
const SUPABASE_REF = "esmppoxxnyiscidzsjvy";
const MOCK_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3ODEyNTM4NDgsImV4cCI6MjA5NjgyOTg0OCwic3ViIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwiZW1haWwiOiJhZG1pbkZha2VAZXhjZWxlbmNpYXRvdXIuY29tLmJyIn0." +
  "fake-signature-nao-validada-no-client";

// ─── Helper: interceptar todas as requests do Supabase ───────────────────
async function mockSupabase(page: Page) {
  await page.route(new RegExp(`${SUPABASE_REF}\\.supabase\\.co`), async (route) => {
    const url = route.request().url();

    if (url.includes("/auth/v1/user")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000000",
          aud: "authenticated",
          role: "authenticated",
          email: "admin@excelenciatour.com.br",
          email_confirmed_at: "2024-01-01T00:00:00.000Z",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: { full_name: "Administrador de Testes" },
          created_at: "2024-01-01T00:00:00.000Z",
        }),
      });
    }

    if (url.includes("/auth/v1/token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: MOCK_JWT,
          token_type: "bearer",
          expires_in: 315360000,
          expires_at: Math.floor(Date.now() / 1000) + 315360000,
          refresh_token: "mock-refresh",
          user: { id: "00000000-0000-0000-0000-000000000000", aud: "authenticated" },
        }),
      });
    }

    if (url.includes("/rest/v1/agencies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "aaaaaaaa-0000-0000-0000-000000000000",
          slug: "excelencia-turismo",
          name: "Excelência Turismo",
          status: "active",
          brand_color: null,
          brand_color_light: null,
          brand_color_fg: null,
          logo_url: null,
        }),
      });
    }

    if (url.includes("/rest/v1/platform_branding")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "1", platform_name: "Turis", logo_url: null }),
      });
    }

    if (url.includes("/rest/v1/agency_subscriptions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "active" }),
      });
    }

    if (url.includes("/rest/v1/notifications")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/rest/v1/legal_terms")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/rest/v1/legal_acceptance_records")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/rest/v1/profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000000",
          full_name: "Administrador de Testes",
          avatar_url: null,
          role: "admin",
        }),
      });
    }

    if (url.includes("/rest/v1/desktop_theme_settings")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(null),
      });
    }

    if (url.includes("/rest/v1/desktop_notes")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    // Realtime — abortar para evitar conexões pendentes
    if (url.includes("/realtime/")) {
      return route.abort();
    }

    // Edge Functions
    if (url.includes("/functions/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }

    // Fallback — qualquer outra REST request
    if (url.includes("/rest/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    return route.continue();
  });
}

test.describe("Auditoria de Integridade Geométrica e Layout (AppShell)", () => {
  test.beforeEach(async ({ page }) => {
    // Audita a página pública de login (não requer autenticação)
    await page.goto("/auth/login");
  });

  test("Root window e html não devem ter barra de rolagem horizontal", async ({ page }) => {
    const overflowX = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).overflowX;
    });
    expect(overflowX).not.toBe("scroll");
  });

  test("Cadeia de altura do AppShell deve ser contida", async ({ page }) => {
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const bodyHeight = await page.evaluate(() => document.body.clientHeight);
    expect(bodyHeight).toBeLessThanOrEqual(viewportHeight + 5);
  });

  test("Não deve existir rolagem dupla na página de autenticação", async ({ page }) => {
    const windowScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight;
    });
    expect(windowScrollable).toBeFalsy();
  });

  test("AppShell e workspaces devem renderizar corretamente sem quebra de viewport", async ({
    page,
  }) => {
    test.setTimeout(90000);
    // ── 1. Instalar mock do Supabase antes de qualquer navegação ────────
    // O mock usa RegExp para capturar 100% do tráfego para o domínio Supabase.
    await mockSupabase(page);

    // ── 2. Setar sessão no localStorage via navigate para auth/login ────
    // A estratégia:
    // a) Navegar para /auth/login (servidor não precisa de auth)
    // b) Setar localStorage com a sessão mockada via evaluate
    // c) Usar o router SPA (history.pushState) para navegar para a rota da agência
    //    sem fazer um novo request HTTP ao servidor (que não teria a sessão)
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    // ── 3. Setar sessão no localStorage após a página carregar ──────────
    // Usando page.evaluate (roda no browser após carregamento) garante
    // que o supabase-js client já foi inicializado e pode ler a sessão.
    await page.evaluate(
      (args: { ref: string; jwt: string }) => {
        const expiresAt = Math.floor(Date.now() / 1000) + 315360000;
        const session = {
          access_token: args.jwt,
          token_type: "bearer",
          expires_in: 315360000,
          expires_at: expiresAt,
          refresh_token: "mock-refresh-never-expires",
          user: {
            id: "00000000-0000-0000-0000-000000000000",
            aud: "authenticated",
            role: "authenticated",
            email: "admin@excelenciatour.com.br",
            email_confirmed_at: "2024-01-01T00:00:00.000Z",
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { full_name: "Administrador de Testes" },
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-01T00:00:00.000Z",
          },
        };
        window.localStorage.setItem(`sb-${args.ref}-auth-token`, JSON.stringify(session));
      },
      { ref: SUPABASE_REF, jwt: MOCK_JWT }
    );

    // ── 4. Navegar via SPA routing (client-side, sem SSR) ────────────────
    // history.pushState não dispara um novo request HTTP ao servidor.
    // O TanStack Router detecta a mudança de URL e executa os loaders no cliente.
    // Isso contorna o problema de SSR onde localStorage não está disponível.
    await page.evaluate(() => {
      window.history.pushState({}, "", "/agency/excelencia-turismo/crm");
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    });

    // ── 5. Verificar que o workspace do AppShell renderizou ──────────────
    const workspace = page.locator(".os-workspace");
    await expect(workspace).toBeVisible({ timeout: 60000 });

    // ── 6. Verificar geometria: sem rolagem no root ───────────────────────
    const windowScrollable = await page.evaluate(() => {
      return (
        document.documentElement.scrollHeight > window.innerHeight ||
        document.documentElement.scrollWidth > window.innerWidth
      );
    });
    expect(windowScrollable).toBeFalsy();
  });
});
