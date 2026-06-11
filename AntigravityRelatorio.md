# AntigravityRelatório.md

> Relatório técnico, histórico e holístico sobre o estado real do TravelOS após sucessivas refatorações conduzidas por IA (Lovable / Antigravity).
> Documento de **controle de danos e governança técnica**. Não é celebração, não é marketing, não é veredito final de qualidade.
> Fonte da verdade: código atual, migrations atuais, schemas atuais, rotas atuais, componentes atuais e histórico observado de problemas.

---

## 0. Metadados do relatório

| Item | Valor |
|---|---|
| Projeto | TravelOS |
| Stack | TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 + Supabase (Lovable Cloud) |
| Autoria simulada | Principal SWE, Staff FE, Design System Architect, Supabase Architect, Security Architect, QA Regression, Product Ops, Tourism SaaS Specialist, Release Manager, AI Governance Auditor |
| Escopo | Diagnóstico histórico + matrizes de verificação + framework anti-regressão |
| Status | **Não-conclusivo.** Define como provar; não prova. |
| Implementação realizada nesta tarefa | **Nenhuma.** Apenas este documento foi criado. |

---

## 1. Resumo executivo honesto

O TravelOS passou por múltiplos ciclos de refatoração, reescrita e correção conduzidos por agentes de IA. Esses ciclos foram amplos, frequentemente fora de um inventário prévio e quase sempre encerrados com declarações de sucesso pela própria IA. O efeito observável é um conjunto recorrente de riscos:

- **Desalinhamento planejamento ↔ implementação**: PRDs/prompts internos prometem CMS avançado, CRM premium, Admin Master enterprise, mas o código atual entrega, em vários módulos, CRUD raso, listas básicas ou backend oculto.
- **Quebra de rotas e telas em branco**: queries para colunas inexistentes (`leads.deleted_at`, `boarding_cards.departure_date`, `boarding_cards.passengers_count`, view `vw_admin_agents`) produziram erros 400/empty silenciosos.
- **Desacoplamento UI ↔ backend**: componentes consumindo campos que o banco não entrega, e tabelas com colunas que nenhuma UI lê.
- **Migrations órfãs / SQL manual**: correções rápidas via SQL no Supabase sem rastreio em `supabase/migrations/`, gerando drift entre ambientes.
- **Código morto e duplicação**: wizards, sheets, dialogs e services paralelos remanescentes de versões anteriores.
- **Design System não propagado**: cores Tailwind hardcoded (`slate`, `emerald`, `amber`, `indigo`, `sky`, `red`, etc.), gradientes e sombras pontuais contradizendo a diretriz **Flat Premium**.
- **Regras pétreas de UI violadas**: uso de `Dialog`/modal central em fluxos que deveriam ser `Sheet` lateral ou página dedicada.
- **CMS/Builder parcial**: rotulado como "avançado" mas sem versionamento, sem preview real fiel ao público, sem matriz de blocos completa.
- **Correções que mascaram causa raiz**: try/catch silenciando erro, fallback `as any`, `?? []` ocultando schema mismatch.
- **Falta de release gate real**: ausência de checklist comprovado antes de declarar entrega.
- **Falta de matriz "pedido vs código"**: nenhum artefato persistente correlaciona PRD → arquivo → tabela → rota.
- **Falta de validação holística módulo a módulo**: cada refatoração olha um pedaço; nenhuma valida o todo.

**Este documento não declara o sistema bom nem ruim.** Declara que a única forma honesta de saber é executar as matrizes deste relatório contra o código atual. Tudo o que a IA disse anteriormente — "premium", "blindado", "enterprise", "impecável" — deve ser tratado como **não comprovado** até auditoria.

---

## 2. Contexto do problema

### 2.1 Padrão recorrente observado

1. Usuário pede melhoria/refatoração.
2. IA implementa rapidamente, em larga escala, sem inventário prévio.
3. IA declara entrega como "premium / enterprise / corrigido".
4. Usuário testa e encontra: tela quebrada, UI pobre, botão inerte, erro de banco, layout torto, regra ignorada.
5. IA aplica nova correção pontual.
6. A correção introduz outro desalinhamento (schema, rota, tipo, RLS, design).
7. Ciclo se repete. Acumulam-se: código reescrito, código morto, components duplicados, migrations remendadas, relatórios otimistas.

### 2.2 Causa central

O problema **não é falta de código**. É **ausência de processo rigoroso de**:

- Inventário antes de criar.
- Comparação planejamento vs código.
- Validação schema vs UI.
- Design System enforcement.
- Release gate com evidência.
- Refatoração controlada (módulo a módulo, com rollback).
- Testes regressivos.
- Governança de afirmações de IA (proibição de autoaprovação).

---

## 3. Linha do tempo dos eventos e problemas

> A linha do tempo é reconstruída a partir do histórico de conversas, artefatos em `docs/`, migrations em `supabase/migrations/` e padrões observados no código. Eventos não datados são marcados como `[período]`.

### 3.1 Sincronização Git e primeiros desalinhamentos
- IA afirmando "push feito" / "main atualizada" sem prova de `git status`, `git log origin/main..HEAD`, working tree limpa.
- Lovable não identificando mudanças locais; necessidade de provar branch, HEAD, origin/main.
- Arquivos pendentes no Source Control não reconciliados.
- Falhas de commit por mensagem/comando quebrado.
- **Risco**: declarar entrega sem que o código esteja no remoto.

### 3.2 Erros Supabase por schema desalinhado
- `leads.deleted_at` consultado pela UI sem coluna no banco.
- `boarding_cards.departure_date` e `boarding_cards.passengers_count` consultados sem coluna.
- View `vw_admin_agents` referenciada sem existir.
- Erros vermelhos visíveis em CRM e Embarques.
- Correção sugerida via SQL manual no Supabase Studio (sem migration), aumentando drift.
- **Necessário**: migration oficial + regenerar `types.ts` + RLS revisada + validação em deploy.

### 3.3 Kanbans e telas em branco / carregando
- CRM ficando em branco ou em loading infinito.
- Embarques sem colunas renderizadas.
- React Query falhando silenciosamente; `data` undefined.
- Empty/error state ausentes ou genéricos.
- Correções adicionando mensagens, sem resolver causa raiz (schema).

### 3.4 UI pobre e inconsistência de Design System
- Páginas com cara de CRUD básico.
- Módulos com layouts divergentes.
- Botões quebrando texto em múltiplas linhas, espremidos, ou desalinhados.
- Headers inconsistentes entre rotas.
- `max-w-*` hardcoded variando por página.
- Cores Tailwind soltas: `slate`, `emerald`, `amber`, `red`, `indigo`, `sky`, `teal`, `zinc`.
- Gradientes/sombras/glass introduzidos contra preferência do usuário (Flat Premium).
- IA confundindo "premium" com efeito visual (gradiente/shadow/glass).

### 3.5 Regras pétreas de UI ignoradas
- Regra: **sem popups/modais centrais**; usar `Sheet` lateral; fluxos longos em página dedicada.
- Encontrados múltiplos `Dialog` centrais remanescentes após declaração de "tudo corrigido".
- Falta de componente único padronizado que torne a regressão impossível.

### 3.6 CMS/Builder prometido vs realidade
- Rotulado como "avançado / premium".
- Risco real: lista de páginas + botão salvar; builder em modal; preview = estado local; publicação sem renderização pública real.
- Faltam: editor maduro, renderer completo, block registry, schemas Zod, preview fiel, drafts, versionamento, Storage, SEO, forms/leads conectados, rota pública robusta.
- "Botão gerar com IA" sem garantia de IA real conectada.
- **Necessária classificação honesta**: CRUD de páginas / CMS básico / CMS parcial / CMS funcional / CMS avançado / CMS premium.

### 3.7 Contratos, PDFs e Storage
- Risco de PDF/base64 salvo no banco em vez de Storage.
- Necessário: Blob → bucket `contract-pdfs` → salvar path/URL.
- Serial atual via função SQL precisa ser auditado quanto a entropia (`md5(random())` é fraco; preferir `gen_random_uuid()` ou `encode(gen_random_bytes(16),'hex')`).
- Tokens públicos precisam ser não-enumeráveis e ter expiração.
- Evidência legal (IP, UA, timestamp, hash) precisa estar imutável (já há trigger `contracts_immutable_after_signed`, validar cobertura).
- Templates de contrato podem estar desatualizados após mudanças de schema.

### 3.8 Segurança e Red Team
- Edge Function de IA possivelmente sem verificação JWT — risco de abuso de cota.
- Verificação pública de contrato com risco de Full Table Scan / enumeração.
- Audit poisoning: policies que permitem `INSERT` em `audit_log` por qualquer agente.
- Necessário: RPC SECURITY DEFINER para logs.
- RLS por agência em **toda** tabela multi-tenant.
- Frontend nunca como fonte de verdade.

### 3.9 Performance e dados
- Busca sem debounce → muitas requests por digitação.
- `limit(200)` truncando silenciosamente.
- Cálculos financeiros (saldo, DRE) no frontend → risco de divergência.
- Necessárias RPCs financeiras no banco, paginação real, índices em FKs, eliminação de N+1.

### 3.10 Reescrita infinita e lixo técnico
- IA refatorando o que ela mesma acabou de criar.
- Components/wizards/sheets antigos não removidos.
- Services/hooks paralelos sem ownership.
- "Limpeza completa" declarada, resíduos persistem.
- Falta política de remoção/consolidação e ownership por módulo.

---

## 4. Taxonomia dos problemas

| Categoria | Sintoma | Causa provável | Exemplo observado | Risco | Prevenção | Validação |
|---|---|---|---|---|---|---|
| Governança de IA | Claims sem prova ("blindado", "premium") | Ausência de release gate | "CMS avançado" sem versionamento | Perda de confiança técnica | Proibir autoaprovação; exigir evidência | Checklist Release Gate |
| Documentação vs código | PRD não bate com implementação | Falta matriz pedido→arquivo | Admin Master "enterprise" = lista | Decisões erradas | Matriz Planejado vs Implementado | Auditoria periódica |
| Git/branch/deploy | "Push feito" sem reflexo no remoto | Comandos não verificados | Lovable não vê commits | Deploy fantasma | `git status` + `git log origin/main..HEAD` | Git delivery proof |
| Supabase/schema | Query 400 por coluna inexistente | SQL manual fora de migration | `leads.deleted_at` | Tela quebrada | Toda mudança = migration | Schema contract check |
| UI/Design System | Cores Tailwind hardcoded | Falta token enforcement | `text-emerald-600` | Inconsistência visual | Lint de classes proibidas | Grep de violações |
| Responsividade | Layout quebra <768px | `max-w-*` solto, sem teste mobile | Botões espremidos | UX ruim mobile | Padrão de shell + teste 375px | Checklist Premium |
| Regras de negócio | Lógica na UI | Falta service layer | Cálculo de saldo em componente | Divergência | RPC no banco | Comparar UI vs RPC |
| Turismo/comercial | Fluxo não conversa entre módulos | Visão por módulo, não jornada | Lead→Proposta→Viagem solta | Retrabalho operacional | Mapa de jornada por persona | Walkthrough real |
| CMS/Builder | "Avançado" sem versionamento | Promessa > capacidade | Builder em modal | Risco de produto | Maturity Gate explícito | Checklist CMS |
| Segurança | Edge Function sem JWT | Falta auth check | `/ai-orchestrator` aberto | Abuso de cota | `verify_jwt` + rate limit | Pen test simulado |
| Performance | Search sem debounce | Implementação ingênua | Lista de clientes | Spam de requests | `useDebounce` padrão | Profiler |
| Contratos/LGPD | Base64 no banco | Falta uso de Storage | PDF em coluna `text` | Custo + lentidão | Sempre Storage path | Inspeção schema |
| Código morto | Wizards/sheets antigos | Falta limpeza pós-refator | `Old*Wizard.tsx` | Confusão | Grep + remover | Build + cobertura |
| Hardcoded visual | `#hex`, `text-slate-*` | Falta token | Vários componentes | Theme break | Lint custom | Grep semântico |
| Falso positivo | "Tudo certo" sem teste | Autoaprovação | Declarações da IA | Erosão de confiança | Release gate evidencial | Auditoria |

---

## 5. Análise holística por perspectiva

### 5.1 Principal Software Engineer
Perguntas a responder com evidência:
- O código atual reflete o planejamento? **Não comprovado.**
- Módulos duplicados? **Suspeitos**: wizards/sheets antigos, possíveis services paralelos em `src/lib/`.
- Rotas órfãs? **Suspeitas**: `agency.$slug.brand.tsx`, `agency.$slug.team.tsx` sem ponto de entrada claro no sidebar.
- Components criados e não usados? **Provável**, requer grep.
- Lógica de negócio na UI? **Provável** em Financeiro (cálculos client-side).
- Backend oculto? **Sim**: CRM com tabelas (`leads`, `lead_stages`, `lead_activities`) com RLS habilitada e **policies ausentes em alguns casos**, gerando empty silencioso.
- UI fake? **Suspeita** em Admin Master.
- Reescrita desnecessária? **Sim**, evidenciada pelo histórico de erros JSX recorrentes em `m.payment.$token.tsx` e `p.$agency_slug.tour.$id.tsx`.

### 5.2 Staff Frontend / Design System Architect
**Premium no TravelOS NÃO é**: gradiente, sombra, glass, card bonito sem fluxo.
**Premium no TravelOS É**: Flat Premium — clareza, consistência, hierarquia, estados úteis, responsividade, ações contextuais, persistência, integração entre módulos.
Pontos a validar: tokens centralizados em `src/styles.css`; ausência de cores Tailwind soltas; um único `PageHeader`/`PageShell`; um único padrão de tabela/empty/loading/error; um único padrão de formulário em `Sheet`.

### 5.3 Supabase / PostgreSQL Architect
Checklist obrigatório:
- Toda coluna usada pela UI existe? **Histórico mostra não.**
- Toda view/RPC chamada existe? **Histórico mostra não** (`vw_admin_agents`).
- Toda migration está no repo? **Suspeita de SQL manual fora do fluxo.**
- Toda tabela multi-tenant filtra `agency_id`? **Validar caso a caso.**
- Toda tabela sensível tem RLS + policies coerentes? **Não** — há tabelas com RLS habilitada e zero policies (efeito: bloqueio silencioso).
- `types.ts` está em sincronia? **Validar** após cada migration.

### 5.4 Security Architect / Red Team
Vetores a auditar:
- Edge Functions: `ai-orchestrator`, `ai-voucher-ocr`, `web-push`, `admin-secure-keys` — verificar `verify_jwt` e checagem de role.
- Tokens públicos (`m.*`, `verify.$serial`): entropia, expiração, rate limit.
- `audit_log`: forjabilidade via INSERT direto.
- Storage buckets: policies por `agency_id` no path.
- XSS em CMS/blog: sanitização de HTML inserido por usuário.
- Cross-tenant: testar manipulação de `agency_id` em payloads.

### 5.5 Product / Tourism Operations
Perguntar por fluxo: quem usa, quando, que dado entra, que dado sai, que módulo consome em seguida, há status, responsável, histórico, checklist, alerta, permissão.
Risco real: módulos funcionam isoladamente mas a **jornada** Lead→Cotação→Proposta→Contrato→Viagem→Embarque→Pós-venda não foi validada ponta a ponta.

### 5.6 QA Regression Engineer
Fluxos críticos a cobrir manualmente antes de qualquer release:
1. Cadastro de agência + onboarding.
2. Convite de agente + aceite.
3. Lead → Proposta → Contrato assinado → Viagem criada.
4. Passageiro via magic link → preenchimento → check-in.
5. Pagamento via token público → confirmação.
6. Voucher OCR → emissão.
7. Portal público + página CMS publicada + blog post + verificação de contrato.

---

## 6. Matriz Planejado vs Implementado vs Atual

> Preencher executando auditoria. Status: `OK | Parcial | Mismatch | Ausente | Não analisado`.

| Módulo | Pedido | Prometido | Documentado | Arquivos esperados | Arquivos existentes | Tabelas esperadas | Tabelas existentes | UI espera campos | Banco entrega campos | Mismatch? | Migration? | RLS? | Storage? | Logs? | Testes? | Status | Risco | Ação |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | Visão consolidada | KPIs em tempo real | parcial | `agency.$slug.index.tsx` | ✓ | múltiplas | ✓ | a validar | a validar | ? | ? | ? | n/a | ? | não | Não analisado | Médio | Auditar queries |
| CRM | Kanban premium | Kanban + atividades | parcial | `agency.$slug.crm.tsx` | ✓ (lista) | `leads`, `lead_stages`, `lead_activities` | ✓ | inclui `deleted_at` historicamente | sem `deleted_at` em algum momento | **Sim (histórico)** | parcial | **policies parciais** | n/a | parcial | não | Parcial | Alto | Refatorar para Kanban + policies completas |
| Cotações/Propostas | Builder + preview público | Premium | parcial | `agency.$slug.proposals*.tsx` | ✓ | `proposals`, `proposal_items` | ✓ | a validar | a validar | ? | sim | sim | `proposal-attachments`, `proposal-covers` | ? | não | Não analisado | Médio | Auditar |
| Viagens | Hub operacional | Hub + financeiro + vouchers | parcial | `agency.$slug.trips*.tsx` | ✓ | `trips`, `trip_passengers` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Passageiros | CRUD + magic link | Completo | parcial | `agency.$slug.trips.$id.passengers.tsx` | ✓ | `trip_passengers` | ✓ | RPC `save_passenger_with_token` | ✓ | OK | sim | sim | `passenger-documents` | parcial | não | OK | Baixo | Validar |
| Embarques | Checklist + alertas | Operacional | parcial | `agency.$slug.boarding.tsx` | ✓ | `boarding_cards` | ✓ | `departure_date`, `passengers_count` | ausentes historicamente | **Sim** | remendada | sim | n/a | ? | não | Mismatch | Alto | Migration + types |
| Contratos | Assinatura + verificação | Legalmente válido | parcial | `agency.$slug.trips.$id.contract.tsx`, `m.contract.$token.tsx`, `verify.$serial.tsx` | ✓ | `contracts`, `contract_clauses_template` | ✓ | hash, certificate, signatures | ✓ | OK | sim | sim | `contract-pdfs` | sim (trigger imutável) | não | Parcial | Médio | Auditar serial + Storage path |
| Vouchers | OCR + emissão | Premium | parcial | `agency.$slug.vouchers.tsx`, `agency.$slug.trips.$id.vouchers.tsx` | ✓ | `vouchers` | ✓ | a validar | a validar | ? | sim | sim | `voucher-sources`, `voucher-pdfs` | ? | não | Não analisado | Médio | Auditar |
| Financeiro | Caixa + DRE + faturas | Premium | parcial | `agency.$slug.financial*.tsx` | ✓ | `financial_records`, `payment_plans`, `payment_installments` | ✓ | cálculos no client | banco não expõe RPC | **Sim** | sim | sim | `financial-receipts` | parcial | não | Parcial | Alto | Criar RPCs |
| Roteiros em Grupo | Lotação + inscrições | Premium | parcial | `agency.$slug.group-tours*.tsx` | ✓ | `group_tours`, `group_tour_enrollments` | ✓ | a validar | a validar | ? | sim | sim | `group-tour-gallery` | ? | não | Não analisado | Médio | Auditar |
| Frota/Ônibus | Mapa de assentos | Premium | parcial | `agency.$slug.bus-layouts*.tsx` | ✓ | `bus_layouts` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Vistos | Catálogo + pedidos | Premium | parcial | `agency.$slug.visas*.tsx` | ✓ | `visa_requests`, `visa_requirements` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Corporativo/RFP | Aprovação + portal | Premium | parcial | `agency.$slug.corporate*.tsx`, `p.corporate.approve.tsx` | ✓ | `corporate_clients` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Clientes | 360º + segmentação | Premium | parcial | `agency.$slug.clients*.tsx` | ✓ | `clients` | ✓ | a validar | a validar | ? | sim | sim | `client-avatars` | ? | não | Não analisado | Médio | Auditar |
| Fornecedores | CRUD + ratings | Premium | parcial | `agency.$slug.suppliers.tsx` | ✓ | `suppliers` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Suporte | Tickets + SLA | Premium | parcial | `agency.$slug.support*.tsx` | ✓ | `support_tickets` | ✓ | a validar | a validar | ? | sim | sim | `support-attachments` | ? | não | Não analisado | Médio | Auditar |
| Portal Público | Multi-tenant | SEO + páginas | parcial | `p.$agency_slug*.tsx` | ✓ | `portal_pages`, `blog_posts`, `knowledge_articles` | ✓ | renderer de blocos | ✓ | OK | sim | sim | n/a | n/a | não | Parcial | Médio | Auditar sanitização |
| CMS | Builder premium | Versionamento + drafts | parcial | `agency.$slug.portal*.tsx` | ✓ | `portal_pages` | ✓ | block schemas | sem `version` table | **Sim** | parcial | sim | n/a | não | não | Parcial | Alto | Maturity Gate |
| Builder | Editor visual | Premium | parcial | `BlockRenderer.tsx`, `cms-schemas.ts` | ✓ | n/a | n/a | a validar | n/a | ? | n/a | n/a | n/a | n/a | não | Não analisado | Alto | Auditar |
| Blog | Posts + SEO | Premium | parcial | `agency.$slug.portal.blog.tsx`, `p.$agency_slug.blog.$slug.tsx` | ✓ | `blog_posts` | ✓ | a validar | a validar | ? | sim | sim | `blog-covers` | ? | não | Não analisado | Médio | Auditar XSS |
| Base Conhecimento | KB pública | Premium | parcial | `agency.$slug.knowledge.tsx`, `p.$agency_slug.kb*.tsx` | ✓ | `knowledge_articles` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Baixo | Auditar |
| Minha Empresa | Branding + dados | Premium | parcial | `agency.$slug.company.tsx`, `agency.$slug.brand.tsx` | ✓ | `company_profiles`, `brand_kit`, `agency_private` | ✓ | a validar | a validar | ? | sim | sim | `agency-logos`, `agency-covers` | ? | não | Não analisado | Médio | Auditar `is_published` |
| Configurações | Multi-aba | Premium | parcial | `agency.$slug.settings.tsx` | ✓ | múltiplas | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Médio | Auditar |
| Admin Master | Enterprise | Multi-tudo | parcial | `admin.*.tsx` | ✓ (várias) | `agencies`, `plans`, `policy_documents`, `global_settings`, `api_keys` | ✓ | view `vw_admin_agents` | inexistente historicamente | **Sim** | parcial | sim | n/a | parcial | não | Mismatch | Alto | Criar view ou refatorar |
| Auth | Email + Google + onboarding | Premium | sim | `auth.*.tsx` | ✓ | `profiles`, `user_roles` | ✓ | papel super_admin | ✓ | OK | sim | sim | n/a | n/a | não | OK | Baixo | Validar Google |
| Convites | Token + aceite | Premium | sim | `m.invite.$token.tsx` | ✓ | `agency_invites` | ✓ | RPC `accept_agency_invite` | ✓ | OK | sim | sim | n/a | n/a | não | OK | Baixo | Validar expiração |
| Link Mágico | Tokens longos | Premium | sim | `m.*.tsx` | ✓ | múltiplas | ✓ | tokens | ✓ | OK | sim | sim | n/a | n/a | não | OK | Médio | Auditar entropia |
| Termos/LGPD | Consentimento | Premium | parcial | `client.consents.tsx`, `LegalBlocker.tsx` | ✓ | `policy_documents` | ✓ | a validar | a validar | ? | sim | sim | n/a | ? | não | Não analisado | Alto | Auditar trilha |
| Logs | Auditoria | Imutável | parcial | n/a UI | parcial | `audit_log` | ✓ | n/a | n/a | n/a | sim | **policies a revisar** | n/a | sim | não | Parcial | Alto | RPC SECURITY DEFINER |
| Storage/Media | Picker reutilizável | Premium | sim | `MediaLibraryPicker.tsx`, `FileUploader.tsx` | ✓ | n/a | n/a | n/a | n/a | n/a | n/a | bucket policies | múltiplos | n/a | não | Parcial | Médio | Auditar policies por path |

---

## 7. Matriz UI ↔ Backend ↔ Banco (template a executar)

| Tela | Ação | Componente | Hook/Service | Mutation/Query | Tabela/RPC/Edge | Campo usado | Existe? | RLS? | Error state? | Empty state? | Persiste? | Status | Correção |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRM | Listar | `agency.$slug.crm.tsx` | inline | `supabase.from('leads').select` | `leads` | `deleted_at` | **histórico: não** | sim | parcial | parcial | sim | Mismatch | Migration + policies |
| Embarques | Listar | `agency.$slug.boarding.tsx` | inline | `select` | `boarding_cards` | `departure_date`, `passengers_count` | **não** | sim | parcial | parcial | sim | Mismatch | Migration |
| Admin Agentes | Listar | `admin.agents.tsx` | inline | `from('vw_admin_agents')` | view | n/a | **não** | n/a | parcial | parcial | n/a | Mismatch | Criar view |
| (executar para todas) | | | | | | | | | | | | | |

---

## 8. Matriz Design System / UI hardcoded (padrões a buscar)

Procurar em `src/`:
- `shadow`, `drop-shadow`, `bg-gradient`, `from-`, `via-`, `to-`
- `slate`, `zinc`, `red-`, `blue-`, `emerald`, `amber`, `indigo`, `sky`, `teal`, `rose`
- `style={{`, `max-w-`, `w-[`, `h-[`, `z-[`
- `fixed inset-0`, `items-center justify-center` em contexto modal
- `Dialog`, `Modal`, `popup`, `glass`

Classificar cada ocorrência: **Violação real | Uso legítimo | Revisão humana | Virar token | Virar componente**.

| Arquivo | Padrão | Tipo | Exemplo | Token? | Componente? | Remover? | Prioridade |
|---|---|---|---|---|---|---|---|
| (executar grep) | | | | | | | |

---

## 9. Matriz Supabase schema mismatch

| Arquivo FE | Query | Tabela/View/RPC | Campo esperado | Em migration? | Em types? | No banco real? | Fallback? | Quebra tela? | Correção |
|---|---|---|---|---|---|---|---|---|---|
| `agency.$slug.crm.tsx` | select | `leads` | `deleted_at` | parcial | parcial | parcial | `?? []` | sim | Migration + types |
| `agency.$slug.boarding.tsx` | select | `boarding_cards` | `departure_date` | não | não | não | nenhum | sim | Migration |
| `agency.$slug.boarding.tsx` | select | `boarding_cards` | `passengers_count` | não | não | não | nenhum | sim | Migration |
| `admin.agents.tsx` | select | `vw_admin_agents` | n/a | não | não | não | nenhum | sim | Criar view |
| (continuar) | | | | | | | | | |

---

## 10. Matriz de contratos desatualizados

| Template/Fluxo | Campos usados | Dados esperados | Tabelas | PDF/Storage | Assinatura | Logs | LGPD | RLS | Desatualizado? | Risco jurídico | Correção |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Contrato padrão | nome, doc, pacote, total | client_data, passengers_data | `contracts` | `contract-pdfs` (validar) | `sign_contract_with_token` | trigger imutável | parcial | sim | a validar | médio | Auditar serial + path |
| Verificação pública | serial | hash, signed_at | `verify_contract` RPC | n/a | n/a | n/a | n/a | SECURITY DEFINER | OK | baixo | Rate limit |

---

## 11. Matriz código morto / duplicado / lixo técnico

| Arquivo | Último uso | Duplicata? | Motivo suspeita | Pode remover? | Consolidar? | Risco | Ação |
|---|---|---|---|---|---|---|---|
| (executar grep `import.*from.*X`) | | | | | | | |

Buscar: rotas órfãs, components antigos, services paralelos, hooks duplicados, wizards antigos, sheets antigos, dialogs remanescentes, builders antigos, renderers antigos, templates antigos, SQL solto, arquivos temporários, artifacts sem prova (`pasted-*.txt`).

---

## 12. Matriz "IA disse vs realidade"

| Afirmação | Exemplo | O que provaria | Evidência presente | Evidência ausente | Contradição | Status | Lição | Regra anti-repetição |
|---|---|---|---|---|---|---|---|---|
| "Tudo pronto" | fim de turn | build + testes + walkthrough | parcial | testes | erros pós-deploy | Exagero | Exigir gate | Proibir frase sem gate |
| "Build limpo" | declaração | `tsc --noEmit` | às vezes | log | erros JSX recorrentes | Parcial | Rodar typecheck | Anexar log |
| "Premium" | CMS, CRM, Admin | matriz de capacidades | não | matriz | UI raso | Não comprovado | Definir critério | Maturity Gate |
| "Sem hardcoded" | UI | grep limpo | não | grep | cores Tailwind soltas | Falso positivo | Lint | Bloquear classes |
| "Tudo Sheet" | regra pétrea | grep `Dialog` zero | não | grep | múltiplos Dialog | Falso positivo | Lint | Banir Dialog em fluxo |
| "Banco atualizado" | após migration | `supabase db diff` zero | não | diff | drift | Não comprovado | Migration only | Proibir SQL manual |
| "Main sincronizada" | git | `origin/main..HEAD` vazio | não | log | divergência | Não comprovado | Git proof | Anexar status |
| "Blindado" | segurança | pen test | não | scan | Edge sem JWT | Exagero | Scan obrigatório | Proibir o termo |
| "Corrigido definitivamente" | bug | regressão | parcial | teste | retorno do bug | Falso positivo | Teste regressivo | Anexar teste |

---

## 13. Diagnóstico de causa raiz

1. **Ausência de fonte única da verdade** para regras do projeto (UI, schema, business).
2. **IA aplicando padrões genéricos de treinamento** em vez de respeitar convenções TravelOS.
3. **Falta de visual regression / preview manual** em cada PR.
4. **Falta de schema contract** UI ↔ Supabase verificável em CI.
5. **Falta de release gate** com evidência exigida.
6. **Falta de design token enforcement** (lint custom).
7. **Falta de ownership por módulo** — qualquer um edita qualquer coisa.
8. **Falta de matriz planejamento vs implementação** persistente.
9. **Falta de controle de migrations** (SQL manual permitido).
10. **Autoaprovação da IA** sem prova.
11. **Falta de validação por perfil** (agente, cliente, admin).
12. **Falta de testes de fluxo ponta a ponta.**
13. **Refatorações amplas demais** sem etapa de estabilização.
14. **Reescritas repetidas** geram lixo técnico.
15. **Confusão "aparência premium" vs "experiência premium real".**

---

## 14. Sistema Anti-Regressão, Anti-Falso-Positivo e Anti-Lixo Técnico

### 14.1 Contrato de Schema UI ↔ Supabase
- Regenerar `types.ts` após cada migration.
- Proibir query a campo sem migration correspondente.
- Script de schema mismatch: grep de `.from('X').select(...)` cruzando com `types.ts`.
- Todo SQL manual vira migration commitada.
- Toda view/RPC tem teste de existência em CI.
- Toda alteração de banco documenta impacto na UI.

### 14.2 Release Gate (obrigatório antes de declarar entrega)
- [ ] Git limpo (`git status` vazio).
- [ ] Branch main confirmada (`git log origin/main..HEAD` vazio após push).
- [ ] Build passou.
- [ ] Typecheck passou.
- [ ] Lint passou ou desvio justificado.
- [ ] Sem SQL solto fora de `supabase/migrations/`.
- [ ] Sem arquivos temporários (`pasted-*.txt`, `tmp_*`).
- [ ] Sem mock/fake em fluxo crítico.
- [ ] Sem botão sem ação em fluxo crítico.
- [ ] Sem schema mismatch crítico.
- [ ] Sem RLS crítica ausente.
- [ ] Sem UI crítica quebrada.
- [ ] Sem hardcoded visual crítico.
- [ ] Sem claim sem evidência anexada.

### 14.3 Design System Enforcement
- Flat Premium como única linguagem.
- Sem sombras, gradientes, glassmorphism.
- Botões: `min-width` consistente, `whitespace-nowrap` quando aplicável, ícone+texto padronizados.
- Layout responsivo testado em 375 / 768 / 1280 / 1920.
- Componentes base obrigatórios: `PageHeader`, `PageShell`, `DataTable`, `FormSheet`, `EmptyState`, `ErrorState`, `LoadingState`.
- Tokens obrigatórios em `src/styles.css`; cores Tailwind soltas **banidas**.
- Lista de classes proibidas: `bg-gradient*`, `shadow-*` (exceto tokens), cores nominais Tailwind fora de tokens.
- Review visual por módulo antes de release.

### 14.4 CMS/Builder Maturity Gate
CMS só é "avançado" se tiver, comprovadamente:
- Blocos reais com schema Zod.
- Editor maduro em página dedicada (não modal).
- Renderer público fiel.
- Persistência.
- Draft / Publish.
- Preview fiel ao público.
- SEO (title, meta, OG, JSON-LD).
- Versionamento ou plano explícito de versionamento.
- Storage para mídia.
- RLS por agência.
- Logs de publicação.
- Página pública servindo conteúdo.
Caso contrário, classificar como **CRUD de páginas** e ajustar comunicação.

### 14.5 AI Governance (Lovable/Antigravity)
- Não usar linguagem de vitória.
- Não autoaprovar.
- Não prometer sem prova.
- Não criar implementação paralela sem inventário.
- Não reescrever sem matriz de impacto.
- Não fazer refatoração ampla sem checkpoint módulo a módulo.
- Não chamar básico de premium.
- Não usar SQL manual como solução final.
- Não usar `as any` para esconder schema.
- Não usar fallback que mascara erro.
- Não apagar código sem mapear uso.
- Não declarar push/main sem git proof.

### 14.6 Refactoring Safety Protocol
Antes de refatorar:
1. Inventário.
2. Mapa de dependências.
3. Mapa de rotas afetadas.
4. Mapa de tabelas afetadas.
5. Mapa de components afetados.
6. Mapa de hooks/services afetados.
7. Riscos enumerados.
8. Plano de rollback.
9. Critério de aceite.
10. Refatoração por módulo, com build após cada bloco.
11. Diff review.
12. Validação pós-fix (manual + automatizada).

---

## 15. TravelOS Integrity Operating Framework

| Fase | Objetivo | Entradas | Saídas | Artefatos | Bloqueadores | Quem revisa |
|---|---|---|---|---|---|---|
| 1. Intake | Capturar pedido | Mensagem do usuário | Escopo claro | Brief | Pedido ambíguo | Product Ops |
| 2. Inventory | Mapear ativos | Codebase | Lista de arquivos/tabelas/rotas | Inventory Report | Inventário ausente | Principal SWE |
| 3. Documentation Review | Ler PRD/artifacts | `docs/`, plan.md | Diff doc vs código | Doc-Code Matrix | Doc desatualizada | AI Governance |
| 4. Architecture Map | Desenhar fluxo | Inventário | Diagrama | Arch Map | Acoplamento alto | Staff FE |
| 5. Schema Contract Check | UI vs DB | Queries + types | Mismatch list | Schema Matrix | Mismatch crítico | DB Architect |
| 6. UI Design System Check | Tokens | Componentes | Lista de violações | DS Compliance | Hardcoded crítico | DS Architect |
| 7. Business Rule Check | RNs | PRDs | Lista de RNs vs código | Rule Matrix | RN ausente | Tourism Specialist |
| 8. Security Check | RLS, auth | Migrations, edge fns | Findings | Threat Model | Crítico aberto | Security |
| 9. Implementation Gap Matrix | Pedido vs código | Tudo acima | Matriz | Gap Matrix | Gaps P0 | Principal SWE |
| 10. Refactor Decision Matrix | Reuse/Refactor/Create | Gap Matrix | Decisões | Decision Matrix | Decisão indefinida | Principal SWE |
| 11. Controlled Fix | Implementar | Decisões | Código | Diff | Mudança fora de escopo | Principal SWE |
| 12. Post-Fix Validation | Validar | Diff | Resultado | Test Report | Falha | QA |
| 13. Manual Test Plan | Roteiro humano | Fluxos críticos | Checklist executado | Manual Test Plan | Não executado | QA |
| 14. Release Gate | Aprovar | Tudo | Sentença | Release Report | Critério falho | Release Manager |
| 15. Git Delivery Proof | Provar entrega | Push | Logs git | Delivery Proof | Sem push | Release Manager |

---

## 16. Definition of Done (TravelOS)

Uma entrega só é concluída se **todos** os itens forem comprovados:

- [ ] Pedido convertido em requisitos verificáveis.
- [ ] Código atual inventariado.
- [ ] Impacto mapeado.
- [ ] Sem duplicidade criada.
- [ ] UI usa backend real.
- [ ] Backend usa banco real.
- [ ] Banco tem migration commitada.
- [ ] RLS revisada.
- [ ] Storage revisado quando aplicável.
- [ ] Design System respeitado.
- [ ] Sem hardcoded crítico.
- [ ] Sem mock/fake em produção.
- [ ] Sem botão sem ação.
- [ ] Sem loading infinito.
- [ ] Sem erro silencioso.
- [ ] Build, typecheck, lint executados.
- [ ] Fluxo validado ponta a ponta.
- [ ] Manual test plan criado e executado.
- [ ] Release gate aprovado.
- [ ] Git delivery proof anexado.
- [ ] Limitações declaradas explicitamente.

---

## 17. Checklist de revisão pré-tarefa

- [ ] O que já existe?
- [ ] O que será reutilizado?
- [ ] O que será alterado?
- [ ] O que será removido?
- [ ] Que tabela é afetada?
- [ ] Que schema é afetado?
- [ ] Que migration é necessária?
- [ ] Que UI é afetada?
- [ ] Que módulo consome esse dado?
- [ ] Que rota quebra se mudar?
- [ ] Que contrato/template usa isso?
- [ ] Que regra de negócio depende disso?
- [ ] Que RLS protege isso?
- [ ] Que teste comprova?
- [ ] Que risco de regressão existe?

---

## 18. Recomendações finais

1. Parar refatorações amplas sem inventário.
2. Criar backlog de **estabilização por módulo** (não de novas features).
3. Criar matriz persistente módulo → tabela → UI → service.
4. Criar arquivo de **regras UI** obrigatório (`docs/ui-rules.md`).
5. Criar arquivo de **regras Supabase** obrigatório (`docs/supabase-rules.md`).
6. Criar **release gate** obrigatório.
7. Criar **manual test plan** por módulo.
8. Revisar CMS/Builder isoladamente, com Maturity Gate.
9. Revisar contratos isoladamente (jurídico + Storage + serial).
10. Revisar Design System isoladamente, com lint custom.
11. Revisar Supabase/migrations isoladamente, com `supabase db diff` em CI.
12. Remover código morto com cautela (grep + commit isolado).
13. Consolidar components duplicados após mapa de uso.
14. Proibir claims sem evidência.
15. Tratar "premium" como **fluxo funcional + UI consistente**, não efeito visual.

---

## 19. Status final do relatório

- Este relatório **não** prova que o sistema está correto.
- Este relatório **define como provar**.
- Este relatório **deve ser usado antes de qualquer nova refatoração**.
- Este relatório **deve guiar a próxima auditoria real do código**.
- Próximo passo: executar as matrizes (§6, §7, §8, §9, §10, §11, §12) contra o código atual.
- Qualquer correção futura deve seguir o framework (§15) e o DoD (§16).

---

## 20. Anexo — Prompts operacionais futuros

### Prompt 1 — Auditoria de integridade
> "Leia `AntigravityRelatorio.md` e execute a matriz Planejado vs Implementado vs Atual contra o código atual. Não implemente nada antes de entregar o diagnóstico completo, com evidências por arquivo, tabela e rota."

### Prompt 2 — Correção controlada
> "Leia `AntigravityRelatorio.md`, escolha apenas os itens P0/P1 comprovados na auditoria, corrija de forma controlada (um módulo por vez), gere migration quando necessário, valide build/typecheck/lint, e entregue Release Gate preenchido com evidências."

### Prompt 3 — Refatoração segura
> "Leia `AntigravityRelatorio.md`, execute o Refactoring Safety Protocol (§14.6), mapeie dependências, proponha refatoração por módulo, peça aprovação antes de reescrever e valide após cada bloco com diff review + manual test plan."

---

**Fim do documento.**
