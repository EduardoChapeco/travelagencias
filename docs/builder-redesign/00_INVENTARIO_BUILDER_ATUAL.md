# Inventário do Builder Atual — TravelAgencias

Este documento apresenta o inventário minucioso e a auditoria técnica de toda a estrutura, componentes, botões, inputs e blocos do editor/builder da plataforma TravelAgencias.

---

## 1. Estrutura do Editor

### 1.1 Rotas do Editor
* **Editor de Páginas / Site / Biolink**: [agency.$slug.portal.pages.$page_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.$page_id.tsx) (Privado/Autenticado).
* **Listagem de Páginas**: [agency.$slug.portal.pages.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.index.tsx) (Privado/Autenticado).
* **Editor de Propostas (Proposal Studio)**: [agency.$slug.proposals.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.$id.tsx) (Privado/Autenticado).
* **Editor de Vouchers (Voucher Studio)**: [agency.$slug.trips.$id.vouchers.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.vouchers.tsx) (Privado/Autenticado).
* **Editor de Contratos (Contract Editor)**: [agency.$slug.trips.$id.contract.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.contract.tsx) (Privado/Autenticado).
* **Página Pública / Renderer Geral**: [p.$agency_slug.$page_slug.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.$page_slug.tsx) e [p.$agency_slug.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.index.tsx) (Público).

### 1.2 Componentes Principais
* **Canvas de Renderização**: Integrado na div central da rota do editor. Renderiza o conteúdo usando o `BlockRenderer`.
* **Frame do Site**: Simula telas (Desktop, Tablet, Celular) aplicando classes CSS dinâmicas (`w-full max-w-5xl`, `w-[768px]`, `w-[390px]`) com base na variável de estado `viewport`.
  > [!WARNING]
  > **ESTILO BLEED / INCOMPATIBILIDADE DE VIEWPORT**:
  > O preview do site NÃO utiliza um `iframe` isolado. Como resultado, as regras de mídia CSS comuns (`@media` do Tailwind) resolvem com base no tamanho da janela do navegador do agente e não no container de preview simulado. Isso impede que layouts responsivos se ajustem visualmente no preview, a menos que o usuário redimensione o próprio navegador.
* **Header do Editor (Topbar)**: Contém atalhos de voltar, dropdown de páginas, botão de configurações básicas, controles responsivos, botão de preview externo, botões de salvar rascunho e publicação.
* **Sidepanel Esquerdo (Biblioteca & Camadas)**:
  * Aba `Seções`: Renders `BLOCK_LABELS` permitindo a criação de novos blocos através de `addBlock(type)`.
  * Aba `Templates`: Renders `CMS_TEMPLATES` permitindo a substituição total de blocos por designs pré-definidos.
  * Aba `Camadas`: Exibe a lista ordenada de blocos com suporte a drag-and-drop (`@dnd-kit/core`).
* **Sidepanel Direito (Propriedades)**: Painel condicional aberto quando um bloco está selecionado (`selectedBlockId`). Renderiza o formulário apropriado através do `BlockFormEditor`.
* **Estrutura de Drag and Drop**: Implementada na aba `Camadas` usando `@dnd-kit/core` (`DndContext` e `SortableContext`). Não suporta drag-and-drop visual direto no canvas de preview, apenas no painel de camadas lateral.
* **Estado Global do Editor & Persistência**:
  * Gerenciado localmente na rota `$page_id.tsx` via hooks de estado e encapsulado no hook customizado `useBlockEditor`.
  * Persistência de rascunhos em tempo real com auto-save debounced (1.5 segundos) enviando dados para a tabela `portal_pages` através de `savePortalPageDraft`.
  * Publicação gera uma cópia do array de blocos no campo `published_blocks` da tabela `portal_pages` e cria um registro histórico na tabela `portal_page_versions`.
* **Tabelas do Banco de Dados Usadas**:
  * `public.portal_pages` (Páginas, rascunhos, dados publicados, configurações de SEO)
  * `public.portal_page_versions` (Snapshot de revisões anteriores para reversão)
  * `public.portal_settings` (Configurações do domínio e sufixo de SEO global)
  * `public.brand_kit` (Logos, cores de identidade visual, links de redes sociais)
  * `public.portal_page_analytics` (Monitoramento de visualizações e cliques de leads)
* **Services / Hooks**:
  * `src/hooks/use-block-editor.ts` (Controle local do array de blocos)
  * `src/services/portal.ts` (Requests para Supabase para CRUD de páginas e versões)
* **Tipos TypeScript**:
  * `src/types/builder.ts` (Declarações básicas de tipagem)
  * `src/lib/cms-types.ts` (Filtro e definição unificada de schemas dos blocos e defaults)
* **Componentes Duplicados / Misturas**:
  * `src/components/portal/BlockRenderer.tsx` e `src/components/portal/NewSectionsRenderer.tsx` compartilham lógica de switch-case de blocos com alguma sobreposição em blocos herdados vs novos layouts baseados em Zod.
  * Blocos de Biolink (e.g. `biolink_header`, `biolink_links`, `biolink_newsletter_box`) estão listados no mesmo registry geral de páginas desktop do site, causando mistura visual de categorias incompatíveis.

---

## 2. Inventário de Todos os Botões (Editor de Páginas)

| Botão / Elemento | Arquivo | Tela | O que deveria fazer | Handler existe? | Handler funciona? | Persistência? | Testado? | Correção necessária / Bug encontrado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Voltar** | `$page_id.tsx` | Topbar | Navegar de volta à listagem de páginas. | Sim | Sim | Não aplicável | Sim | Nenhuma. |
| **Página (Dropdown Switcher)** | `$page_id.tsx` | Topbar | Alternar entre páginas da agência ou criar nova. | Sim | Sim | Sim (redireciona rota) | Sim | Nenhuma. |
| **Opções da Página (Engrenagem)** | `$page_id.tsx` | Topbar | Abrir dropdown com opções: Renomear, Duplicar, Definir como Home, Excluir. | Sim | Sim | Sim (Supabase) | Sim | Nenhuma. |
| **Desktop (Viewport)** | `$page_id.tsx` | Viewport Bar | Alterar largura do preview do canvas para Desktop (máximo 1024px/1200px). | Sim | Sim (CSS width) | Não | Sim | Layout responsivo quebra visualmente devido à falta de isolamento via `iframe`. |
| **Tablet (Viewport)** | `$page_id.tsx` | Viewport Bar | Alterar largura do preview do canvas para Tablet (768px). | Sim | Sim (CSS width) | Não | Sim | Layout responsivo quebra visualmente devido à falta de isolamento via `iframe`. |
| **Mobile (Viewport)** | `$page_id.tsx` | Viewport Bar | Alterar largura do preview do canvas para Mobile (390px). | Sim | Sim (CSS width) | Não | Sim | Layout responsivo quebra visualmente devido à falta de isolamento via `iframe`. |
| **Salvar Rascunho** | `$page_id.tsx` | Topbar | Salvar manualmente o estado atual na tabela `portal_pages` como rascunho. | Sim | Sim | Sim (Supabase) | Sim | Nenhuma. |
| **Publicar Página** | `$page_id.tsx` | Topbar | Gravar blocos em `published_blocks`, criar versão histórica e alterar status para 'published'. | Sim | Sim | Sim (Supabase) | Sim | Nenhuma. |
| **Configurações SEO** | `$page_id.tsx` | Topbar | Abrir drawer lateral de configuração de SEO (Meta Title/Description). | Sim | Sim | Sim (Supabase) | Sim | Nenhuma. |
| **Histórico de Versões** | `$page_id.tsx` | Topbar | Abrir drawer de histórico e permitir reversão para snapshots anteriores. | Sim | Sim | Sim (Supabase) | Sim | Nenhuma. |
| **Visualizar Página (Link externo)** | `$page_id.tsx` | Topbar | Abrir a página correspondente no portal público em nova aba. | Sim | Sim | Não aplicável | Sim | O link aponta para o subdomínio de produção `*.travelos.com`, falhando em ambiente de desenvolvimento local. |
| **Desfazer / Refazer** | Não existe | Topbar | Reverter ações locais de adição, remoção ou ordenação de seções. | **Não** | **Não** | Não | Sim | **BUG / GAP**: Funcionalidade crítica para UX está ausente no cabeçalho do editor. |
| **Biblioteca: Adicionar Bloco** | `$page_id.tsx` | Sidepanel Esquerdo | Instanciar um bloco com defaults e inseri-lo no final do array de blocos. | Sim | Sim | Sim (via auto-save) | Sim | Nenhuma. |
| **Camadas: Excluir Seção** | `$page_id.tsx` | Sidepanel Esquerdo | Remover a seção correspondente do array de blocos local. | Sim | Sim | Sim (via auto-save) | Sim | Nenhuma. |
| **Propriedades: Concluído** | `$page_id.tsx` | Sidepanel Direito | Fechar o painel de edição de propriedades do bloco atual. | Sim | Sim | Não aplicável | Sim | Nenhuma. |
| **Propriedades: Excluir Bloco** | `$page_id.tsx` | Sidepanel Direito | Excluir o bloco em edição e fechar o painel lateral de propriedades. | Sim | Sim | Sim (via auto-save) | Sim | Nenhuma. |

---

## 3. Inventário de Todos os Inputs / Selects (Block Properties)

| Campo | Tipo | Arquivo | Bloco/Seção | Validação | Persistência | Tabela / API | Estado Loading | Estado Erro | Testado? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Título (Headline)** | Text Input | `BlockFormEditors.tsx` | `hero`, `contact`, `features`, `cta`, `faq`, `testimonials`, `tours_grid`, `stats`, `video`, `map`, `blog_feed`, `newsletter` | Max 300 chars | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Subtítulo** | Text Input | `BlockFormEditors.tsx` | `hero`, `cta`, `tours_grid`, `tours_carousel`, `newsletter` | Max 1000 chars | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Alinhamento do Texto** | Select | `BlockFormEditors.tsx` | `text` | Enum (`left`, `right`, `center`) | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Conteúdo (Rich Text)** | Rich Editor | `BlockFormEditors.tsx` | `text` | Max 20000 chars | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Botão (Label)** | Text Input | `BlockFormEditors.tsx` | `hero`, `cta` | Max 100 chars | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Botão (Link)** | Text Input | `BlockFormEditors.tsx` | `hero`, `cta` | Max 500 chars | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Fundo (Imagem)** | File Upload | `BlockFormEditors.tsx` | `hero`, `text`, `styles` | Apenas imagem | Sim | Supabase Storage (`agency-logos`) | Barra de progresso | Toast de erro | Sim |
| **Galeria de Fotos** | Multi Upload | `BlockFormEditors.tsx` | `gallery` | Max 30 imagens | Sim | Supabase Storage (`agency-logos`) | Barra de progresso | Toast de erro | Sim |
| **ID da Excursão** | Select / Text | `BlockFormEditors.tsx` | `group_tour_details`, `countdown_tour` | UUID válido | Sim | `portal_pages.blocks` (referência a `group_tours`) | Sim (fetch) | Omitido | Sim |
| **Aparência: Fundo Tipo** | Select | `BlockFormEditors.tsx` | `styles` | Enum (`default`, `color`, `gradient`, `image`) | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Aparência: Cor de Fundo** | Color Picker | `BlockFormEditors.tsx` | `styles` | Formato HEX | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Aparência: Altura (Padding)**| Select | `BlockFormEditors.tsx` | `styles` | Enum (`none`, `sm`, `md`, `lg`) | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Aparência: Bordas** | Select | `BlockFormEditors.tsx` | `styles` | Enum (`none`, `md`, `lg`, `full`) | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Animação: Ativa** | Checkbox | `BlockFormEditors.tsx` | `animation` | Boolean | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Animação: Tipo** | Select | `BlockFormEditors.tsx` | `animation` | Enum (`fade`, `slide-up`, `zoom-in`, etc.) | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |
| **Ocultar em Dispositivos** | Checkbox | `BlockFormEditors.tsx` | `responsive` | Boolean | Sim | `portal_pages.blocks` | Omitido | Toast na API | Sim |

---

## 4. Inventário de Blocos Atuais

Abaixo está o mapeamento dos principais blocos ativos no CMS e sua respectiva responsividade/compatibilidade de publicação.

| Tipo do Bloco | Nome Exibido | Arquivo | Categoria Atual | Categoria Correta | Campos Editáveis | Responsivo? | Pode Publicar? | Problemas Identificados |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `hero` | Hero / Banner | `BlockRenderer.tsx` | Geral | Geral | Título, Subtítulo, CTA Label/Link, Imagem | Sim | Sim | Nenhum. |
| `text` | Texto com imagem | `BlockRenderer.tsx` | Geral | Geral | Editor rico, imagem lateral, alinhamento | Sim | Sim | RichTextEditor às vezes causa saltos no cursor. |
| `gallery` | Galeria de fotos | `BlockRenderer.tsx` | Mídia | Mídia | Imagens (Upload múltiplo), espaçamento | Sim | Sim | Carregamento de muitas imagens pesa na renderização do canvas. |
| `contact` | Formulário de contato | `BlockRenderer.tsx` | Formulários | Formulários | Título, descrição | Sim | Sim | Não permite customização dos campos (Nome, WhatsApp, E-mail são travados). |
| `features` | Diferenciais | `BlockRenderer.tsx` | Geral | Geral | Título, Itens (Ícone, título, descrição), layout | Sim | Sim | Ícones são limitados a uma lista estática. |
| `faq` | FAQ | `BlockRenderer.tsx` | Conteúdo | Conteúdo | Perguntas, respostas, layout | Sim | Sim | Layout em grid quebra com textos longos. |
| `testimonials` | Depoimentos | `BlockRenderer.tsx` | Prova Social | Prova Social | Depoimentos, estrelas, layout | Sim | Sim | Avatares sem upload direto no item. |
| `tours_grid` | Grade de roteiros | `BlockRenderer.tsx` | Pacotes | Pacotes | Título, limite, layout | Sim | Sim | **VÍNCULO LIMITADO**: Depende inteiramente das excursões estarem marcadas como públicas no banco. |
| `biolink_header` | Biolink: Cabeçalho | `BlockRenderer.tsx` | Biolink | Biolink | Avatar, Nome, Bio, Cor Fundo/Texto | Apenas Mobile | Sim | **CATEGORIA MISTURADA**: Aparece para seleção no editor de sites normais de desktop, o que quebra a semântica visual. |
| `biolink_links` | Biolink: Links | `BlockRenderer.tsx` | Biolink | Biolink | Botões de links rápidos (Título, URL, ícone, destaque) | Apenas Mobile | Sim | **CATEGORIA MISTURADA**: Não deve ser usado em páginas corporativas de desktop. |
| `group_tour_details`| Detalhes do Grupo | `BlockRenderer.tsx` | Pacotes | Pacotes | ID do Grupo | Sim | Sim | Se o grupo for excluído do DB, a renderização do bloco falha sem um fallback amigável. |
| `whatsapp_departments`| Canais de WhatsApp | `BlockRenderer.tsx` | Contato | Contato | Departamentos (Nome, WhatsApp, mensagem inicial) | Sim | Sim | Nenhuma validação rigorosa de código de país no número. |
| `countdown_tour` | Contador Regressivo | `BlockRenderer.tsx` | Comercial | Comercial | ID do grupo, título, subtítulo, botão | Sim | Sim | Layout muito chamativo, foge do SaaS Minimal Editorial. |
| `client_document_upload`| Envio de Documentos | `BlockRenderer.tsx` | Logística | Logística | Título, instruções, tipo | Sim | Sim | Não funciona no rascunho, necessita de chave de agência e sessão autenticada. |
| `biolink_newsletter_box`| Newsletter Biolink | `BlockRenderer.tsx` | Biolink | Biolink | Placeholder, botão | Apenas Mobile | Sim | Não valida e-mail antes do envio. |

---

## 5. Auditoria de Mistura de Conceitos & Canais

Durante o inventário, observamos as seguintes falhas graves de design e arquitetura:
1. **Falta de Contextualização do Catálogo**: O sidepanel esquerdo exibe blocos de Biolink (como `biolink_header` ou `biolink_newsletter_box`) lado a lado com seções robustas de site de desktop.
2. **Mistura de Biolink com Páginas Normais**: O usuário pode erroneamente arrastar um cabeçalho de Biolink no meio de uma landing page corporativa, quebrando a estética e gerando bugs responsivos.
3. **Inexistência de Document Builder unificado**: Propostas, Vouchers e Contratos possuem interfaces de estúdio totalmente duplicadas e isoladas em vez de compartilharem o mesmo Core do editor visual (`BuilderCore`).

Este diagnóstico justifica a necessidade da **Redivisão em Fases** com a introdução do `BuilderCore` contextual.
