# Rule 05 — Segurança por Design (Security by Default)

## Status atual do projeto
**✅ AUDITORIA RLS — RESULTADO:** Executada em 2026-07-05 via pg_tables.
**Todas as tabelas do schema public têm `rowsecurity = true`.**
Nenhuma tabela exposta. Portão passou.

## Regras Inegociáveis (verificadas em toda tarefa que toca o banco)

### 1. RLS em 100% das tabelas
- Nenhuma tabela nova sem `ALTER TABLE nome ENABLE ROW LEVEL SECURITY`
- Nenhuma tabela nova sem pelo menos uma policy por operação usada (SELECT/INSERT/UPDATE/DELETE)
- Gate de verificação (rodar antes de todo deploy):
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;
  -- Se retornar qualquer linha: BLOQUEIO DE DEPLOY
  ```

### 2. Nenhuma policy `USING (true)` disfarçada de segurança
- `USING (true)` = sem RLS na prática
- Toda policy deve amarrar em `auth.uid()` ou `agency_id` do tenant
- Multi-tenancy: isolar sempre por `agency_id` — nunca assumir "é só um dono"

### 3. `service_role` nunca no frontend
- Só em Edge Functions e ambiente server-side
- Nunca logar via `console.log`, error handler ou resposta de Edge Function
- Grep de verificação pré-deploy:
  ```bash
  grep -r "service_role" src/ --include="*.ts" --include="*.tsx"
  # Qualquer resultado = BLOQUEIO
  ```

### 4. Secrets nunca hardcoded
- API keys, tokens, passwords: exclusivamente via `import.meta.env.VITE_*` (frontend) ou `Deno.env.get()` (Edge Functions)
- Grep de verificação:
  ```bash
  grep -rE "(sk-|sbp_|password\s*=\s*['\"])" src/ --include="*.ts" --include="*.tsx"
  ```

### 5. IDOR — Todo acesso por ID exige verificação de posse
- Todo endpoint `/trips/:id`, `/quotes/:id` etc. verifica `auth.uid()` = dono
- Nunca confiar no frontend para filtrar dados — RLS é a barreira definitiva

### 6. XSS — `dangerouslySetInnerHTML` proibido sem sanitização
- Se absolutamente necessário: `DOMPurify.sanitize()` (já instalado)
- Todo conteúdo de usuário renderizado como HTML deve ser sanitizado

### 7. Dependências novas — verificar existência antes de instalar
- IA pode sugerir pacotes inexistentes (package hallucination)
- Antes de `npm install <pacote>`: confirmar em npmjs.com

### 8. Middleware não é barreira de segurança (CVE-2025-29927)
- Validação de sessão/autorização SEMPRE dentro de Route Handlers e Edge Functions
- Nunca confiar só em middleware para autorização

### 9. Storage Buckets
- Nunca `public: true` por padrão
- Acesso público a arquivo específico = policy explícita e documentada, não bucket inteiro aberto

### Modelagem de ameaça STRIDE
Para features que manipulam: financeiro, contratos, dados de passageiro/documento
→ Disparar a Skill `stride-threat-model` automaticamente
