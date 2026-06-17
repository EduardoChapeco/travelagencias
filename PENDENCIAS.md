# Master Plan de Evolução e Pendências — TravelOS

Este documento serve como inventário detalhado e planejamento técnico para as próximas fases de evolução sistêmica e controle de auditoria de alterações.

---

## 🎨 0. Redesign Global: Estilo Light Editorial SaaS (CONCLUÍDO)

**Status: 100% Concluído & Homologado**

Implementamos a reformulação visual completa da plataforma TravelOS para o novo estilo visual premium (Light Editorial SaaS), garantindo conformidade total de tipografia fluida, eliminação de sombras e border-radii consistentes em todos os módulos core.

- [x] **Fase 0: Inventário** (Mapeamento de rotas e regressões na tabela de auditoria)
- [x] **Fase 1: Design System & CSS Tokens** (Cores, fontes fluidas, botões e campos no `form.tsx`)
- [x] **Fase 2: Layout Global & Shell** (Sidebar ultrafina 56px, ícones centralizados e tooltips)
- [x] **Fase 3: Pacotes / Roteiros** (Ajuste de cards e grids para 17px/rounded)
- [x] **Fase 4: Construtor de Páginas & Portal** (Visual Editor, listagem de páginas e Portal Settings)
- [x] **Fase 5: CRM Funnel & Propostas** (Kanban de Leads, NewLeadSheet e lista de Cotações)
- [x] **Fase 6: Dashboard, Boarding Radar, Clientes & Marca** (Painel de comando, colunas/cartões de embarque, base de clientes, detalhes de perfil e Kit de Marca)
- [x] **Verificação de Compilação:** Compilação TypeScript executada com sucesso (`tsc --noEmit` sem erros).

---

## 🤖 1. Módulo de Cotações Avançadas e IA (Builder)
 
**Status: 100% Concluído & Homologado**
 
O Builder de Cotações possui automação por IA para preenchimento de propostas enviadas por fornecedores via PDF/OCR, além de flexibilidade relacional no banco.
 
- [x] **Fluxo de "Criação de Cotação via PDF + OCR":**
  - [x] Drag-and-drop de PDFs de fornecedores (operadoras, hotéis).
  - [x] Envio para Edge Function Vision (`processOcrFile`).
  - [x] Parse JSON estruturado para autopreencher campos obrigatórios.
- [x] **Evoluções no Banco de Dados:**
  - [x] Adicionar flag `is_public_template` na tabela `proposals`.
  - [x] Permitir cotações avulsas sem vinculação obrigatória a um lead.
- [x] **Ajustes de PDF e Apresentação Landscape:**
  - [x] Corrigir renderização horizontal de `TemplateLandscape.tsx` para exportações A4 horizontal e web.

---

## 🧠 2. Super IA no Omnichannel (Agentes Autônomos)

**Status: 100% Concluído & Auditado**

Transformamos o assistente de chat em um agente de IA ativo com capacidade de Tool Use integrado ao painel e triggers de banco.

- [x] **Function Calling no Chat:**
  - [x] Trigger automático para gerar links de cotações e enviá-los no WhatsApp via Waba (Omnichannel).
  - [x] Agendamento de follow-ups automáticos inserindo dados diretamente no `lead_activities` com triggers cron.
- [x] **Prompts Avançados:**
  - [x] Configuração de personas de IA configuráveis (Foco em Vendas vs. Foco em Suporte) através de `agencies.integrations_config.ai_context` e `ai_persona`.

---

## 📜 3. Gestão Avançada de Contratos e KYC

**Status: 100% Concluído & Auditado**

Evolução do ecossistema de contratos com validade jurídica de alto nível, segurança e imutabilidade física.

- [x] **Pós-Assinatura Premium:**
  - [x] Download de pacote jurídico em `.ZIP` (Contrato PDF + Logs imutáveis + Selfie de autenticação).
- [x] **Tracking Comportamental:**
  - [x] Monitoramento avançado em `contract_audit_chain` (logs de visualização, tempo de leitura, scroll).
- [x] **KYC e Autenticação Biométrica:**
  - [x] Verificação de Selfie comparativa com documento antes da assinatura móvel (`m.contract.$token`).
- [x] **Imutabilidade e Adendos:**
  - [x] Impossibilitar modificações do contrato original. Qualquer alteração gera um novo registro em `contract_addendums` com aceite obrigatório das partes (chancelado por trigger `contracts_immutable_after_signed_trg`).

---

## 🛫 4. Revolução no Módulo de Viagens (Trips/Boarding)

**Status: Melhorias Aplicadas ✅**

Refatorações finas no pós-venda para otimização da emissão e compartilhamento.

- [x] **Wizard de Viagens:**
  - [x] Refinar fluxos secundários de `NewTripWizard.tsx`.
- [x] **Ações do Menu:**
  - [x] Opção "Duplicar Pacote de Viagem" implementada via RPC `duplicate_trip`.
  - [x] Opção "Arquivar / Desarquivar" implementada via campo `archived_at`.

---

## 🌐 5. Portal Builder: O CMS Simplificado e Estruturado

**Status: 100% Concluído & Auditado**

- [x] Redesign visual completo dos construtores de páginas e settings.
- [x] **Biblioteca de Blocos Adicionais:**
  - [x] Implementar novos blocos de seções pré-moldadas de alto impacto visual (Ex: "Galeria de Roteiros Premium", "Depoimentos Dinâmicos", "FAQ Accordion", "Hero de Inverno") - suportados pela biblioteca integrada em `NewSectionsRenderer.tsx`.
- [x] **Desempenho SEO:**
  - [x] Garantir carregamento assíncrono e renderização ultra-rápida de componentes dinâmicos em `p.$agency_slug.index.tsx` a partir de `portal_pages`.
