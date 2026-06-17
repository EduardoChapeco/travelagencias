# Inventário do Sistema Atual: TravelOS

Este documento serve como a **Fase 0** do PRD de Redesign global da plataforma TravelOS/VoyageOS. Ele detalha todas as rotas públicas, privadas, componentes estruturais, formulários e fluxos para garantir a compatibilidade total e evitar regressões.

---

## 1. Rotas Públicas & Portais do Cliente

São as rotas visíveis aos viajantes e clientes finais. O redesign visual deve garantir que o visual siga as cores e tipografia da marca da agência de forma limpa e otimizada para dispositivos móveis:

- **Páginas Institucionais (Dynamic/CMS):**
  - `src/routes/p.$agency_slug.index.tsx` - Landing page inicial da agência (vitrine de pacotes, depoimentos, contato).
  - `src/routes/p.$agency_slug.$page_slug.tsx` - Páginas institucionais dinâmicas configuradas via Site Builder.
  - `src/routes/p.$agency_slug.blog.$slug.tsx` - Detalhe do artigo do blog.
  - `src/routes/p.$agency_slug.contact.tsx` - Página de contato institucional com formulário de interesse.
- **Bancos de Conhecimento e Suporte:**
  - `src/routes/p.$agency_slug.kb.index.tsx` e `p.$agency_slug.kb.$slug.tsx` - Central de Ajuda e playbooks públicos.
- **Páginas de Detalhes de Produtos:**
  - `src/routes/p.$agency_slug.tour.$id.tsx` - Detalhes do pacote/excursão em grupo com cronograma e inclusões.
  - `src/routes/p.$agency_slug.visa.$id.tsx` - Detalhes de exigências de vistos consulares.
- **Portais e Links Compartilháveis com Clientes (Módulos Rápidos `/m/`):**
  - `src/routes/m.proposal.$token.tsx` - Preview público da proposta/cotação enviada ao cliente.
  - `src/routes/m.contract.$token.tsx` - Assinatura digital do contrato de prestação de serviços.
  - `src/routes/m.payment.$token.tsx` - Portal de conciliação de faturas e upload de comprovantes de pagamento.
  - `src/routes/m.passenger.$token.tsx` - Link para preenchimento de dados de passageiros e upload de fotos de documentos (passaporte/RG).
  - `src/routes/m.checkin.$token.tsx` - Check-in do passageiro integrado ao localizador/PNR.
  - `src/routes/client.trips.tsx` e `client.trips.$id.tsx` - Portal logado do cliente para acompanhamento de viagens compradas.

---

## 2. Rotas Administrativas SaaS (Painel do Operador)

As telas utilizadas pelos agentes de viagens e administradores para gerenciar o ecossistema.

- **Dashboard & Operação Core:**
  - `src/routes/agency.$slug.index.tsx` - Dashboard principal de vendas, metas e alertas diários.
  - `src/routes/agency.$slug.crm.tsx` - Funil de Vendas (Kanban de Leads).
  - `src/routes/agency.$slug.crm.$lead_id.tsx` - Tela detalhada do Lead com painel lateral (SheetPage) e abas de roteiro e histórico.
  - `src/routes/agency.$slug.clients.tsx` - Lista de viajantes cadastrados.
  - `src/routes/agency.$slug.clients.$id.tsx` - Perfil de cliente, acompanhantes e histórico de compras.
- **Gestão de Operações de Viagens:**
  - `src/routes/agency.$slug.group-tours.tsx` - Lista de excursões de grupo.
  - `src/routes/agency.$slug.group-tours.$id.tsx` - Painel de controle da excursão: lista de passageiros, rooming list, mapa de assentos do ônibus virtual.
  - `src/routes/agency.$slug.boarding.tsx` - Kanban de status de embarques.
  - `src/routes/agency.$slug.trips.index.tsx` e `agency.$slug.trips.$id.*.tsx` - Controle do pós-venda, emissão de vouchers, uploads de apólices e controle financeiro da viagem.
- **Cotações, Vendas e Assinaturas:**
  - `src/routes/agency.$slug.proposals.index.tsx` - Lista de orçamentos gerados.
  - `src/routes/agency.$slug.proposals.$id.tsx` - Editor interativo (Studio Builder) da proposta.
  - `src/routes/agency.$slug.proposals.$id.preview.tsx` - Visualizador pré-PDF da proposta.
- **Financeiro Integrado:**
  - `src/routes/agency.$slug.financial.tsx` - Visão geral financeira.
  - `src/routes/agency.$slug.financial.cash.tsx` - Fluxo de caixa de entradas e saídas.
  - `src/routes/agency.$slug.financial.dre.tsx` - Demonstrativo de Resultado de Exercício (DRE) com comissões de operadoras e splits de agentes.
- **Comunicação e IA:**
  - `src/routes/agency.$slug.omnichannel.tsx` - Central de atendimento multicanal integrada (WhatsApp, Chats).
  - `src/routes/agency.$slug.knowledge.tsx` - Playbooks internos de cancelamentos e procedimentos.
- **Configurações e Configurações de Identidade Visual:**
  - `src/routes/agency.$slug.brand.tsx` - Editor de identidade visual e logo (sobrescreve variáveis do tema).
  - `src/routes/agency.$slug.settings.tsx` - Ajustes gerais de domínio e segurança.

---

## 3. Componentes Estruturais UI

O coração do design system reside em componentes reutilizáveis definidos globalmente:

1.  **AppShell & AppSidebar (`src/components/shell/`)**:
    - `AppShell.tsx` - Container de tela com as dimensões de cabeçalho (`--header-h`).
    - `AppSidebar.tsx` - Barra lateral fina com transições de recolhimento (`thin-collapsible-sidebar`).
2.  **Form & Visuals (`src/components/ui/form.tsx`)**:
    - `Field` - Label superior, hint inferior e validação de erros.
    - `Input`, `Select`, `Textarea` - Componentes sem sombras, com cantos arredondados finos e bordas do sistema.
    - `PrimaryButton`, `GhostButton` - Botões com transição de cor baseados na marca (`--color-brand`).
    - `StatusBadge` - Badges minimalistas neutras, verdes, amarelas, azuis e vermelhas para status.

---

## 4. Estrutura de Dados & Persistência (Supabase)

O redesign **NÃO** modificará nomes de tabelas, constraints de integridade nem RLS existentes. Manteremos compatibilidade nativa com:

- `agencies` e `agency_profiles`
- `leads` e `lead_interests`
- `clients`
- `group_tours` e `bus_layouts`
- `bookings`
- `contracts` e `contract_public_logs`
- `proposals` e `vouchers`

---

## 5. Riscos e Recomendações de Segurança

1.  **Modais/Sheets:** Assegurar que ao converter elementos no CRM e Kanban para painéis laterais (`SheetPage`), as variáveis de estados não re-renderizem campos abertos de forma a apagar dados digitados.
2.  **Geração de PDF (Propostas/Contratos):** O motor de PDF depende de estilos estáticos. Não remover classes usadas por bibliotecas como `html2canvas` ou `jspdf`.
3.  **Inputs do Select/Combobox:** Manter a propriedade `ref` encapsulada via `React.forwardRef` nos componentes de formulário para evitar quebras em formulários que utilizam `react-hook-form`.
