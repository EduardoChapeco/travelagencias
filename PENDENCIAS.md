# Master Plan de Evolução e Pendências — TravelOS

Este documento é o inventário detalhado e planejamento técnico para as próximas fases de implementação e evolução sistêmica, focado na reformulação completa de módulos chave, arquitetura imutável de contratos, construtores guiados por IA e fluxos omnichannel avançados.

---

## 🤖 1. Módulo de Cotações Avançadas e IA (Builder)

**Status: A Implementar (Fase 3/5)**

**Visão Geral:** O atual Builder de Cotações receberá uma injeção de automação. Ao invés do agente digitar campo a campo as cotações que os fornecedores enviam por PDF, a IA fará o preenchimento automático. O sistema de templates será rigorosamente revisado para garantir um design premium e responsivo (especialmente as apresentações em 16:9).

- **Fluxo de "Criação de Cotação via PDF + OCR":**
  - **Upload/Drag-and-Drop:** Nova área na interface de propostas para subir PDFs de orçamentos (Ex: orçamentos de operadoras, hotéis).
  - **Pipeline OCR / Edge Function:** O arquivo será processado por uma Edge Function focada em Vision (`ocr-proposal-processor`).
  - **Parse Json & Auto-Preenchimento:** Uma IA interpretará os textos extraídos e estruturará em um JSON padronizado com campos obrigatórios (`title`, `price`, `dates`, `description`, `images_urls`). A página preencherá o formulário do Builder automaticamente.
- **Melhorias Estruturais no Builder e Banco de Dados:**
  - **Tabelas Afetadas:** Adição de flag de visibilidade na tabela `proposals` (ex: `is_public_template` ou `linked_lead_id`).
  - **Gestão de Cotações:** Cotações deverão poder ser "Avulsas" (para link público geral sem estar vinculada a um lead) e possuir controles robustos de visualização/rastreio.
  - **Correção de Templates:** Auditoria total no frontend do componente `TemplateLandscape.tsx` para assegurar a renderização horizontal no PDF (`@page { size: A4 landscape }`) e exibição de apresentação web, removendo a impressão vertical com bugs visuais.
  - **CRUD Completo:** Melhorar a listagem com opções definitivas e visíveis de: Duplicar Cotação, Apagar, Histórico de Edições.

---

## 🧠 2. Super IA no Omnichannel (Agentes Autônomos)

**Status: A Implementar**

**Visão Geral:** A IA no chat (WhatsApp/Web) deixará de ser apenas um "Assistente que gera respostas de texto" para se tornar um agente com capacidade de **Tool Use** (chamada de funções/ações) dentro do painel da agência.

- **Automações "Pre-Moldadas" (Function Calling):**
  - A IA analisará a intenção do Lead. Se o cliente concordar com o roteiro, a IA dispara automaticamente o trigger: `Gerar Link de Cotação XYZ` e envia o link direto no WhatsApp via Waba (Omnichannel).
  - A IA poderá agendar follow-ups (CRONs/Triggers). Exemplo: o humano diz na thread interna "Me lembre de ligar para ele quinta-feira", e a IA salva no `lead_activities` para disparar notificação push na quinta.
- **Prompt Frameworks Ultra Completos:**
  - O prompt base de contexto (`agencies.integrations_config.ai_context`) será expandido para ser configurável por "Personas de Atendimento" (foco em conversão, foco em retenção).

---

## 📜 3. Gestão Avançada de Contratos e KYC (Fase 8)

**Status: A Implementar**

**Visão Geral:** Transformar a "Lista de Contratos" em um ecossistema complexo com validade jurídica de alto nível, assinaturas multicanal, imutabilidade com hash e verificação de identidade anti-fraude.

- **Página Pós-Assinatura (Validação Jurídica):**
  - Ao finalizar a assinatura, o cliente é direcionado para uma página com opção de **Baixar Contrato (.PDF)** e **Baixar Pacote Jurídico (.ZIP)** contendo: o contrato assinado, logs imutáveis detalhados e arquivos de validação biométrica.
- **Tracking Comportamental do Cliente:**
  - Dashboard do contrato mostrando não só o status, mas metadados profundos: Quem falta assinar? Cliente abriu o contrato? Chegou a ler (scrollou até o fim)? Tudo guardado em `contract_audit_chain`.
- **KYC (Know Your Customer) e Autenticação Visual:**
  - Na tela móvel de assinatura (`m.contract.$token`), forçar ou oferecer opção de autenticação via Selfie / Vídeo em tempo real comparando a face com o documento em anexo antes de destravar o botão "Assinar".
- **Imutabilidade (Logs Estilo Blockchain):**
  - O contrato original assinado não pode ser alterado sob NENHUMA circunstância.
  - Qualquer erro ou mudança entra como **Adendo**, que reabre o fluxo de notificações para ambas as partes precisarem dar "Aceite Eletrônico" naquele complemento.
  - Criação de `contract_addendums` e hashes imutáveis por versão em banco de dados usando triggers SQL que bloqueiam o comando `UPDATE` direto e só permitem `INSERT` de novos hashes.

---

## 🛫 4. Revolução no Módulo de Viagens (Trips/Boarding)

**Status: A Implementar (Refatoração de Bugs Atuais)**

**Visão Geral:** O botão "Criar Viagem" atual é rudimentar e falho. O módulo inteiro precisa ser polido para se tornar uma vitrine técnica da operação.

- **Revisão do CRUD e Lógicas de Negócio:**
  - Fazer funcionar corretamente a criação via Wizard (`NewTripWizard.tsx`).
  - Criar opções avançadas nos Menus/Dots: `Editar Completo`, `Duplicar Pacote de Viagem`, `Arquivar`.
- **Webview de Viagem:**
  - Visão interativa da viagem para envio ao cliente (painel pré-embarque unificado com o Boarding).

---

## 🌐 5. Portal Builder: O CMS Simplificado e Estruturado

**Status: A Implementar (Revisão Pós-Unificação)**

**Visão Geral:** Corrigir a sobreposição/confusão entre os módulos "Portal", "Brand" e "Minha Empresa", centralizando tudo em uma tecnologia de construtor de páginas por blocos (semelhante a ferramentas premium de landing page, mas com layout padronizado engessado).

- **Integração do Novo Builder:**
  - Tabela implementada `portal_settings` já é a base.
  - A ideia **NÃO** é personalização drag-and-drop livre absoluta, mas sim adicionar "Seções pré-prontas" (ex: "Galeria de Roteiros Premium", "Depoimentos Dinâmicos", "FAQ Accordion", "Hero de Inverno").
  - O usuário seleciona o layout do bloco e preenche imagens/texto no Sidebar, e o painel reflete o preview mantendo o design ultra rigoroso e estético do sistema.
  - O site agência (`p.$agency_slug.index.tsx`) consumirá a rota `portal_pages` e `portal_settings` para plotar esses componentes iterando via loop (ex: `<BlockRenderer block={block} />`), garantindo altíssima performance SEO.

---

**Prioridade de Execução (Próximos Passos):**

1. Consolidar as tabelas e tipagens do Portal Builder.
2. Refatorar os erros básicos do Módulo Viagens para destravar a agência.
3. Iniciar o desenvolvimento da Edge Function de OCR + UI de Cotações Inteligentes.
4. Finalizar UX do Smart Contratos com KYC e Logs zipados.
