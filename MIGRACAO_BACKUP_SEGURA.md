# 🛡️ TravelOS — Guia de Migração / Backup Seguro (Zero-Loss)

> **Framework adotado:** **PPRR — Preserve → Prepare → Replicate → Reconcile**
> (variação adaptada do framework de *Safe System Migration* da Google SRE Workbook,
> combinado com o checklist *Zero-Data-Loss Migration* da AWS DMS Best Practices).
>
> Cada etapa é **idempotente, reversível e auditável**. Nada é apagado. Nada é
> sobrescrito. Tudo é copiado antes de ser tocado.

---

## 0. Princípios Inegociáveis

1. **Nunca apague o ambiente de origem** até o destino passar 100% no checklist final.
2. **Backup antes de qualquer mudança** (código, banco, storage, secrets).
3. **Trabalhe sempre em uma cópia** (fork de repo, projeto Supabase novo, branch nova).
4. **Verificação dupla**: hash/contagem de linhas antes e depois.
5. **Segredos nunca em commits** — apenas em variáveis de ambiente / Lovable Cloud Secrets.
6. **Service Role Key NUNCA no frontend** nem em arquivos versionados.

---

## 1. Inventário Completo de Credenciais (Supabase / Lovable Cloud)

> ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` e a **senha do banco** **não são acessíveis**
> via Lovable Cloud. Você só consegue obtê-las se tiver o projeto Supabase
> diretamente vinculado à sua conta Supabase. Veja seção 1.3.

### 1.1 Identificadores públicos (já presentes no `.env` do projeto)

| Variável | Valor | Onde usa |
|---|---|---|
| `SUPABASE_PROJECT_ID` | `ezfgelkamreguhapcgfm` | CLI, dashboard URL |
| `SUPABASE_URL` | `https://ezfgelkamreguhapcgfm.supabase.co` | Cliente browser + server |
| `VITE_SUPABASE_PROJECT_ID` | `ezfgelkamreguhapcgfm` | Build Vite |
| `VITE_SUPABASE_URL` | `https://ezfgelkamreguhapcgfm.supabase.co` | Build Vite |
| `SUPABASE_PUBLISHABLE_KEY` (anon) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmdlbGthbXJlZ3VoYXBjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDMxNDEsImV4cCI6MjA5NjAxOTE0MX0.MN4Rtx7mq6uK2G-zkj1_WTzYR901qTVIUh_q0_ARJSY` | Cliente browser (pública por design, RLS protege) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (idêntica acima) | Build Vite |

✅ Essas chaves **podem** ser versionadas (são públicas por design — protegidas por RLS).

### 1.2 Segredos privados configurados no projeto (Lovable Cloud Secrets)

Listados pelo `fetch_secrets` (valores **mascarados** — você precisa exportá-los manualmente):

| Secret Name | Tipo | Como recuperar |
|---|---|---|
| `SUPABASE_URL` | público duplicado | já tem (1.1) |
| `SUPABASE_PUBLISHABLE_KEY` | público duplicado | já tem (1.1) |
| `SUPABASE_SERVICE_ROLE_KEY` | **PRIVADO** | Veja 1.3 |
| `SUPABASE_DB_URL` | **PRIVADO** (string `postgresql://...`) | Veja 1.3 |
| `LOVABLE_API_KEY` | **PRIVADO** (AI Gateway) | Lovable → Workspace Settings → API Keys (ou rotacionar) |

### 1.3 Como recuperar Service Role Key e Database URL

No Lovable Cloud essas duas chaves são **gerenciadas** e não expostas pelas
ferramentas do agente. Para obtê-las você tem **duas rotas**:

**Rota A — Migrar projeto Supabase para sua conta pessoal (recomendado)**
1. No Lovable: `Connectors → Lovable Cloud → Settings → Transfer to my Supabase account`
   (se disponível no seu plano).
2. Aceite o convite no Supabase Dashboard.
3. Agora você acessa `Project Settings → API` e `Project Settings → Database`
   diretamente, copiando:
   - `service_role` key
   - `Database URL` (modo *session* e *transaction*)
   - `Database password`

**Rota B — Suporte Lovable**
Se a transferência não estiver disponível, abra ticket em
[support.lovable.dev](https://support.lovable.dev) pedindo *"export of
Supabase credentials for project `ezfgelkamreguhapcgfm` to set up an
independent backup environment"*.

> 🚫 **Não invente** valores para essas chaves. **Não comite** mesmo após obter.

### 1.4 Outros segredos potenciais (verificar antes de migrar)

Conferir no Lovable: `Project Settings → Secrets` e dentro de cada Edge Function:

- `MASTER_ENCRYPTION_KEY` — usada em `admin-secure-keys` para criptografar integrações.
  **Crítica**: se perdida, os dados criptografados em `global_settings.integrations_config_encrypted` ficam ilegíveis.
- Possíveis chaves de IA por agência salvas em `public.api_keys` (já no banco).
- Tokens OAuth/Google se você configurou login social (Supabase Auth → Providers).

---

## 2. Inventário de Artefatos a Migrar

```
TravelOS
├── Código (GitHub)                  ← repositório Git
├── Migrations SQL (80 arquivos)     ← supabase/migrations/
├── Edge Functions (4)               ← supabase/functions/
│   ├── admin-secure-keys
│   ├── ai-orchestrator
│   ├── ai-voucher-ocr
│   └── web-push
├── Banco de dados                   ← 45 tabelas + 19 funções
├── Storage (13 buckets)             ← arquivos binários
├── Auth                             ← usuários + providers configurados
├── Secrets (Lovable Cloud)          ← 5 secrets
└── Configurações de Auth/SMTP/etc  ← Supabase Dashboard
```

### 2.1 Buckets de Storage (todos privados)

```
proposal-attachments, contract-pdfs, voucher-sources, voucher-pdfs,
financial-receipts, passenger-documents, support-attachments,
agency-logos, agency-covers, proposal-covers, group-tour-gallery,
blog-covers, client-avatars
```

### 2.2 Tabelas (45 — todas com RLS)

> Lista completa visível em `<supabase-tables>` do contexto do projeto;
> exportadas integralmente nas migrations em `supabase/migrations/`.

---

## 3. Framework PPRR — Execução Passo a Passo

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  PRESERVE   │ → │   PREPARE   │ → │  REPLICATE  │ → │  RECONCILE  │
│  (backup)   │   │ (destino)   │   │  (cópia)    │   │ (verificar) │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

---

### FASE 1 — PRESERVE (Backup local imutável)

Objetivo: ter uma **cópia offline** completa antes de tocar em qualquer coisa.

#### 1.1 Backup do código (GitHub)

Já que o repo foi desconectado, primeiro reconecte um repo **novo e vazio**:

1. Lovable → `+ (Plus menu) → GitHub → Connect project → Create new repository`
2. Nome sugerido: `travelos-backup-AAAA-MM-DD`
3. Aguarde o primeiro push automático completar.
4. Local na sua máquina:
   ```bash
   git clone https://github.com/<seu-user>/travelos-backup-AAAA-MM-DD.git
   cd travelos-backup-AAAA-MM-DD
   git bundle create ../travelos-CODE-$(date +%Y%m%d).bundle --all
   ```
   O arquivo `.bundle` é um **backup atômico do Git inteiro** (todos os branches/histórico).

#### 1.2 Backup do schema do banco (já está versionado em migrations)

```bash
# já está em supabase/migrations/ — 80 arquivos
tar -czf travelos-MIGRATIONS-$(date +%Y%m%d).tar.gz supabase/migrations/
sha256sum travelos-MIGRATIONS-*.tar.gz > backup.sha256
```

#### 1.3 Backup dos dados (CSV por tabela)

No Lovable: `Cloud → Database → Tables → [cada tabela] → Export CSV`.

Faça **todas as 45 tabelas**, salve em `./backup/data/`. Não pule nenhuma.
Ordem sugerida (respeita FKs ao restaurar):

```
1. agencies, plans, contract_clauses_template, global_settings
2. profiles, user_roles, agency_private, agency_invites, agency_tags
3. clients, suppliers, corporate_clients, brand_kit, company_profiles
4. lead_stages, leads, lead_activities, lead_forms
5. trips, trip_passengers, boarding_cards, bus_layouts
6. proposals, proposal_items
7. contracts, payment_plans, payment_installments, financial_records
8. group_tours, group_tour_enrollments
9. visa_requirements, visa_requests
10. vouchers, blog_posts, knowledge_articles, portal_pages
11. coupons, gift_cards, support_tickets
12. notifications, push_subscriptions, audit_log
13. ai_chat_messages, ai_rate_limit, api_keys
14. policy_documents
```

#### 1.4 Backup do Storage

Para cada bucket, baixe os arquivos. Como são privados, use script com Service Role
(obtenha conforme 1.3) **em máquina local**:

```bash
# salve como backup-storage.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const sb = createClient(
  'https://ezfgelkamreguhapcgfm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY  // injete via env, NÃO hardcode
);

const buckets = [
  'proposal-attachments','contract-pdfs','voucher-sources','voucher-pdfs',
  'financial-receipts','passenger-documents','support-attachments',
  'agency-logos','agency-covers','proposal-covers','group-tour-gallery',
  'blog-covers','client-avatars'
];

async function walk(bucket, prefix = '') {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) { await walk(bucket, full); continue; }
    const { data: file } = await sb.storage.from(bucket).download(full);
    const out = path.join('backup/storage', bucket, full);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, Buffer.from(await file.arrayBuffer()));
    console.log('✓', bucket, full);
  }
}
for (const b of buckets) await walk(b);
```

```bash
SUPABASE_SERVICE_ROLE_KEY='...' node backup-storage.mjs
```

#### 1.5 Backup dos Secrets

Em arquivo `secrets-backup.txt` **fora do repositório** (ex.: gerenciador de senhas):

```
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgresql://postgres:...@db.ezfgelkamreguhapcgfm.supabase.co:5432/postgres
LOVABLE_API_KEY=...
MASTER_ENCRYPTION_KEY=...
```

#### 1.6 Hash final de integridade

```bash
sha256sum travelos-CODE-*.bundle travelos-MIGRATIONS-*.tar.gz \
  backup/data/*.csv backup/storage/**/* > BACKUP_MANIFEST.sha256
```

**✅ Checkpoint 1:** você tem `BACKUP_MANIFEST.sha256` — só passe para FASE 2 com isso pronto.

---

### FASE 2 — PREPARE (Criar ambiente destino)

#### 2.1 Novo projeto Lovable (ou novo Supabase)

**Opção A — Novo projeto Lovable (mais simples):**
1. Lovable Dashboard → `New Project → Blank`
2. `Connectors → Lovable Cloud → Enable` (cria novo Supabase automaticamente)
3. Anote o novo `SUPABASE_PROJECT_ID` (estará em `.env` do novo projeto)

**Opção B — Novo projeto Supabase puro:**
1. supabase.com → `New project`
2. Anote URL, anon key, service role, db password

#### 2.2 Conectar novo repo

1. No novo projeto Lovable → `+ → GitHub → Create new repository`
   Nome: `travelos-novo` (ou similar)
2. **NÃO** apague o repo de backup.

#### 2.3 Provisionar secrets no destino

No novo projeto: `Settings → Secrets → Add`:
- `LOVABLE_API_KEY` (mesmo valor ou rotacionar)
- `MASTER_ENCRYPTION_KEY` (⚠️ **MESMO valor** — senão `global_settings.integrations_config_encrypted` fica ilegível)
- Quaisquer outros secrets de integração que você usa

---

### FASE 3 — REPLICATE (Copiar tudo)

> Ordem **obrigatória**: código → schema → storage → dados → auth.

#### 3.1 Copiar código

Na sua máquina:
```bash
# clone destino
git clone https://github.com/<seu-user>/travelos-novo.git destino
# clone backup
git clone https://github.com/<seu-user>/travelos-backup-AAAA-MM-DD.git origem

# copia todos os arquivos do app, MENOS pastas geradas/sensíveis
rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='src/integrations/supabase/client.ts' \
  --exclude='src/integrations/supabase/client.server.ts' \
  --exclude='src/integrations/supabase/auth-middleware.ts' \
  --exclude='src/integrations/supabase/auth-attacher.ts' \
  --exclude='src/integrations/supabase/types.ts' \
  --exclude='src/routeTree.gen.ts' \
  --exclude='supabase/config.toml' \
  origem/ destino/

cd destino
git add -A
git commit -m "chore: import TravelOS codebase from backup"
git push
```

⚠️ Os arquivos excluídos são **autogerados pelo Lovable** no destino com as
chaves do **novo** projeto. Sobrescrever quebra a integração.

Aguarde o Lovable do destino sincronizar (deve aparecer todo o código).

#### 3.2 Aplicar migrations no destino

Lovable do destino aplica migrations automaticamente quando você importa
arquivos `supabase/migrations/*.sql`. Como já vieram no rsync, basta:

1. Abrir o novo projeto Lovable.
2. Verifique `Cloud → Database → Tables` — devem aparecer as 45 tabelas.
3. Se algo falhar, peça ao Lovable: *"reaplicar todas as migrations pendentes"*.

#### 3.3 Copiar Edge Functions

Já estão em `supabase/functions/` dentro do rsync. O Lovable as detecta e
faz deploy automático. Verifique em `Cloud → Edge Functions` no destino.

#### 3.4 Restaurar Storage

Criar buckets no destino (mesmos nomes/privacidade — peça ao Lovable ou
faça via SQL migration de storage):

```sql
insert into storage.buckets (id, name, public)
values
 ('proposal-attachments','proposal-attachments',false),
 ('contract-pdfs','contract-pdfs',false),
 -- ... todos os 13
on conflict (id) do nothing;
```

Upload com script (espelho do 1.4):

```js
// restore-storage.mjs — itera backup/storage/<bucket>/** e faz upload
const { data, error } = await sbDestino.storage.from(bucket).upload(path, fileBuf, { upsert: true });
```

`upsert: true` garante **idempotência** (rerodar não duplica).

#### 3.5 Restaurar dados (CSVs)

**Ordem importa** (mesma de 1.3). Use `Lovable → Database → Tables → Import CSV`,
ou via psql/SQL no destino:

```sql
\copy public.agencies from 'backup/data/agencies.csv' with (format csv, header true);
-- repetir para cada tabela na ordem
```

**Importante:**
- Importe `auth.users` separadamente (veja 3.6) — `profiles` depende dele.
- Se `id` de tabela é UUID gerado, **mantenha** o UUID do CSV (não regenere).

#### 3.6 Migrar usuários (Auth)

Usuários do Supabase Auth **não migram por CSV** (senhas hash-protegidas).
Use a API admin:

```js
// para cada usuário do origem:
await sbDestino.auth.admin.createUser({
  id: user.id,           // preserva UUID — crítico para FKs
  email: user.email,
  email_confirm: true,
  user_metadata: user.raw_user_meta_data,
  // não tem como migrar a senha — usuários precisarão "Esqueci a senha"
});
```

Liste origem:
```js
const { data } = await sbOrigem.auth.admin.listUsers({ perPage: 1000 });
```

**Comunique seus usuários:** terão que redefinir senha no primeiro acesso ao
novo ambiente. Logins sociais (Google) re-vinculam automaticamente pelo email.

#### 3.7 Reconfigurar Auth Providers

No Supabase Dashboard do destino → `Authentication → Providers`:
- Habilitar Google (mesmas credenciais OAuth se você quer)
- Configurar Redirect URLs para o novo domínio
- Configurar SMTP se usava email customizado

---

### FASE 4 — RECONCILE (Validar e cortar)

#### 4.1 Checklist de integridade

| Item | Origem | Destino | OK? |
|---|---|---|---|
| Contagem `agencies` | `select count(*)` | `select count(*)` | ☐ |
| Contagem `clients` | | | ☐ |
| Contagem `trips` | | | ☐ |
| Contagem `proposals` | | | ☐ |
| Contagem `contracts` | | | ☐ |
| Contagem `financial_records` | | | ☐ |
| Contagem `auth.users` | | | ☐ |
| 13 buckets criados | ✓ | ☐ | |
| Total de arquivos em storage | | | ☐ |
| 4 edge functions ativas | ✓ | ☐ | |
| 19 funções SQL presentes | ✓ | ☐ | |
| RLS habilitada em todas as tabelas | ✓ | ☐ | |
| Build do app passa | ✓ | ☐ | |
| Login funciona (após reset senha) | | ☐ | |
| Upload de arquivo funciona | | ☐ | |
| Criar lead/trip/proposal funciona | | ☐ | |

Use SQL no Lovable de cada lado:
```sql
select 'agencies' as t, count(*) from agencies union all
select 'clients', count(*) from clients union all
select 'trips', count(*) from trips union all
-- ...
;
```

As contagens **devem bater exatamente**. Se não, identifique a tabela e refaça o import.

#### 4.2 Smoke test funcional

No destino, com um usuário de teste:
1. Login
2. Criar lead → kanban
3. Converter em proposta → PDF
4. Criar viagem → adicionar passageiro
5. Upload de voucher
6. Visualizar página pública `/p/<slug>`

#### 4.3 Período de coexistência

Mantenha origem **ligada e read-only** por pelo menos **30 dias**:
- No origem, opcionalmente revogar grants de INSERT/UPDATE/DELETE para `authenticated`
  (rollback simples se algo der errado).
- Só **apague** quando: 30 dias de uso sem incidente + backup `.bundle` + `.sha256` arquivados.

---

## 4. Matriz de Risco e Mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Perda de Service Role Key | Alta (não exposta no Lovable Cloud) | Rota A da seção 1.3 |
| `MASTER_ENCRYPTION_KEY` diferente no destino | Alta | Reusar mesmo valor; senão restaurar e re-encriptar `global_settings` |
| FK violation no import de dados | Média | Importar na ordem da seção 1.3 |
| Senhas de usuários perdidas | Certa (by design) | Comunicar reset de senha |
| Storage com paths longos/UTF8 | Baixa | Script usa `path.join` e mantém estrutura |
| Edge Function com secret faltando | Média | Checklist 2.3 antes de testar |
| Migration idempotência | Baixa | Migrations já usam `IF NOT EXISTS` em geral |
| Repo origem deletado por engano | Crítico | NÃO APAGAR até FASE 4 concluída + 30 dias |

---

## 5. Comandos de Verificação Rápida (cole no SQL Editor)

**RLS em todas as tabelas públicas:**
```sql
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind='r' and relrowsecurity=false;
-- deve retornar 0 linhas
```

**Funções presentes:**
```sql
select proname from pg_proc where pronamespace='public'::regnamespace order by proname;
-- deve listar as 19 funções
```

**Buckets:**
```sql
select id, public from storage.buckets order by id;
-- deve listar 13, todos public=false
```

---

## 6. Próximos Passos Recomendados

1. ✅ Salvar este documento fora do repo (Google Drive / 1Password / Notion).
2. ✅ Executar FASE 1 **hoje** (backup nunca espera).
3. ⚠️ Solicitar Rota A (1.3) para obter Service Role + DB URL.
4. ⏳ Só depois iniciar FASE 2.
5. 🔒 Nunca commitar `secrets-backup.txt`, `.env` privado, ou Service Role.

---

## 7. Apêndice — Esquema rápido de pastas do backup local

```
backup/
├── BACKUP_MANIFEST.sha256
├── travelos-CODE-20260612.bundle
├── travelos-MIGRATIONS-20260612.tar.gz
├── secrets-backup.txt          ← FORA do git, em cofre
├── data/
│   ├── agencies.csv
│   ├── clients.csv
│   └── ... (45 arquivos)
└── storage/
    ├── proposal-attachments/
    ├── contract-pdfs/
    └── ... (13 pastas)
```

---

**Última revisão:** 12/06/2026
**Autor do guia:** Lovable AI (framework PPRR)
**Projeto origem:** `ezfgelkamreguhapcgfm` (TravelOS)
