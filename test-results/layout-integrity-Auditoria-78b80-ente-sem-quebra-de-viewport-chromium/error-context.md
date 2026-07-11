# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layout-integrity.spec.ts >> Auditoria de Integridade Geométrica e Layout (AppShell) >> AppShell e workspaces devem renderizar corretamente sem quebra de viewport
- Location: tests\e2e\layout-integrity.spec.ts:186:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.os-workspace')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.os-workspace')

```

```yaml
- region "Notifications alt+T"
```

# Test source

```ts
  141 |         status: 200,
  142 |         contentType: "application/json",
  143 |         body: JSON.stringify({ ok: true }),
  144 |       });
  145 |     }
  146 | 
  147 |     // Fallback — qualquer outra REST request
  148 |     if (url.includes("/rest/v1/")) {
  149 |       return route.fulfill({
  150 |         status: 200,
  151 |         contentType: "application/json",
  152 |         body: JSON.stringify([]),
  153 |       });
  154 |     }
  155 | 
  156 |     return route.continue();
  157 |   });
  158 | }
  159 | 
  160 | test.describe("Auditoria de Integridade Geométrica e Layout (AppShell)", () => {
  161 |   test.beforeEach(async ({ page }) => {
  162 |     // Audita a página pública de login (não requer autenticação)
  163 |     await page.goto("/auth/login");
  164 |   });
  165 | 
  166 |   test("Root window e html não devem ter barra de rolagem horizontal", async ({ page }) => {
  167 |     const overflowX = await page.evaluate(() => {
  168 |       return window.getComputedStyle(document.documentElement).overflowX;
  169 |     });
  170 |     expect(overflowX).not.toBe("scroll");
  171 |   });
  172 | 
  173 |   test("Cadeia de altura do AppShell deve ser contida", async ({ page }) => {
  174 |     const viewportHeight = await page.evaluate(() => window.innerHeight);
  175 |     const bodyHeight = await page.evaluate(() => document.body.clientHeight);
  176 |     expect(bodyHeight).toBeLessThanOrEqual(viewportHeight + 5);
  177 |   });
  178 | 
  179 |   test("Não deve existir rolagem dupla na página de autenticação", async ({ page }) => {
  180 |     const windowScrollable = await page.evaluate(() => {
  181 |       return document.documentElement.scrollHeight > window.innerHeight;
  182 |     });
  183 |     expect(windowScrollable).toBeFalsy();
  184 |   });
  185 | 
  186 |   test("AppShell e workspaces devem renderizar corretamente sem quebra de viewport", async ({
  187 |     page,
  188 |   }) => {
  189 |     // ── 1. Instalar mock do Supabase antes de qualquer navegação ────────
  190 |     // O mock usa RegExp para capturar 100% do tráfego para o domínio Supabase.
  191 |     await mockSupabase(page);
  192 | 
  193 |     // ── 2. Setar sessão no localStorage via navigate para auth/login ────
  194 |     // A estratégia:
  195 |     // a) Navegar para /auth/login (servidor não precisa de auth)
  196 |     // b) Setar localStorage com a sessão mockada via evaluate
  197 |     // c) Usar o router SPA (history.pushState) para navegar para a rota da agência
  198 |     //    sem fazer um novo request HTTP ao servidor (que não teria a sessão)
  199 |     await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  200 | 
  201 |     // ── 3. Setar sessão no localStorage após a página carregar ──────────
  202 |     // Usando page.evaluate (roda no browser após carregamento) garante
  203 |     // que o supabase-js client já foi inicializado e pode ler a sessão.
  204 |     await page.evaluate(
  205 |       (args: { ref: string; jwt: string }) => {
  206 |         const expiresAt = Math.floor(Date.now() / 1000) + 315360000;
  207 |         const session = {
  208 |           access_token: args.jwt,
  209 |           token_type: "bearer",
  210 |           expires_in: 315360000,
  211 |           expires_at: expiresAt,
  212 |           refresh_token: "mock-refresh-never-expires",
  213 |           user: {
  214 |             id: "00000000-0000-0000-0000-000000000000",
  215 |             aud: "authenticated",
  216 |             role: "authenticated",
  217 |             email: "admin@excelenciatour.com.br",
  218 |             email_confirmed_at: "2024-01-01T00:00:00.000Z",
  219 |             app_metadata: { provider: "email", providers: ["email"] },
  220 |             user_metadata: { full_name: "Administrador de Testes" },
  221 |             created_at: "2024-01-01T00:00:00.000Z",
  222 |             updated_at: "2024-01-01T00:00:00.000Z",
  223 |           },
  224 |         };
  225 |         window.localStorage.setItem(`sb-${args.ref}-auth-token`, JSON.stringify(session));
  226 |       },
  227 |       { ref: SUPABASE_REF, jwt: MOCK_JWT }
  228 |     );
  229 | 
  230 |     // ── 4. Navegar via SPA routing (client-side, sem SSR) ────────────────
  231 |     // history.pushState não dispara um novo request HTTP ao servidor.
  232 |     // O TanStack Router detecta a mudança de URL e executa os loaders no cliente.
  233 |     // Isso contorna o problema de SSR onde localStorage não está disponível.
  234 |     await page.evaluate(() => {
  235 |       window.history.pushState({}, "", "/agency/excelencia-turismo/crm");
  236 |       window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  237 |     });
  238 | 
  239 |     // ── 5. Verificar que o workspace do AppShell renderizou ──────────────
  240 |     const workspace = page.locator(".os-workspace");
> 241 |     await expect(workspace).toBeVisible({ timeout: 20000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  242 | 
  243 |     // ── 6. Verificar geometria: sem rolagem no root ───────────────────────
  244 |     const windowScrollable = await page.evaluate(() => {
  245 |       return (
  246 |         document.documentElement.scrollHeight > window.innerHeight ||
  247 |         document.documentElement.scrollWidth > window.innerWidth
  248 |       );
  249 |     });
  250 |     expect(windowScrollable).toBeFalsy();
  251 |   });
  252 | });
  253 | 
```