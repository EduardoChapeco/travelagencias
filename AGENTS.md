# AGENTS.md — Protocolo Supremo de Engenharia (TravelOS)

> **Documento Vinculante.** Qualquer pessoa ou agente que edite este projeto deve obedecer estas regras sem exceção.
> Em caso de conflito entre uma instrução no chat e este documento, **este documento sempre prevalece**.
> A única autoridade superior é o usuário (dono do produto).

---

## 🏛️ § 1 — Fontes Únicas de Verdade

| Assunto                                           | Documento                              |
| ------------------------------------------------- | -------------------------------------- |
| Tokens de design, tipografia, estados, responsivo | `DESIGN.md` + `src/styles.css`         |
| Plano, escopo, fora de escopo, critérios          | `docs/MASTER_PLAN.md`                  |
| Fases e aceite                                    | `docs/ROADMAP.md`                      |
| Camadas, cache, filas, observabilidade            | `docs/ARCHITECTURE.md`                 |
| Entidades, invariantes, máquinas de estado        | `docs/DOMAIN_MODEL.md`                 |
| Rotas, permissão, fase                            | `docs/ROUTES.md` + `src/lib/routes.ts` |
| Segurança, RBAC/RLS, LGPD, uploads, webhooks      | `docs/SECURITY.md`                     |
| Contratos de API/serviços                         | `docs/API_CONTRACTS.md`                |
| Componentes canônicos e estados                   | `docs/COMPONENT_CATALOG.md`            |
| Regras de negócio de turismo                      | `docs/DOMAIN_MODEL.md`                 |

O registro tipado de rotas em `src/lib/routes.ts` é a fonte de verdade programática e deve espelhar `docs/ROUTES.md`.

---

## ⚙️ § 2 — Stack Técnica e Estrutura Obrigatória

- **Runtime:** TanStack Start + React 19, TypeScript **strict**, Tailwind v4, shadcn/ui.
- **Data fetching:** TanStack Query centralizado — nunca `useEffect + fetch` para carga inicial.
- **Deploy:** Cloudflare Pages via Wrangler (Nitro adapter).
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime).

### Estrutura de pastas obrigatória:
```
src/
  components/
    ui/         ← primitivos shadcn (não modificar sem análise de blast-radius)
    modules/    ← componentes de painel/módulos (propostas, viagens, clientes...)
    state/      ← estados canônicos (empty, error, loading, permission, unconfigured)
  features/     ← features por domínio de negócio
  routes/       ← rotas file-based (rota = arquivo)
  lib/          ← utilidades compartilhadas, registry, formatação
  services/     ← domain services tipados (BFF/server functions)
  types/        ← tipos de domínio, DTOs, supabase.ts gerado
```

- Nada de `App.tsx` monolítico. Nada de `src/pages/`.
- `src/types/supabase.ts` é **sempre gerado automaticamente** por `supabase gen types typescript --linked`, nunca editado à mão.

---

## 🚀 § 3 — Protocolo de Execução Obrigatório (Todo Task/Feature)

Todo trabalho deve seguir este fluxo na íntegra. **Se uma etapa for pulada, a entrega é considerada inválida.**

```
1. INVENTORY      → Buscar se já existe no codebase (componente, hook, tabela, tipo)
2. BLAST RADIUS   → Mapear o raio de impacto completo (ver § 5)
3. PLAN           → Plano de implementação por microfase (ver § 4)
4. IMPLEMENT      → Código de precisão cirúrgica
5. TYPECHECK      → npm run typecheck sem erros (antes de qualquer deploy ou merge)
6. SECURITY SWEEP → RLS, IDOR, XSS, service_role, secrets (ver § 7)
7. MATCH GLOBAL   → schema ↔ supabase.ts ↔ frontend ↔ migrations (ver § 9)
8. RELEASE GATE   → Evidência real de funcionamento, não declaração
```

---

## 📋 § 4 — Planejamento em Microfases

Antes de escrever uma linha de código, criar plano detalhado que cobre:

- Impacto nas **tabelas** (novas colunas, novos índices, migrações)
- Impacto nos **schemas/tipos** (supabase.ts atualizado)
- Impacto nos **contratos** (Edge Functions, RPCs, API)
- Impacto nas **rotas** (nova rota, mudança de layout)
- Impacto nos **componentes** (quais consomem, quais quebram)
- Impacto no **RLS** (novas policies, tabelas cobertas)
- **Casos de uso mapeados:** admin, operador, cliente final
- **Casos de erro mapeados:** estado vazio, loading, erro de rede, permissão negada

**Proibição do Autoengano:** Nenhum agente pode:
- Declarar "concluído" sem evidência de runtime.
- Chamar CRUD raso de "premium".
- Declarar "build ok" sem ter executado `tsc`.
- Usar linguagem de vitória antes do Release Gate.

---

## 💥 § 5 — Análise de Blast Radius (Efeito Borboleta Zero)

Antes de tocar qualquer elemento existente (botão, campo, hook, rota, tabela, coluna), responder obrigatoriamente:

1. **Onde é renderizado?** Buscar todos os imports/usos — não apenas o arquivo óbvio.
   ```bash
   grep -r "NomeDoComponente" src/ --include="*.tsx" --include="*.ts" -l
   ```
2. **O que dispara?** Handlers, hooks, contexts, stores acionados.
3. **Quais APIs chama?** Rotas/Edge Functions e o que fazem a jusante.
4. **Quais tabelas/colunas/RLS?** Inclusive relações via foreign key.
5. **Quais contratos TypeScript/Zod dependem desse dado?**
6. **Quais outros fluxos compartilham essa lógica?**

### Componentes de Alto Risco (auditoria completa obrigatória antes de editar):

| Componente                            | Risco      | Motivo                                         |
| ------------------------------------- | ---------- | ---------------------------------------------- |
| `src/components/ui/button.tsx`        | 🔴 Crítico | Usado em praticamente 100% das rotas           |
| `src/components/ui/sheet.tsx`         | 🔴 Crítico | 24+ wizards/drawers de criação                 |
| `src/routes/__root.tsx`               | 🔴 Crítico | Pai global — auth, providers, error boundaries |
| `src/routes/agency.$slug.tsx`         | 🔴 Crítico | Layout pai de 80+ rotas de agência             |
| `src/integrations/supabase/client.ts` | 🔴 Crítico | Instância compartilhada do client              |
| `src/styles.css`                      | 🔴 Crítico | Design system global — afeta 100% das telas    |

> "Trocar a cor de um botão de login" tem o mesmo rigor de auditoria que alterar uma coluna do banco — até confirmar que não é reutilizado em fluxo crítico.

---

## 🎨 § 6 — Design System (Tolerância Zero a Hardcode Visual)

### Regra Suprema

**Todo estilo DEVE derivar de `DESIGN.md` + `src/styles.css`.** É terminantemente proibido injetar valores arbitrários diretamente em componentes React.

```tsx
// ✅ CORRETO — usa token semântico
className="bg-surface border border-border rounded-[var(--radius-md)]"

// ❌ PROIBIDO — hardcode visual
className="bg-white/5 border-white/10" // viola o design system em tema claro
style={{ backgroundColor: '#f0f0f0', borderRadius: '20px' }}
```

### Proibições Explícitas

- `bg-white` ou `text-black` hardcoded em componentes
- Qualquer hex `#xxxxxx` em arquivo `.tsx` ou `.ts` (deve estar em `styles.css`)
- `shadow-*` e `box-shadow` decorativos (o TravelOS não usa sombras — só glassmorphism)
- `bg-gradient-*` decorativo (sem função semântica de estado)
- `bg-white/5`, `bg-white/10` — transparências fixas que quebram em temas alternados
- Emoji como ícone de interface

### Variáveis Semânticas do Tailwind v4

O TravelOS usa Tailwind v4. As variáveis de cor **devem** ter o prefixo `--color-*`:
```css
/* ✅ CORRETO — Tailwind v4 namespace */
--color-background: ...;
--color-foreground: ...;
--color-surface: ...;
--color-muted-foreground: ...;

/* ❌ ERRADO — Tailwind v3 namespace quebra o sistema */
--background: ...;
--foreground: ...;
```

### Checklist Visual (toda tela nova passa por isso)

- [ ] Cores 100% via tokens de `DESIGN.md` / `src/styles.css`
- [ ] Tipografia usa classes semânticas (`ds-display`, `ds-h1`, `ds-body-large`, `ds-meta`)
- [ ] Contrastes legíveis em ambos os temas (claro e escuro/workspace)
- [ ] Espaçamentos via tokens (`--spacing-*`), não valores fixos
- [ ] Elementos responsivos — nenhum `width: XYZpx` fixo em layout principal
- [ ] Alvos de toque ≥ 44px (WCAG 2.2 AA)
- [ ] Estados implementados: `loading`, `empty`, `error`, `permission`, `unconfigured`
- [ ] Glassmorphism via `color-mix(in srgb, var(--color-foreground) X%, transparent)`

### Padrões de Layout do TravelOS

- **Sidebar:** pill vertical ultra-fino, 40px collapsed, 190px expanded
- **Formulários de criação:** `Sheet` full-screen — nunca Dialog pequeno
- **Dashboards:** bento grid com glassmorphism
- **Scrollbars:** invisíveis via `.no-scrollbar`

---

## 🔒 § 7 — Segurança por Design (Security by Default)

### Regra 1 — RLS em 100% das tabelas

Nenhuma tabela nova sem:
```sql
ALTER TABLE nome ENABLE ROW LEVEL SECURITY;
```
Gate de verificação (rodar antes de todo deploy):
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Se retornar qualquer linha: BLOQUEIO DE DEPLOY
```

### Regra 2 — Nenhuma policy `USING (true)` disfarçada de segurança

- `USING (true)` = sem RLS na prática
- Toda policy deve amarrar em `auth.uid()` ou `agency_id` do tenant

### Regra 3 — `service_role` nunca no frontend

Grep de verificação pré-deploy:
```bash
grep -r "service_role" src/ --include="*.ts" --include="*.tsx"
# Qualquer resultado = BLOQUEIO
```

### Regra 4 — Secrets nunca hardcoded

Somente `import.meta.env.VITE_*` (frontend) ou `Deno.env.get()` (Edge Functions).
```bash
grep -rE "(sk-|sbp_|password\s*=\s*['\"])" src/ --include="*.ts" --include="*.tsx"
```

### Regra 5 — IDOR: Todo acesso por ID exige verificação de posse

- Todo endpoint `/trips/:id`, `/quotes/:id` verifica `auth.uid()` = dono
- Nunca confiar no frontend para filtrar dados — RLS é a barreira definitiva

### Regra 6 — XSS: `dangerouslySetInnerHTML` proibido sem sanitização

- Obrigatório: `DOMPurify.sanitize()` em todo conteúdo de usuário renderizado como HTML

### Regra 7 — Middleware não é barreira de segurança (CVE-2025-29927)

- Validação de sessão SEMPRE dentro de Route Handlers e Edge Functions

### Regra 8 — Storage Buckets

- Nunca `public: true` por padrão
- Acesso a arquivo = policy explícita documentada, não bucket inteiro aberto

### Regra 9 — Modelagem de Ameaças STRIDE

Para features que manipulam financeiro, contratos ou dados de passageiro/documento:
→ Executar análise STRIDE antes da implementação.

---

## ⚡ § 8 — Performance e Anti-Rerenderização Catastrófica

Um loop de renderização com escrita no banco pode esgotar a cota do Supabase e derrubar a plataforma para todos os tenants.

### Checklist obrigatório em todo componente criado ou modificado:

- [ ] `useEffect` com array de dependências SEMPRE explícito
- [ ] Objetos/Arrays como dependência → `useMemo` ou primitivos
- [ ] `onClick={fn}` (referência) — nunca `onClick={fn()}` (invocação)
- [ ] `setState` nunca no corpo do componente fora de handler/effect
- [ ] Autosave com debounce mínimo de 500ms
- [ ] Subscriptions Realtime com cleanup: `return () => supabase.removeChannel(channel)`
- [ ] `refetchInterval` mínimo de 30s para dados não críticos
- [ ] `React.memo` em componentes pesados renderizados em lista
- [ ] Paginação obrigatória em queries de tabelas sem limite (mensagens, logs, reservas)

> **Teste mental:** "Se este componente re-renderizar 100x em 1 segundo, o que acontece no banco?" Se a resposta for "grava 100x" → bug bloqueante.

---

## 🧬 § 9 — Match Global (Sincronismo de Ponta a Ponta)

Após qualquer mudança, verificar sincronismo entre todas as camadas:

### Camada de Dados
- [ ] `src/types/supabase.ts` regenerado após migration? (`supabase gen types typescript --linked > src/types/supabase.ts`)
- [ ] Campos acessados no frontend existem no schema real? (sem `as any`)
- [ ] UUIDs não se perderam na cadeia pai → filho → serviço → DB?
- [ ] Foreign keys válidas após mudança de schema?

### Camada de API
- [ ] Todo `supabase.from('tabela')` aponta para recurso que existe?
- [ ] Edge Functions ↔ Client: payload de input/output sincronizado?
- [ ] RPCs referenciadas no frontend existem no banco?

### Camada de Segurança
- [ ] Policies existentes cobrem o novo fluxo de dados?
- [ ] Multi-tenancy: policy isola por `agency_id`?

### Camada de UI
- [ ] Contratos de props atualizados em todos os consumidores?
- [ ] Nenhum import não usado, componente órfão ou código morto?

### Emitir ao final de cada tarefa:
```
✅ Match Global — [nome da tarefa]
- Schema ↔ Types: regenerado / não necessário (motivo)
- RLS: verificado — X tabelas afetadas, todas com policy
- Props: Y componentes consumidores atualizados
- Código morto: nenhum encontrado / Z arquivos removidos
```

---

## 📦 § 10 — Regras de Dados e Negócio

1. **Sem acesso direto ao Supabase em componentes React.** Toda mutação passa por `src/services/*`. Supabase é persistência protegida por RLS.
2. **Contexto multi-tenant inviolável.** Toda tabela tem `agency_id`. Toda query filtra por `agency_id`. Usuário de agência A nunca acessa dados de agência B.
3. **Nenhum cálculo financeiro no cliente.** Comissões, totais, margens e lucros são calculados/validados no servidor (trigger ou RPC).
4. **Dinheiro = `numeric(12,2)` no banco.** Nunca float. Formatação via `src/lib/formatters.ts`.
5. **Datas:** ISO UTC no banco. Exibição em `America/Sao_Paulo` via `src/lib/formatters.ts`.
6. **Sem dados fictícios.** Nada de arrays hardcoded, imagens externas aleatórias, botões sem destino. Feature incompleta = oculta da navegação.
7. **Integrações** têm status `unconfigured | testing | active | error`. Sem credencial = "configuração ausente", nunca simular sucesso.
8. **Idempotência obrigatória** em toda operação financeira/pagamento (evitar cobranças duplicadas).
9. **Passaportes e vistos são críticos.** Falhas de data de validade invalidam contratos de viagem. Validação obrigatória no backend.
10. **UUID não substitui autorização.** `agency_id` + `auth.uid()` verificados no servidor sempre.

---

## 🏗️ § 11 — Convenções de Código

- `TypeScript strict`; sem `any` implícito; proibido `@ts-ignore` para esconder schema quebrado.
- Validação de input/output via **Zod** — schemas compartilhados entre frontend e Edge Functions.
- DTOs distintos das entidades do banco.
- Rotas refletem estritamente o estado funcional. Features planejadas não vazam para o registry de rotas.
- Componentes de dado/ação implementam obrigatoriamente: `loading`, `empty`, `error`, `permission`, `disabled`, `unconfigured`.
- Componentes focados: < 200 linhas idealmente. Se ultrapassar, extrair lógica para hook ou service.
- Dead code proibido em produção: nenhum `// TODO: conectar depois` em features, nunca `console.log` sem intenção.
- Acessibilidade WCAG 2.2 AA: alvos ≥ 44px, contraste 4.5:1 mínimo, botões com `whitespace-nowrap`.

---

## 🚢 § 12 — Deploy Completo (Pipeline Obrigatório)

**Quando o usuário solicitar "deploy completo", executar na ordem exata:**

### Fase 1 — Auditoria Pré-Deploy
```bash
powershell -ExecutionPolicy Bypass -Command "npm run typecheck"
# Zero erros TypeScript. Se falhar: corrigir antes de prosseguir.
```
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- Se retornar linhas: BLOQUEIO. Criar migration RLS primeiro.
```
```bash
grep -r "service_role" src/ --include="*.ts" --include="*.tsx"
# Se retornar: BLOQUEIO. Remover antes de prosseguir.
```

### Fase 2 — Deploy Backend (Supabase)
```bash
powershell -ExecutionPolicy Bypass -Command "npx supabase db push"
powershell -ExecutionPolicy Bypass -Command "npx supabase functions deploy"
powershell -ExecutionPolicy Bypass -Command "npx supabase gen types typescript --linked > src/types/supabase.ts"
```
- Project Ref: `esmppoxxnyiscidzsjvy`
- Supabase URL: `https://esmppoxxnyiscidzsjvy.supabase.co`
- Fallback: MCP `supabase-mcp-server` → `apply_migration` + `deploy_edge_function`

### Fase 3 — Build e Deploy Frontend (Cloudflare Pages)
```bash
powershell -ExecutionPolicy Bypass -Command "npm run build"
powershell -ExecutionPolicy Bypass -Command "npx wrangler pages deploy dist --project-name travelagencias --branch main --commit-dirty=true"
```
- URL de produção: `https://travelagencias.pages.dev/`

### Fase 4 — Git
```bash
git add -A
git pull --rebase origin main
git commit -m "feat|fix|refactor|security|perf(módulo): descrição precisa do que mudou e por quê"
git push origin main
```
- Nunca `git push --force` sem análise e aprovação explícita do usuário.
- Mensagens semânticas: `feat`, `fix`, `refactor`, `security`, `perf`, `chore`, `docs`.

### Fase 5 — Smoke Test Pós-Deploy
- Confirmar `https://travelagencias.pages.dev/` respondendo.
- Confirmar Edge Functions ativas.
- Relatório: o que foi deployado, quais migrations rodaram, quais funções foram atualizadas.

### Fail-Safe
Se etapa for irrecuperável, emitir **Laudo Técnico Cirúrgico** com:
1. Qual etapa falhou e código de erro exato
2. Quais arquivos/recursos envolvidos
3. Comando exato (copy/paste ready) para o usuário executar

---

## 🏆 § 13 — Princípios de Engenharia de Elite

1. **Inventário antes de criar.** Antes de criar componente, tabela, hook, serviço ou migration — verificar se já existe. `grep -r "nomeDaFuncionalidade" src/` primeiro.
2. **Auditoria End-to-End.** Nunca corrija localmente um sintoma. Descubra a causa raiz e resolva sistemicamente.
3. **Sem workarounds.** Bug persistente = investigar a raiz do fluxo e refatorar a lógica completa.
4. **Evolução propagada.** Ao melhorar uma abstração, propagar a melhoria para todos os consumidores no projeto.
5. **Verdade no Runtime.** A prova de completude vem de código executado, persistência real, RLS testado — não de tipagem ou documentação.
6. **Código morto = débito.** Dead imports, funções não usadas, `console.log` acidentais são proibidos em produção.

---

## 🔑 § 14 — Credenciais e Configurações do Projeto

- **Supabase Project Ref:** `esmppoxxnyiscidzsjvy`
- **Supabase URL:** `https://esmppoxxnyiscidzsjvy.supabase.co`
- **Cloudflare Pages Project:** `travelagencias`
- **Produção URL:** `https://travelagencias.pages.dev/`
- **Wrangler Deploy:** `powershell -ExecutionPolicy Bypass -Command "npx wrangler pages deploy dist --project-name travelagencias --branch main --commit-dirty=true"`
- **Build Command:** `powershell -ExecutionPolicy Bypass -Command "npm run build"` (usa `NODE_OPTIONS=--max-old-space-size=8192` internamente)

---

*TravelOS Engineering Protocol v3.0 — Baseado nos melhores padrões de Jah Community Platform e HR Shoes Commerce.*
