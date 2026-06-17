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

**Status: Pendente (A Implementar - Fase Futura)**

O Builder de Cotações receberá automação por IA para preenchimento de propostas enviadas por fornecedores via PDF/OCR, além de refinamentos de exportação.

- [ ] **Fluxo de "Criação de Cotação via PDF + OCR":**
  - [ ] Drag-and-drop de PDFs de fornecedores (operadoras, hotéis).
  - [ ] Envio para Edge Function Vision (`ocr-proposal-processor`).
  - [ ] Parse JSON estruturado para autopreencher campos obrigatórios.
- [ ] **Evoluções no Banco de Dados:**
  - [ ] Adicionar flag `is_public_template` na tabela `proposals`.
  - [ ] Permitir cotações avulsas sem vinculação obrigatória a um lead.
- [ ] **Ajustes de PDF e Apresentação Landscape:**
  - [ ] Corrigir renderização horizontal de `TemplateLandscape.tsx` para exportações A4 horizontal e web.

---

## 🧠 2. Super IA no Omnichannel (Agentes Autônomos)

**Status: Pendente (A Implementar - Fase Futura)**

Transformar o assistente de chat em um agente de IA ativo com capacidade de Tool Use integrado ao painel.

- [ ] **Function Calling no Chat:**
  - [ ] Trigger automático para gerar links de cotações e enviá-los no WhatsApp via Waba (Omnichannel).
  - [ ] Agendamento de follow-ups automáticos inserindo dados diretamente no `lead_activities` com triggers cron.
- [ ] **Prompts Avançados:**
  - [ ] Configuração de personas de IA configuráveis (Foco em Vendas vs. Foco em Suporte) através de `agencies.integrations_config.ai_context`.

---

## 📜 3. Gestão Avançada de Contratos e KYC

**Status: Pendente (A Implementar - Fase Futura)**

Evolução do ecossistema de contratos com validade jurídica de alto nível, segurança e imutabilidade física.

- [ ] **Pós-Assinatura Premium:**
  - [ ] Download de pacote jurídico em `.ZIP` (Contrato PDF + Logs imutáveis + Selfie de autenticação).
- [ ] **Tracking Comportamental:**
  - [ ] Monitoramento avançado em `contract_audit_chain` (logs de visualização, tempo de leitura, scroll).
- [ ] **KYC e Autenticação Biométrica:**
  - [ ] Verificação de Selfie comparativa com documento antes da assinatura móvel (`m.contract.$token`).
- [ ] **Imutabilidade e Adendos:**
  - [ ] Impossibilitar modificações do contrato original. Qualquer alteração gera um novo registro em `contract_addendums` com aceite obrigatório das partes.

---

## 🛫 4. Revolução no Módulo de Viagens (Trips/Boarding)

**Status: Pendente (Melhorias Finais - Fase Futura)**

Refatorações finas no pós-venda para otimização da emissão e compartilhamento.

- [ ] **Wizard de Viagens:**
  - [ ] Refinar fluxos secundários de `NewTripWizard.tsx`.
- [ ] **Ações do Menu:**
  - [ ] Implementar as opções rápidas "Duplicar Pacote de Viagem" e "Arquivar" nos dots menus das viagens.

---

## 🌐 5. Portal Builder: O CMS Simplificado e Estruturado

**Status: Visual Concluído / Blocos Funcionais Pendentes**

- [x] Redesign visual completo dos construtores de páginas e settings.
- [ ] **Biblioteca de Blocos Adicionais:**
  - [ ] Implementar novos blocos de seções pré-moldadas de alto impacto visual (Ex: "Galeria de Roteiros Premium", "Depoimentos Dinâmicos", "FAQ Accordion", "Hero de Inverno").
- [ ] **Desempenho SEO:**
  - [ ] Garantir carregamento assíncrono e renderização ultra-rápida de componentes dinâmicos em `p.$agency_slug.index.tsx` a partir de `portal_pages`.
