## Estado atual (auditoria rápida)

- **Build**: `client.documents.tsx` já consulta `source_type` / `generated_at` em `vouchers` (sem `kind` / `issued_at` / `status`). O erro citado **já está corrigido** na versão atual — vou só rodar typecheck/build no início e corrigir o que aparecer.
- **Tabelas presentes** (39): agencies, agency_invites, agency_private, agency_tags, api_keys, audit_log, blog_posts, boarding_cards, brand_kit, clients, company_profiles, contract_clauses_template, contracts, corporate_clients, coupons, financial_records, gift_cards, group_tour_enrollments, group_tours, knowledge_articles, lead_activities, lead_forms, lead_stages, leads, notifications, payment_installments, payment_plans, portal_pages, profiles, proposal_items, proposals, suppliers, support_tickets, trip_passengers, trips, user_roles, visa_requests, visa_requirements, vouchers.
- **Faltando do spec**: `plans`, `push_subscriptions`, `global_settings` (landing CMS), `ai_chat_messages` (log/contexto), `ai_rate_limit` (50 msg/h por agência).
- **Rotas**: 80+ arquivos já presentes (admin/_, agency/_, client/_, m/_, p/_, auth/_, verify). Várias páginas já reais; outras ainda enxutas ou sem editor visual (seat map, portal blocks editor, ai chat real, OCR voucher, PWA).
- **Buckets**: 13 buckets já criados, cobrindo tudo exceto eventualmente `landing-assets` (não obrigatório).
- **Componentes**: shell limpo (AppShell, AdminShell, ClientShell, AIChatPanel placeholder). Nenhum duplicado visível.

## Premissas que preciso confirmar antes de codar

1. **AI Chat (Fase C-1)** — o spec diz Anthropic `claude-sonnet-4-20250514`. Lovable AI Gateway **não** expõe Anthropic; só Google/OpenAI. Duas opções: (eu ja pedi desde o inciio para ter orquestrador de chaves openrouter/groq) etc... orquestrador no fornecido pelo admin global e opcional se cada agência quiser ter sua cahve.

- **(A) Manter Anthropic real**: você adiciona o secret `ANTHROPIC_API_KEY` (vou solicitar via `secrets--add_secret` no início da Fase C). Backend usa fetch direto para `api.anthropic.com`.
- **(B) Usar Lovable AI (Gemini 2.5 Pro)** sem novo secret, mesma arquitetura de tools/contexto.  
  → **Vou assumir (A)** e pedir o secret. Diga se prefere (B).

2. **Web Push (Fase E-1)** — preciso de `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`. Vou gerar e pedir como secret no início da Fase E. (cadastre os campos e deixe para futuramente eu fazer essa integração)...
3. **WhatsApp / Resend** (notificações 30d/7d/etc) — vou implementar a infra de cron + tabela de schedule + Edge Function de envio com **canal `notifications` (in-app)** sempre, e WhatsApp/Email só disparam se a agência tiver chave em `api_keys`. Sem chave → silenciosamente só in-app. (integração nativa... resend não funciona de verdade)...
4. **Escopo enorme**. Vou entregar em ondas commitáveis. Cada onda é independente, sem quebrar o build, e o app continua usável entre elas.

## Ondas de execução

### Onda 0 — Saúde do build + schema faltante

1. Rodar typecheck; corrigir qualquer erro real remanescente (não só vouchers).
2. Migração única adicionando: `plans`, `push_subscriptions`, `global_settings`, `ai_chat_messages`, `ai_rate_limit` — todas com GRANTs + RLS por `is_agency_member` / `has_role('super_admin')`.
3. Trigger `contracts_immutable_after_signed` já existe — verificar que está ATIVO em `contracts` (não só função). Se não, anexar.
4. Trigger `R01` (proposal aceita → cria trip) e `R02` (trip criada → boarding_card) — adicionar como funções + triggers SQL.

### Onda 1 — Portal do cliente (request explícito)

- `/client/profile`: upsert real em `clients` por `user_id=auth.uid()`, upload avatar bucket `client-avatars`, campos completos do spec.
- `/client/notifications`: lista `notifications` por `user_id`, marca lida ao clicar, badge de não-lidas no header do `ClientShell`.
- `/client/giftcards`: duas tabs (Gift Cards + Cupons) lendo `gift_cards` / `coupons` filtrados por cliente.
- `/client/documents`: revisar e garantir consistência (já alinhado, só polir UI).

### Onda 2 — Settings e Minha Empresa (request explícito)

- `/agency/:slug/settings` com 4 tabs (Geral / Equipe embed via componente compartilhado / Integrações / API Keys), todos persistindo em `agencies` + `agency_private` + `api_keys` com máscara (`****` exibido após salvar) e upsert por (agency_id, provider).
- `/agency/:slug/company` com todas as seções do spec (Identidade, Contato, Endereço, Horários 7 dias, Mídia com FileUploader/MultiFileUploader, Redes, Operadoras, Pagamentos, Google) e **preview lateral 300px** desktop.
- Componente **reutilizável** `FileUploader` + `MultiFileUploader` (drag-drop, URL externa, preview, remover, loading, limites: 5MB img / 10MB pdf / 50MB vídeo). Usado também em todos os módulos com upload (clientes, vouchers, financial-receipts, etc.) — substitui implementações ad-hoc onde existirem.

### Onda 3 — Fase D parte 1 (Admin global real)

- `/admin/agencies` list + detail com tabs Dados/Plano/Brand/Agentes/Audit (já parcial).
- `/admin/plans`: CRUD real em nova tabela `plans` criada na Onda 0.
- `/admin/brand`: editar nome global, favicon, logo, cor primária + landing copy (lê de `global_settings`).
- `/admin/policies`: editor markdown versionado (nova tabela `policy_documents` se não criamos na Onda 0 — incluo nela).
- `/admin/audit`: tabela real de `audit_log` com filtros.
- `/admin/api-keys`: CRUD global (agency_id IS NULL) com auto-rotação por `monthly_limit` (função SQL `pick_active_api_key(provider)`).

### Onda 4 — Fase D parte 2 (Portal público + lead capture)

- `/p/:agency_slug`: render dos `portal_pages.blocks` jsonb com componentes por tipo (hero, about, services, featured_tours, destinations, testimonials, partners, blog_preview, contact, map, faq, gallery, payment_methods, custom_html).
- `/p/:agency_slug/tour/:id`: página pública do roteiro com vagas, itinerário, galeria, "Reservar" → insere lead + abre coleta.
- `/p/:agency_slug/blog/:slug`: post público com SEO.
- `/p/:agency_slug/form/:slug`: render de `lead_forms.fields` jsonb → INSERT em `leads` + `submissions_count++`.
- Editor `lead_forms` em `/agency/:slug/crm/forms`.
- **Seat map editor** 2D para `group_tours.seat_map` (grid clicável persistido).
- Polir `/auth/onboarding` 7 steps com persistência por step.

### Onda 5 — Fase C (IA + OCR)

- **AI Chat coluna 2**: store Zustand persistido em `localStorage` por `agency_id+user_id`, contexto auto por rota, sanitização de input, rate limit em `ai_rate_limit` (50/h/agência), log em `audit_log` action='ai_chat_message'. Server route `/api/ai/chat` (TanStack server route, NÃO edge function) chama Anthropic com bearer do secret `ANTHROPIC_API_KEY`, tools registradas (`create_lead`, `create_proposal`, `get_trip_details`).
- **Voucher OCR**: server route `/api/voucher/ocr` faz upload do PDF, chama Gemini Vision via Lovable AI Gateway, extrai estruturado, aplica lista de bloqueio B2B (`FRT`, `Orinter`, `CVC`, `Diversa`, `caução`, `comissão`, `ADM`, `taxa de agência`, `regra tarifária`). Geração dos 3 documentos story 9:16 via `html2canvas` (`scale: 3`, 400×711) lado cliente, salvos em `voucher-pdfs`.
- **Gerar Capa com IA** no editor de proposta: server route chama Gemini 2.5 Flash Image (Nano Banana) via Lovable AI; upload para `proposal-covers`; atualiza `proposals.cover_image_url`.
- `**/admin/api-keys**` já entra na Onda 3; aqui só conecto a lógica de seleção (agency-specific → global).

### Onda 6 — Fase E (PWA + cron + MCP)

- `vite-plugin-pwa` com `manifest.webmanifest` dinâmico por agência (server route `/p/:slug/manifest.json`), service worker, registro de push em `push_subscriptions`.
- Server route `/api/public/cron/run` (chamada por pg_cron) processa: 30d/7d/3d/1d antes de embarque, 7d/3d/1d antes de parcela, 15d antes de aniversário. Insere em `notifications` + dispara Web Push se subscription existe.
- WebMCP server em `/mcp` expondo recursos (trips/clients/proposals/financial/knowledge) + tools (`create_lead`, `create_proposal`, `get_trip_details`). Auth via API key da agência.

### Onda 7 — Auditoria final (ETAPA 11)

Varredura: imports quebrados, `any`, `console.log`, fetch sem try/catch, formulários sem validação, botões sem loading, listas sem empty state, rotas sem guard de slug. Corrigir tudo encontrado.

## Detalhes técnicos importantes

- **Server routes vs Edge Functions**: tudo novo vai em **TanStack server routes** (`src/routes/api/*`). Edge Functions só se for webhook estritamente externo. (Conforme regra do stack moderno.)
- **RLS**: cada nova tabela vem com policies por `is_agency_member(agency_id)` para SELECT/INSERT/UPDATE e bloqueio de DELETE para `agent_viewer`. `audit_log` mantém INSERT-only. `push_subscriptions` por `user_id=auth.uid()`.
- **Design system**: nenhuma cor hardcoded nas novas implementações; tudo via tokens em `src/styles.css`. SheetPage para todo CRUD (sem modal).
- **FileUploader**: novo componente `src/components/uploads/FileUploader.tsx` + `MultiFileUploader.tsx`. Substitui qualquer `<input type=file>` ad-hoc encontrado.
- **Sem mocks / hardcoded**: todo dado sai do banco. Selects de cliente/agente/tag puxam em tempo real.
- **Sem quebrar nada**: cada onda roda typecheck antes de finalizar; rotas existentes intocadas a menos que sejam refatoradas para reuso.

## O que **não** entra agora (precisa decisão sua)

- Landing page `/` reformulada (ETAPA 9) — separada porque é só visual e independente. Posso fazer junto da Onda 7 se quiser.
- Tradução do MCP server para um padrão específico (REST? JSON-RPC?). Vou assumir JSON-RPC 2.0 estilo MCP oficial; me corrija se quiser REST.

## Aprovação

Confirma o plano e respondo com:

- (A) ou (B) para a IA do chat,
- se posso pedir os secrets (`ANTHROPIC_API_KEY` se A, `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` na Onda 6),
- se quer a landing page reformulada incluída.

Assim que aprovar, começo pela Onda 0.
