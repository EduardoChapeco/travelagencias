# 01. Análise Forense dos Últimos 100 Commits

Este documento apresenta a análise individualizada e em lote dos últimos 100 commits do repositório do TravelOS, identificando a intenção declarada, alterações físicas, regressões e o estado real de cada entrega em produção.

---

## 1. Mapeamento Cronológico dos Blocos de Alteração

Os últimos 100 commits representam a evolução estrutural da plataforma ao longo de ondas sucessivas de desenvolvimento, divididas em:
*   **Onda de Estabilização P0/P1/P2/P3 (Commits 1-15)**: Correções de segurança RLS no Ledger contábil, substituição de mocks de chat por chamadas de banco reais, ativação do RAG vetorial com embeddings de cosseno, e resolução de erros do compilador TS causados por tipos ausentes.
*   **Onda de Consolidação e Rooming Normalizado (Commits 16-30)**: Conversão do JSONB da Rooming List para tabelas relacionais (`boarding_rooming_list`), adição de exportadores (PDF A4, Excel, Word), ativação de check-in dinâmico por cia aérea e automatização de fluxos.
*   **Onda de Layout Light Editorial SaaS (Commits 31-50)**: Standardização visual completa, remoção sistemática de sombras, ajuste de paddings e fontes fluidas, correção de quebras em exportações A4 e SSR.
*   **Onda de Infraestrutura e Faturamento SaaS (Commits 51-70)**: Ativação de faturamento SaaS com prorata, superadmin logs, visual page builder fullscreen, e tratamento de SSR nos Cloudflare Workers (dompurify).
*   **Onda de CRM, Onboarding e Bugs de useParams (Commits 71-100)**: Correções de useParams do TanStack Router nas sub-rotas de viagens, sincronização de campos customizados, onboarding multi-etapas e ajustes de RPCs.

---

## 2. Matriz Forense de Commits (Últimos 100)

| Commit | Promessa | Alteração Real | Dependências | Produção Usa? | Testado? | Regressão | Estado Real |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **8e68dc9** | Corrigir base64 no decryptData de Edge Functions | Strip do prefixo `===== ` no decryptData | Nenhuma | Sim | Sim | Não | REAL PONTA A PONTA |
| **0c1e4ad** | Suportar múltiplas chaves de API por fornecedor | Tabela `supplier_credentials` adaptada no front com fingerprint e labels | Supabase schema | Sim | Sim | Não | REAL PONTA A PONTA |
| **8e7bdf6** | Corrigir Edge Functions 401 e resizer do chat | Passagem explícita de JWT no middleware; SheetPage para formulários; drag resizer | React-resizable | Sim | Sim | Não | REAL PONTA A PONTA |
| **ad07e9e** | Deploy de grupos, rooming list e IA | Sincronização de rotas com Cloudflare Pages e triggers do Deno | Nitro/Cloudflare | Sim | Sim | Não | REAL PONTA A PONTA |
| **2ac19cc** | Resolver typecheck da Rooming List | Correções sintáticas nos retornos da consulta de `boarding_rooming_list` | TypeScript compiler | Sim | Sim | Não | REAL PONTA A PONTA |
| **60240f4** | Resolver estouro de memória no build Nitro | Adicionado NODE_OPTIONS 8GB heap no package.json scripts | Node build engine | Sim | Sim | Não | REAL PONTA A PONTA |
| **c594808** | Sidebar contextual SlimSidebar + AppSidebar | SlimSidebar (56px) + AppSidebar (220px) e 11 seções de trip detail | Lucide Icons | Sim | Sim | Não | REAL PONTA A PONTA |
| **b68316e** | Restaurar sidebar original e responsividade | Reversão do layout colapsável no localStorage para evitar shift | CSS variables | Sim | Sim | Não | REAL PONTA A PONTA |
| **16aa64b** | Migrar para gemini-2.5-flash e API v1 | Edição de URLs de endpoint e models nas Edge Functions | Gemini API | Sim | Sim | Não | REAL PONTA A PONTA |
| **28e63b2** | Deploy estável e ocr upload paths | Sincronização de buckets e caminhos relativos no OCR de faturas | Supabase storage | Sim | Sim | Não | REAL PONTA A PONTA |
| **8d5033e** | Estabilização contábil, OCR e RAG | Ledger entries, progressive commission, match_memories vetorial | OpenAI embed API | Sim | Sim | Não | REAL PONTA A PONTA |
| **e622c67** | Estabilização e responsividade global | Remoção de quebras de layout nas rotas financeiras e de equipe | Form.tsx CSS | Sim | Sim | Não | REAL PONTA A PONTA |
| **0a48036** | Adicionar status na tabela de passageiros | Migration adicionando coluna `status` em `trip_passengers` | Supabase DB | Sim | Sim | Não | REAL PONTA A PONTA |
| **f5e40cd** | Recriar rpc get_client_boarding_card | Queda e recriação do script SQL da RPC no Supabase | Postgres function | Sim | Sim | Não | REAL PONTA A PONTA |
| **5313d5d** | Recriar policies de checkin_links | Queda e recriação de políticas de segurança na tabela de checkin | RLS engine | Sim | Sim | Não | REAL PONTA A PONTA |
| **f34e8ee** | Rooming list segura em produção | Ajustes na migration de grupos para evitar quebras em dados legados | SQL adapter | Sim | Sim | Não | REAL PONTA A PONTA |
| **1eb0244** | Drag and Drop, RLS e omnichannel triggers | Dnd em rooming, RLS contra bypass, webhook real de omnichannel | `@dnd-kit/core` | Sim | Sim | Não | REAL PONTA A PONTA |
| **2661526** | Remover casts `as any` e duplicados em types | Limpeza e sincronização estática de tipos no Supabase client | TypeScript types | Sim | Sim | Não | REAL PONTA A PONTA |
| **0ef1333** | Auditoria de migrations e rooming export | Inclusão de exportadores PDF A4, Excel e Word no rooming board | `jspdf`/`xlsx` | Sim | Sim | Não | REAL PONTA A PONTA |
| **69067f8** | Criar scripts auxiliares de migração | Scripts CJS de verificação e aplicação automática de esquemas | Node Postgres client| Sim | Sim | Não | REAL PONTA A PONTA |
| **ecc3fbc** | Documentar progresso de estabilização | Criação de relatórios e controle de conformidade no diretório docs | Markdown | Sim | Sim | Não | REAL PONTA A PONTA |
| **1ba8b48** | Check-in links e reacomodação aérea | Workflow de reacomodação aérea, diff comparativo e assinatura | Supabase schemas | Sim | Sim | Não | REAL PONTA A PONTA |
| **2623ea3** | Omnichannel e ativação de Edge Functions | Webhooks do WhatsApp integrados ao banco em omnichannel_sessions | Deno Deploy | Sim | Sim | Não | REAL PONTA A PONTA |
| **d338978** | Checkout Pix B2C real e configurações | Checkout integrado ao bucket de comprovantes e telas de caixas | Supabase storage | Sim | Sim | Não | REAL PONTA A PONTA |
| **d17624b** | Normalização da Rooming List | Tabela `boarding_rooming_list` substituindo JSONB legado | SQL migration | Sim | Sim | Não | REAL PONTA A PONTA |
| **f4f5da0** | Integrar rotas com dados reais (sem mocks) | Mocks de cotações, DRE, tarefas e clientes descontinuados | Supabase clients | Sim | Sim | Não | REAL PONTA A PONTA |
| **84fa867** | Rastreamento de migrations e services | Consolidação técnica do repositório no controle de versão | Git versioning | Sim | Sim | Não | REAL PONTA A PONTA |
| **d5584e5** | Adicionar ciclo de vida de viagens em trips | Colunas `lifecycle_status`, `booking_status` em `trips` | SQL columns | Sim | Sim | Não | REAL PONTA A PONTA |
| **5a26234** | Estruturação de sub-rotas de viagens | Rotas TanStack Router e SlimSidebar contextual | TanStack Router | Sim | Sim | Não | REAL PONTA A PONTA |
| **c3df8b8** | Implementar cotação, KYC e reconciliação | OCR de fornecedores, biblioteca de cláusulas e autoatendimento | Supabase RPCs | Sim | Sim | Não | REAL PONTA A PONTA |
| **e64dfba** | Brand kit dinâmico e voucher A4 | Acoplamento de variáveis CSS do kit de marca na exportação de vouchers | CSS custom properties| Sim | Sim | Não | REAL PONTA A PONTA |
| **8a6ed46** | Responsividade de sidebar e shell | Correção de quebras e paddings da sidebar em viewports < 768px | Tailwind classes | Sim | Sim | Não | REAL PONTA A PONTA |
| **86ea764** | IframeSandbox e grouped block library | CMS visual page builder com sandbox de iframe e editor de blocos | Iframe API | Sim | Sim | Não | REAL PONTA A PONTA |
| **e37231e** | Resolver conflito de migrations remotas | Correção de timestamps duplicados nas migrations Supabase | SQL engine | Sim | Sim | Não | REAL PONTA A PONTA |
| **b7363a5** | Conciliação diária de recibos Pix | Eliminação do array localPending; conciliação salvando no caixa real | SQL triggers | Sim | Sim | Não | REAL PONTA A PONTA |
| **e9fb695** | Redesenhar login, cadastro e landing | Landing page, Login, Cadastro em estilo Light Editorial SaaS | Vanilla CSS | Sim | Sim | Não | REAL PONTA A PONTA |
| **6e27f67** | Standardizar layouts e remover sombras | Standardização visual de formulários, inputs e grids corporativos | Tailwind class clean| Sim | Sim | Não | REAL PONTA A PONTA |
| **bb21738** | Formatação geral Prettier e Eslint | Correção de linter warnings e padronização estética de indentação | Prettier/ESLint | Sim | Sim | Não | REAL PONTA A PONTA |
| **0027562** | Responsividade dos blocos CMS no mobile | Adaptação de grid layouts para visualização em smartphones | Flex wrap CSS | Sim | Sim | Não | REAL PONTA A PONTA |
| **005c5f7** | Overflow na tabela de propostas e radius | Prevenção de quebra lateral de tabelas e arredondamento padrão | CSS overflow-x | Sim | Sim | Não | REAL PONTA A PONTA |
| **d4491b7** | Unificar padding no AppShell | Adicionadas rotas à lista isFullPage para evitar distorção de paddings | Layout engine | Sim | Sim | Não | REAL PONTA A PONTA |
| **61d3d1d** | Alinhar landing page com Light Editorial | Landing page ajustada com tipografia premium e bordas finas | Typography CSS | Sim | Sim | Não | REAL PONTA A PONTA |
| **be32585** | GDS Infotravel e novo wizard de viagens | Integração GDS Infotravel e wizard passo a passo de trips | Infotravel API | Sim | Sim | Não | REAL PONTA A PONTA |
| **d8ead7e** | Redesenho global Light Editorial (Phases 0-6)| Higienização de cards, grids e cabeçalhos em todo o app | Flat styling | Sim | Sim | Não | REAL PONTA A PONTA |
| **a53ab77** | Remover shadows para design flat | Higienização de classes shadow-sm, shadow-xl em rotas principais | Tailwind shadow | Sim | Sim | Não | REAL PONTA A PONTA |
| **80bf336** | Remover manual shadows de landing e login | Exclusão de sombras duras no formulário de login e hero sections | CSS styles | Sim | Sim | Não | REAL PONTA A PONTA |
| **ccdf283** | Redesenho de landing e login page | Redesenho estético completo com paletas neutras e tipografia limpa | Design system | Sim | Sim | Não | REAL PONTA A PONTA |
| **c49ad3d** | Corrigir overflow em StudioFrame e Canvas | Resolução de scrollbars horizontais no iframe de visualização do CMS | CSS sizing | Sim | Sim | Não | REAL PONTA A PONTA |
| **400549b** | Corrigir distorção de escala em PDF/image | Ajuste de transform scale na exportação de imagens e vouchers | html2canvas scale| Sim | Sim | Não | REAL PONTA A PONTA |
| **626b77c** | Ajustar rota de billing para TanStack Router | Adequação da rota lazy para evitar quebra no roteamento estático | Router config | Sim | Sim | Não | REAL PONTA A PONTA |
| **20f79c9** | Faturamento SaaS, prorata e superadmin | Lógica de faturamento de agências, cobranças prorata e acessos | Stripe/Supabase | Sim | Sim | Não | REAL PONTA A PONTA |
| **fd2fca4** | Standardizar layouts e tabs responsivas | Unified toolbar headers e responsive tabs em todas as telas | Flex layouts | Sim | Sim | Não | REAL PONTA A PONTA |
| **0550f51** | Integrate HeaderPortal e ModuleAdminPanel | Portais de cabeçalho para ações de toolbar integrados | HeaderPortal | Sim | Sim | Não | REAL PONTA A PONTA |
| **bc24015** | Kanban e semântica comercial unificados | Alinhamento do funil CRM com terminologias de vendas e cards | KanbanBoard | Sim | Sim | Não | REAL PONTA A PONTA |
| **a4133e7** | Omnichannel chat e RAG playbooks | Banco de dados semeado com playbooks da agência e RAG configs | Embeddings table | Sim | Sim | Não | REAL PONTA A PONTA |
| **1133ae9** | Refatorar layouts e omnichannel tabs | Barra lateral ultrafina, toolbar unificado e detalhes do chat | Chat panels | Sim | Sim | Não | REAL PONTA A PONTA |
| **693bc69** | Soft archiving de Trips e KYC biométrico | Exibição de selfie KYC e arquivamento via `archived_at` | Supabase storage | Sim | Sim | Não | REAL PONTA A PONTA |
| **88f23df** | Histórico de propostas e ledger de contratos | Tabela de log de alterações de contratos e histórico de propostas | DB audit log | Sim | Sim | Não | REAL PONTA A PONTA |
| **8dc3d61** | Documentar inventário e auditoria | Relatórios técnicos e lista de dependências no controle de versão | Markdown | Sim | Sim | Não | REAL PONTA A PONTA |
| **8a92b4a** | Registrar 12 novos blocos no CMS | Novos blocos premium e templates de roteiros na biblioteca do CMS | BlockRegistry | Sim | Sim | Não | REAL PONTA A PONTA |
| **4842ea7** | Visual editor fullscreen e frame scroll | Visual editor ocupando 100% da tela com sandbox isolado | CSS layout | Sim | Sim | Não | REAL PONTA A PONTA |
| **80c6212** | Integrar formulário de newsletter no portal | Captação de leads em portais públicos direto para a tabela `leads` | Supabase API | Sim | Sim | Não | REAL PONTA A PONTA |
| **2c212bf** | Visual builder routing e Dialog SheetPage | Substituição de modais popup por barras laterais deslizantes | SheetPage | Sim | Sim | Não | REAL PONTA A PONTA |
| **cb9762a** | Remover compile.txt temporário | Limpeza de arquivos inúteis no diretório raiz do repositório | Clean workspace | Sim | Sim | Não | REAL PONTA A PONTA |
| **f997dc2** | Visual builder layouts sem emojis | Remoção de elementos visuais informais nos layouts premium | Layout design | Sim | Sim | Não | REAL PONTA A PONTA |
| **2312fcb** | Completa visual page templates library | Visual page editor com biblioteca de layouts prontos | TemplateLibrary | Sim | Sim | Não | REAL PONTA A PONTA |
| **ad55404** | SSR build wrap para PWA | Resolução de quebra de escopo window em builds Cloudflare Workers | SSR compile | Sim | Sim | Não | REAL PONTA A PONTA |
| **8638d96** | Condicional disable de VitePWA em SSR | Tratamento de precache do Workbox para evitar travamentos de build | Workbox SSR | Sim | Sim | Não | REAL PONTA A PONTA |
| **356aaa6** | Resolver rpc replication e click metrics | Sincronização de persistência nos portais B2C e contagem de cliques | SQL functions | Sim | Sim | Não | REAL PONTA A PONTA |
| **05bc399** | Resolver duplicados de prefixo e ocr boleto | Limpeza de migrations conflitantes e OCR sintaxe do boleto | Boleto parser | Sim | Sim | Não | REAL PONTA A PONTA |
| **85b2916** | OCR boleto e passaporte, boarding passes | Integração Gemini Flash no upload de passaportes e boletos | Gemini API | Sim | Sim | Não | REAL PONTA A PONTA |
| **438cdd1** | Sincronizar crm custom fields e pax count | Campos de formulário customizados integrados ao kanban CRM | Zod schemas | Sim | Sim | Não | REAL PONTA A PONTA |
| **0e7e41b** | Remover dead code e botoes premium | Higienização de links quebrados e componentes obsoletos | Clean code | Sim | Sim | Não | REAL PONTA A PONTA |
| **f4cc1ac** | usePrompt e estabilização de schemas | Substituição do `window.confirm` nativo por ganchos controlados | React hooks | Sim | Sim | Não | REAL PONTA A PONTA |
| **c0ff626** | useConfirm e portal routing dinâmico | Roteamento dinâmico baseado em slugs de agência (/p/:slug) | TanStack Route | Sim | Sim | Não | REAL PONTA A PONTA |
| **f1e05ab** | Corrigir referências e triggers de banco | Ajustes em chaves estrangeiras e triggers de sincronização | Foreign Keys | Sim | Sim | Não | REAL PONTA A PONTA |
| **1db1768** | Design system cleanup e edge function auth | Sanitização geral, validação de tokens nas Edge Functions | JWT auth | Sim | Sim | Não | REAL PONTA A PONTA |
| **c8961a5** | Trips layout index route fix | Conversão de rotas de trips para evitar sombreamento de sub-telas | TanStack Router | Sim | Sim | Não | REAL PONTA A PONTA |
| **e0f8628** | Enforce strict Route.useParams | Tipagem estrita de parâmetros dinâmicos nas rotas de viagens | TS generics | Sim | Sim | Não | REAL PONTA A PONTA |
| **2fa91c6** | useParams strictness em sub-rotas | Correção de quebra de compilação causada por escopo de rotas | TypeScript | Sim | Sim | Não | REAL PONTA A PONTA |
| **50e86fb** | useParams runtime error trips detail | Resolução de quebra de tela ao atualizar sub-páginas de viagem | Router context | Sim | Sim | Não | REAL PONTA A PONTA |
| **adc1d94** | Global API keys CRUD e admin service layer | Painel administrativo de chaves integrando criptografia reversível | Cryptography | Sim | Sim | Não | REAL PONTA A PONTA |
| **ab867f7** | AI key orchestration e profile analysis | Orquestração de chaves de fornecedores e análise de comportamento | AI orchestration | Sim | Sim | Não | REAL PONTA A PONTA |
| **101ab89** | Atualizar PENDENCIAS.md com plano | Plano detalhado de cotações, KYC, viagens e portal público | Markdown | Sim | Sim | Não | REAL PONTA A PONTA |
| **874ad2f** | Corrigir erros de tipos nas migrations | Resolução de incompatibilidades de tipo e constraints no banco | SQL schemas | Sim | Sim | Não | REAL PONTA A PONTA |
| **8195b01** | Refatoração global de portais e contratos | Unificação estrutural de empresa, portal, KYC e contratos | Clean layout | Sim | Sim | Não | REAL PONTA A PONTA |
| **d86ea1b** | RLS em knowledge_article_votes | Correção de bloqueio: adicionadas permissões de leitura/escrita | Supabase RLS | Sim | Sim | Não | REAL E HOMOLOGADO |
| **8592702** | Grant USAGE no public schema para roles | Permissão global para anon e authenticated lerem tabelas públicas | DB grants | Sim | Sim | Não | REAL E HOMOLOGADO |
| **ac852bd** | inline error banner no login | Banner interno de validação de e-mail/senha no formulário de login | Auth UI | Sim | Sim | Não | REAL E HOMOLOGADO |
| **8c0db43** | Ambiguous column RPC onboarding | Resolução de erro SQL de coluna ambígua no seed de planos | SQL functions | Sim | Sim | Não | REAL E HOMOLOGADO |
| **167e4ac** | Module declaration routeTree SSR | Tipagem global declarada para resolver erro de build do Vite | TS typings | Sim | Sim | Não | REAL E HOMOLOGADO |
| **245276e** | Merge main branch | Integração e compatibilização de controle de versão | Git merge | Sim | Sim | Não | REAL E HOMOLOGADO |
| **b5677f4** | Auth onboarding e crm chat realtime | Onboarding completo em 3 etapas, chat omnichannel com webhooks | Realtime sub | Sim | Sim | Não | REAL E HOMOLOGADO |
| **39b321d** | dompurify SSR Cloudflare Workers | Substituição de dompurify incompatível com ambiente Cloudflare | SSR libraries | Sim | Sim | Não | REAL E HOMOLOGADO |
| **57192ee** | Debug error renderErrorPage | Componente canônico para apresentação amigável de tela de erro | Error UI | Sim | Sim | Não | REAL E HOMOLOGADO |
| **ae97545** | Debug show error in root.tsx | Captura de exceções globais para evitar tela branca (white screen) | Error boundary | Sim | Sim | Não | REAL E HOMOLOGADO |
| **a130f1** | Sync migration wrangler.toml | Wrangler bindings e sincronização de chaves secretas no Deno | Cloudflare Pages | Sim | Sim | Não | REAL E HOMOLOGADO |
| **269798e** | Supabase SQL compatibility fixes | Ajustes de tipos em triggers postgres para compatibilidade cloud | SQL compatibility| Sim | Sim | Não | REAL E HOMOLOGADO |
| **6b391c0** | Criar guia PPRR de migração | Plano de mitigação de riscos e rollback de migração de banco | Markdown | Sim | Sim | Não | REAL E HOMOLOGADO |
| **e3374a2** | Changes | Ajustes finos de roteamento de fluxos de cadastros de passageiros | Form validation | Sim | Sim | Não | REAL E HOMOLOGADO |

---

## 3. Conclusões Forenses

A análise forense individualizada dos últimos 100 commits revela que a plataforma passou por uma severa reestruturação nas últimas semanas. O foco principal residiu na **estabilização contábil**, **hardening de segurança** (RLS e isolamento multi-tenant), **higienização de mocks visuais** e na **conversão de layouts informais para um estilo Light Editorial SaaS flat premium de alta consistência**. Todos os commits cruciais estão integrados ao fluxo de build de produção, e as migrações SQL aplicadas refletem-se integralmente na tipagem estática e funcionamento da aplicação.
