# 🎯 TravelOS Studio Engine — Plano Definitivo (Missão Permanente)

> **STATUS:** EM EXECUÇÃO — Não apagar até conclusão completa da missão.
> **Última revisão:** 2026-06-12
> **Scope:** Cotações Studio, Voucher Studio, Contrato Studio, Portal Builder, WebView público

---

## 1. Visão Estratégica

### O que estamos construindo

Um **Studio Engine compartilhado** que alimenta 4 ferramentas distintas no TravelOS:

| Ferramenta | Rota | Canvas Padrão | Público-alvo |
|------------|------|--------------|--------------|
| **Proposal Studio** | `/agency/$slug/proposals/$id` | A4 Portrait/Landscape | Cliente final (proposta comercial) |
| **Voucher Studio** | `/agency/$slug/trips/$id/vouchers` | Story 9:16 + A4 | Passageiro (guia de embarque) |
| **Contract Studio** | `/agency/$slug/trips/$id/contract` | A4 Portrait | Cliente/PJ (contrato legal) |
| **Portal Builder** | `/agency/$slug/portal/pages` | Página web responsiva | Público geral (marketing) |

### Princípios Arquiteturais

1. **Canvas ≠ WebView:** O canvas do Studio é **fixo e não responsivo** — funciona como uma folha de papel virtual que escala zoom mas não quebra layout. O WebView público (link enviado ao cliente) é **responsivo** (adapta ao smartphone).

2. **Formato define Layout:** Mudar de A4 para Story não é só resize — é trocar o template completo. A4 tem sidebar financeira; Story tem card resumido; Apresentação tem slide-por-destaque.

3. **Backend-First:** OCR, geração de PDF, busca de imagens no Unsplash, geração de capa com IA — tudo via Supabase Edge Functions. Nunca expor API keys no frontend.

4. **Shared Components:** `StudioFrame`, `StudioToolbar`, `StudioSidebar`, `OcrDropzone` são 100% reutilizáveis entre Proposal, Voucher e Contract.

5. **Zero código morto:** Nada é fingido. Cada botão executa sua ação. Cada campo persiste no banco.

---

## 2. Formatos de Canvas (Breakpoints Fixos)

| Formato | Dimensões (px @96dpi) | Uso |
|---------|----------------------|-----|
| `a4-portrait` | 794 × 1123 | Cotação detalhada, Contrato |
| `a4-landscape` | 1123 × 794 | Apresentação por slides |
| `story-916` | 607 × 1080 | Voucher social, Story Instagram/WhatsApp |
| `presentation-169` | 1280 × 720 | Apresentação executiva corporativa |
| `letter-portrait` | 816 × 1056 | Padrão americano (agências internacionais) |

**Como funciona o scaling:**
```
containerWidth = painel_direito.clientWidth - 48px (padding)
scale = Math.min(1, containerWidth / frameWidth)
wrapper.style.transform = `scale(${scale})`
wrapper.style.transformOrigin = 'top center'
```
O frame nunca amplia além de 100% — só reduz. O conteúdo interno não muda sua posição, tamanho ou quebra de linha.

**Resolução para exportação:** 3× (300 DPI equivalente) para impressão profissional. Para story Instagram: exportar PNG 1080×1920px real.

---

## 3. Templates por Formato

### 3.1 Templates A4 Portrait

**Template 1: Editorial Flat Premium (padrão azul)**
- Capa full-bleed com `cover_image_url` + overlay gradiente com cor da marca
- Badge "Proposta Exclusiva" + número da cotação
- Grid identidade: logo agência + consultor + datas
- Seção Voos: ticket-style com aeroporto origen → destino, horários, bagagem
- Seção Hotéis: imagem lateral 40% + specs: regime, quartos, check-in/out, cidade
- Timeline de roteiro vertical: marcadores coloridos + títulos + resumos por dia
- Inclui/Não inclui: lista verde ✓ e vermelha ✗ em 2 colunas
- Moodboard opcional: grid de fotos do destino
- Página financeira final: total, pix com desconto, parcelas cartão, parcelas boleto
- Rodapé com foto/nome/whatsapp do consultor + branding da agência

**Template 2: Proposta Executiva B2B (clean)**
- Header minimalista: logo + linha HR + número de referência + data de validade
- Seção "Para:" com dados do cliente (empresa, contato, CNPJ se corporativo)
- Tabela de serviços: cada item = linha com descrição + quantidade + valor unitário + total
- Cálculo de totais na tabela
- Observações e termos em fonte menor
- Sem imagens grandes — foco em dados e clareza
- Rodapé com dados da agência + assinatura digital placeholder

**Template 3: Proposta Dark Oficial**
- Fundo `#0f172a` (slate-900)
- Tipografia Playfair Display para títulos em branco/dourado
- Acentos em cor da marca (customizável)
- Capa com hero image + overlay escuro + título em destaque
- Cards com glass-morphism: `bg-white/10 border-white/20 backdrop-blur`
- Design premium tipo brochura de resort 5 estrelas

**Template 4: Roteiro por Dias (landscape apresentação)**
- Cada "página" = 1 slide A4 landscape
- Slide 1: Capa com destino + datas + logo
- Slide 2: Visão geral do roteiro (mapa + timeline compacta)
- Slides 3-N: Um dia por slide — foto do destino + texto + atividades
- Slide final: Contato + próximos passos + QR Code para o link público

### 3.2 Templates Story 9:16

Foco: visual, emocional, rápido de ler. Funciona como Instagram Story.

**Template Story: Voucher Visual**
- Capa: imagem full-bleed + gradiente inferior + nome do destino em destaque
- Card de voo: glassmorphism com origen→destino + horário
- Card de hotel: nome + check-in/out
- Rodapé: logo agência + "Planejado com cuidado por @slug"

**Template Story: Anúncio de Pacote**
- Background vibrante com cor da marca
- Título grande do destino
- Bullets de inclui
- Preço em destaque (cta: "Quero este pacote!")
- QR Code para a proposta

### 3.3 Templates Apresentação 16:9

Estilo Gamma/Google Slides premium. Foco consultivo.

**Template Apresentação: Executiva**
- Slide capa: full-bleed image + título + subtitle
- Slide "Por que este destino?": bullet points + imagem lateral
- Slide Roteiro: grid de dias com icones
- Slide Hotéis: 2 hotéis por slide com fotos, estrelas, localização
- Slide Voos: tabela compacta
- Slide Financeiro: destaque do investimento
- Slide CTA: "Próximos passos" + contatos

---

## 4. Arquitetura de Componentes — Studio Engine

```
src/
  components/
    studio/                           ← ENGINE COMPARTILHADA
      StudioFrame.tsx                 ← Wrapper do canvas com scale e scroll
      StudioToolbar.tsx               ← Toolbar universal (save, pdf, share, status)
      StudioSidebar.tsx               ← Sidebar CMS universal (agrega seções)
      StudioFormatPicker.tsx          ← Selector de formato de canvas (A4/Story/etc)
      StudioTemplatePicker.tsx        ← Thumbnail gallery de templates
      StudioOcrDropzone.tsx           ← Drop zone com upload + Edge Fn OCR
      StudioUnsplashPicker.tsx        ← Busca imagens Unsplash + upload manual
      StudioMapWidget.tsx             ← Mapa Leaflet com waypoints + captura
      StudioTotalFooter.tsx           ← Footer sidebar com total calculado
      sections/
        SectionCover.tsx              ← Capa: agência, cores, consultor, fotos
        SectionTravelers.tsx          ← Passageiros: add/remove/edit
        SectionFlights.tsx            ← Voos: add/remove/edit por item
        SectionHotels.tsx             ← Hotéis: add/remove/edit + upload foto
        SectionTransfers.tsx          ← Transfers: tipo, veículo, fornecedor
        SectionTours.tsx              ← Passeios/ingressos + foto
        SectionItinerary.tsx          ← Roteiro dia-a-dia + botão IA gerar
        SectionIncludes.tsx           ← Inclui / Não inclui (listas editáveis)
        SectionFinancial.tsx          ← Parcelas cartão, boleto, PIX, avulsas
        SectionMap.tsx                ← Waypoints + mapa + captura HD
        SectionExtraPages.tsx         ← Páginas extras: galeria, moodboard, termos
        SectionEmergency.tsx          ← Contatos de emergência (voucher)
        SectionInsurance.tsx          ← Dados do seguro viagem (voucher)

    proposals/
      templates/
        TemplateEditorialFlat.tsx
        TemplateExecutivo.tsx
        TemplateExcetur.tsx
        TemplateRoteiro.tsx
        index.ts                      ← getProposalTemplate(format, templateId)
      ProposalStudio.tsx              ← Monta StudioFrame + StudioSidebar para proposals
      ProposalWebView.tsx             ← Versão responsiva pública (m.proposal.$token)

    vouchers/
      templates/
        TemplateNavyStory.tsx
        TemplateMinimalStory.tsx
        TemplateBrandStory.tsx
        TemplateVoucherA4.tsx         ← Nova: voucher em A4 (completo, imprimível)
        TemplateEmbarqueA4.tsx        ← Guia de embarque A4
        TemplateEmergenciaA4.tsx      ← Card de emergência A4/Story
        index.ts
      VoucherStudio.tsx               ← Monta Studio para vouchers (abas: Voucher/Embarque/Emergência/WhatsApp)
      VoucherWhatsAppGenerator.tsx    ← Gerador de texto WhatsApp

    contracts/
      templates/
        TemplateContractStandard.tsx
        TemplateContractCorporate.tsx
        index.ts
      ContractStudio.tsx              ← CMS + Canvas para contratos

    portal/
      PortalPageBuilder.tsx           ← Builder de páginas do portal público da agência
      PortalPageWebView.tsx           ← Renderização pública das páginas
```

---

## 5. Rotas Afetadas

### Rota: Proposal Studio
**Arquivo:** `src/routes/agency.$slug.proposals.$id.tsx`
**Ação:** REESCREVER como container slim (~80 linhas). Toda lógica vai para `ProposalStudio.tsx`.

**Estrutura do container:**
```tsx
function ProposalEditor() {
  // 1. Carrega dados: proposta + agência + brandKit
  // 2. Gerencia draft state + autosave com debounce 800ms
  // 3. Renderiza StudioToolbar + ProposalStudio (split layout)
}
```

### Rota: Voucher Studio (já existe)
**Arquivo:** `src/routes/agency.$slug.trips.$id.vouchers.tsx`
**Ação:** REFATORAR. O `VoucherEditor` (inline 500+ linhas) vira `VoucherStudio.tsx`. A rota vira container. As abas (Voucher/Embarque/Emergência/WhatsApp) são mantidas e melhoradas com canvas real e templates premium. O gerador de Story atual (`#story-canvas`) é substituído pelo `StudioFrame` com `TemplateNavyStory`.

### Rota: WebView Pública
**Arquivo:** `src/routes/m.proposal.$token.tsx`
**Ação:** MANTER a lógica de aceitar/recusar. ATUALIZAR o visual para usar `ProposalWebView.tsx` responsivo, que lê os dados JSONB e renderiza adaptado para mobile.

### Rota: Portal Builder (NOVA)
**Arquivo:** `src/routes/agency.$slug.portal.pages.tsx` — **CRIAR**
**Rota pública:** `src/routes/p.$agency_slug.$page_slug.tsx` — **CRIAR**

---

## 6. Backend: Supabase

### 6.1 Novas Colunas — Proposals

**Migration:** `supabase/migrations/20260612000001_proposals_studio.sql`

```sql
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS map_image_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS custom_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_pages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canvas_format TEXT DEFAULT 'a4-portrait',
  ADD COLUMN IF NOT EXISTS cover_prompt TEXT;
```

### 6.2 Nova Tabela — Portal Pages

**Migration:** `supabase/migrations/20260612000002_portal_pages.sql`

```sql
CREATE TABLE IF NOT EXISTS portal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category TEXT DEFAULT 'roteiro', -- roteiro|passeio|guia|destino
  content JSONB DEFAULT '[]'::jsonb, -- blocos de conteúdo: {type, data}
  canvas_format TEXT DEFAULT 'web-page',
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- RLS
ALTER TABLE portal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_owns_portal_pages" ON portal_pages
  USING (agency_id = get_my_agency_id());
CREATE POLICY "public_can_read_published_portal_pages" ON portal_pages
  FOR SELECT TO anon USING (status = 'published');
```

### 6.3 Bucket: proposals-exports

**Migration:** `supabase/migrations/20260612000003_proposals_exports_bucket.sql`

```sql
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('proposals-exports', 'proposals-exports', true,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (para download pelo cliente)
CREATE POLICY "proposals_exports_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'proposals-exports');

-- Escrita apenas via service role (Edge Function)
CREATE POLICY "proposals_exports_service_write" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'proposals-exports');
```

### 6.4 Edge Function: OCR Proposal

**Arquivo:** `supabase/functions/ocr-proposal/index.ts`

**Fluxo:**
1. Recebe POST autenticado com `{ proposal_id, agency_id, file_url?, file_base64?, mime_type }`
2. Busca chave Gemini: primeiro em `api_keys` (provider=gemini, agency_id), senão usa variável de ambiente `GEMINI_API_KEY` (global)
3. Envia para `gemini-2.0-flash` (Vision) com prompt estruturado + JSON schema
4. Prompt extrai: voos, hotéis, transfers, passeios, roteiro, inclui/não inclui, contatos de emergência, seguro
5. **Censura B2B:** Remove telefones de operadoras (Azul, LATAM, CVC, FRT, Orinter) dos contatos
6. Sanitiza observações (remove multas, caução, textos B2B)
7. Retry exponencial: 5 tentativas com delay 1s → 2s → 4s → 8s → 16s
8. Retorna JSON validado

**Schema de resposta:**
```ts
{
  flights: Flight[]
  hotels: Hotel[]
  transfers: Transfer[]
  tours: Tour[]
  itinerary: ItineraryDay[]
  includes: string[]
  excludes: string[]
  emergency_contacts: { name, category, phone }[]
  insurance: { provider, policy, coverage, phone }
  destination: string
  pax: string[]
  locator: string
  notes: string
}
```

**Melhoria sobre o HTML de referência:**
- API key no servidor, não no browser
- Retry robusto com backoff exponencial
- Schema de resposta tipado e validado com Zod
- Preview antes de importar (usuário confirma)
- Merge inteligente (não sobrescreve dados existentes)

### 6.5 Edge Function: Generate PDF

**Arquivo:** `supabase/functions/generate-proposal-pdf/index.ts`

**Estratégia:** Usar `@sparticuz/chromium` com `puppeteer-core` para renderizar o HTML do template.

**Fluxo:**
1. Recebe POST autenticado: `{ proposal_id, agency_id, format }`
2. Busca dados completos da proposta (service role, sem RLS)
3. Constrói HTML completo do template (inline styles, base64 das imagens do bucket)
4. Inicia Puppeteer headless com Chromium
5. `page.setContent(html, { waitUntil: 'networkidle0' })`
6. `page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })`
7. Faz upload para `proposals-exports/{agency_id}/{proposal_id}/export.pdf`
8. Retorna `{ pdf_url }` público

**Por que não html2canvas:**
- html2canvas não respeita CSS `page-break-inside: avoid`
- Imagens cross-origin bloqueiam captura
- Fontes externas (Google Fonts) não carregam no canvas context
- Puppeteer renderiza exatamente como o browser vê a página

### 6.6 Edge Function: Unsplash Image Search

**Arquivo:** `supabase/functions/search-unsplash/index.ts`

**Fluxo:**
1. Recebe `{ query, per_page: 12 }`
2. Chama `api.unsplash.com/search/photos` com `UNSPLASH_ACCESS_KEY` do ambiente
3. Retorna array de `{ id, url_regular, url_full, url_thumb, photographer, photographer_url, alt }`
4. Frontend exibe grid e usuário seleciona
5. Após seleção, frontend faz `PUT` da URL escolhida para o bucket `agency-media` (server-side, não no browser)

---

## 7. Serviços Frontend

### 7.1 proposals.ts (MODIFICAR)

Adicionar ao `Proposal` type:
```ts
canvas_format: string;
cover_image_url: string | null;
map_image_url: string | null;
agent_name: string | null;
agent_photo_url: string | null;
agent_whatsapp: string | null;
custom_payments: CustomPayment[];
waypoints: WaypointItem[];
extra_pages: ExtraPage[];
cover_prompt: string | null;
```

Novas funções:
```ts
generateProposalPdf(proposalId: string, format: string): Promise<{ pdf_url: string }>
runProposalOcr(proposalId: string, agencyId: string, file: File): Promise<OcrResult>
searchUnsplash(query: string): Promise<UnsplashPhoto[]>
```

### 7.2 proposal-storage.ts (CRIAR)

```ts
uploadProposalCover(agencyId, proposalId, file): Promise<string>
uploadProposalAgentPhoto(agencyId, proposalId, file): Promise<string>
uploadProposalHotelImage(agencyId, proposalId, hotelId, file): Promise<string>
uploadProposalTourImage(agencyId, proposalId, tourId, file): Promise<string>
uploadProposalMapCapture(agencyId, proposalId, blob): Promise<string>
saveUnsplashImageToStorage(agencyId, proposalId, slot, unsplashUrl): Promise<string>
```

---

## 8. Voucher Studio — Refatoração Específica

### Estado Atual
- `agency.$slug.trips.$id.vouchers.tsx`: 1119 linhas, VoucherEditor inline, Story canvas básico
- Tabs: Voucher/Embarque/Emergência/WhatsApp (no HTML de referência) — **nossa versão atual só tem lista + editor CMS simples + Story modal**

### O que falta implementar
1. **Canvas premium com template visual** para cada aba (não só formulário CMS)
2. **Tab Guia de Embarque** com template A4 próprio (dicas, QR code do voo, documentos necessários)
3. **Tab Emergência** com template A4/Story: contatos de emergência + seguro + mapa do hotel
4. **Gerador de mensagem WhatsApp** (já existe no HTML de referência — implementar versão nativa)
5. **Export PNG/PDF por aba** (não só Story) com Puppeteer server-side
6. **StudioFrame** para o canvas do Story (em vez do `#story-canvas` fixo atual)

### VoucherStudio.tsx — Estrutura
```tsx
<div className="flex h-[calc(100vh-4rem)] flex-col">
  <VoucherToolbar />
  <div className="flex flex-1 min-h-0">
    {/* Sidebar CMS */}
    <StudioSidebar sections={[
      { id: 'cover', component: SectionCover },
      { id: 'travelers', component: SectionTravelers },
      { id: 'flights', component: SectionFlights },
      { id: 'hotels', component: SectionHotels },
      { id: 'transfers', component: SectionTransfers },
      { id: 'tours', component: SectionTours },
      { id: 'emergency', component: SectionEmergency },
      { id: 'insurance', component: SectionInsurance },
    ]} />
    {/* Canvas com abas */}
    <div className="flex-1 flex flex-col">
      <TabBar tabs={['voucher', 'embarque', 'emergencia', 'whatsapp']} />
      <StudioFrame format={activeTab === 'voucher' ? 'story-916' : 'a4-portrait'}>
        <ActiveVoucherTemplate tab={activeTab} voucher={draft} agency={agency} />
      </StudioFrame>
    </div>
  </div>
</div>
```

---

## 9. Portal Builder — Nova Funcionalidade

### Conceito
O mesmo engine do Studio é usado para criar **páginas de marketing** no portal público da agência. Diferente das cotações (arquivo estático), o portal é **responsivo** — adapta ao celular do visitante.

### Estrutura de Conteúdo
Cada página do portal tem um array de **blocos** (`content: Block[]`):
```ts
type Block =
  | { type: 'hero'; image_url: string; title: string; subtitle: string }
  | { type: 'text'; content: string; align: 'left' | 'center' }
  | { type: 'gallery'; images: string[]; columns: 2 | 3 | 4 }
  | { type: 'carousel'; images: string[] }
  | { type: 'video'; url: string; caption: string }
  | { type: 'itinerary'; days: ItineraryDay[] }
  | { type: 'pricing'; currency: string; items: PricingItem[] }
  | { type: 'flights'; flights: Flight[] }
  | { type: 'hotels'; hotels: Hotel[] }
  | { type: 'map'; waypoints: WaypointItem[]; map_image_url: string }
  | { type: 'reviews'; reviews: Review[] }
  | { type: 'cta'; title: string; button_text: string; button_link: string }
  | { type: 'includes'; includes: string[]; excludes: string[] }
  | { type: 'faq'; items: { question: string; answer: string }[] }
```

### Diferença do Proposal
- Proposal → cliente recebe link individual, aceita/recusa, expira
- Portal page → pública, indexável, durável, pode ter muitos acessos
- Portal page pode ser convertida em destino/pacote vendável com CTA

---

## 10. WebView Pública — Estratégia de Design

### m.proposal.$token.tsx (responsivo)
- Layout coluna única em mobile, 2 colunas em tablet/desktop
- Todos os dados JSONB renderizados em componentes responsivos
- Botões Aceitar/Recusar em destaque fixo no bottom
- "Powered by TravelOS" discreto no rodapé

### p.$agency_slug.$page_slug.tsx (portal público)
- Renderiza blocos do `content` array da `portal_pages`
- SEO: título, meta description, og:image para cada página
- Schema.org structured data para pacotes de viagem (rich results no Google)
- Carregamento otimizado: imagens lazy-loaded, LCP otimizado

---

## 11. Mapa Geográfico (Leaflet)

### StudioMapWidget.tsx
- Mapa OpenStreetMap via Leaflet (gratuito, sem API key)
- Suporte a waypoints com marcadores numerados
- **Rota entre pontos:** usa OSRM routing (gratuito) ou exibe linha reta como fallback
- **Rota aérea:** arco curvo (great circle) animado
- **Captura HD:** `leaflet-image` plugin para exportar o mapa como PNG → upload para `agency-media`
- Geocoding: Nominatim (OpenStreetMap, gratuito) — busca cidade pelo nome e retorna lat/lon

### Funcionalidade de rota interna (aeroporto → hotel)
```
Waypoint 1: Aeroporto de Chapecó (lat, lon)
Waypoint 2: Hotel XYZ Centro
→ Rota OSRM desenhada no mapa
→ Captura PNG → salvo em map_image_url
→ Aparece na página de itinerário da proposta
```

---

## 12. OCR e IA — Arquitetura de Chaves

### Hierarquia de chaves
1. **Chave da agência** (tabela `api_keys`, provider=gemini): prioritária
2. **Chave global do sistema** (`GEMINI_API_KEY` env na Edge Function): fallback
3. **Rate limiting:** 5 req/min por agência no Edge Function (middleware)

### Como o OCR processa
```
Arquivo (imagem/PDF) → upload para agency-media/temp/ → Edge Fn OCR
→ Gemini Vision analisa → JSON estruturado → Frontend exibe preview
→ Usuário confirma seleção por seção → Merge com draft → Save no DB
```

### O que extrai (baseado no código de referência do voucher)
- ✅ Voos: origem, destino, data, horário, cia, nº, localizador, bagagem
- ✅ Hotéis: nome, cidade, check-in, checkout, regime, localizador
- ✅ Transfers: fornecedor, ponto de encontro, telefone, localizador
- ✅ Passeios: nome, data, ponto de encontro, fornecedor
- ✅ Seguro: seguradora, apólice, telefone de acionamento
- ✅ Contatos de emergência: hotel, receptivo local (NUNCA operadoras B2B)
- ✅ Passageiros: nome completo (string pura, não objeto)
- ✅ Notas sanitizadas (sem multas, caução, textos B2B internos)

---

## 13. Arquivos Modificados — Checklist Completo

### Supabase Migrations (CRIAR)
- `[ ]` `20260612000001_proposals_studio.sql` — colunas extras em proposals
- `[ ]` `20260612000002_portal_pages.sql` — tabela portal_pages
- `[ ]` `20260612000003_proposals_exports_bucket.sql` — bucket exports

### Edge Functions (CRIAR)
- `[ ]` `supabase/functions/ocr-proposal/index.ts`
- `[ ]` `supabase/functions/generate-proposal-pdf/index.ts`
- `[ ]` `supabase/functions/search-unsplash/index.ts`

### Serviços (CRIAR/MODIFICAR)
- `[ ]` `src/services/proposals.ts` — novos tipos + funções edge
- `[ ]` `src/services/proposal-storage.ts` — upload helpers
- `[ ]` `src/services/portal-pages.ts` — CRUD para portal_pages (CRIAR)

### Studio Engine Compartilhado (CRIAR)
- `[ ]` `src/components/studio/StudioFrame.tsx`
- `[ ]` `src/components/studio/StudioToolbar.tsx`
- `[ ]` `src/components/studio/StudioSidebar.tsx`
- `[ ]` `src/components/studio/StudioFormatPicker.tsx`
- `[ ]` `src/components/studio/StudioTemplatePicker.tsx`
- `[ ]` `src/components/studio/StudioOcrDropzone.tsx`
- `[ ]` `src/components/studio/StudioUnsplashPicker.tsx`
- `[ ]` `src/components/studio/StudioMapWidget.tsx`
- `[ ]` `src/components/studio/StudioTotalFooter.tsx`
- `[ ]` `src/components/studio/sections/SectionCover.tsx`
- `[ ]` `src/components/studio/sections/SectionTravelers.tsx`
- `[ ]` `src/components/studio/sections/SectionFlights.tsx`
- `[ ]` `src/components/studio/sections/SectionHotels.tsx`
- `[ ]` `src/components/studio/sections/SectionTransfers.tsx`
- `[ ]` `src/components/studio/sections/SectionTours.tsx`
- `[ ]` `src/components/studio/sections/SectionItinerary.tsx`
- `[ ]` `src/components/studio/sections/SectionIncludes.tsx`
- `[ ]` `src/components/studio/sections/SectionFinancial.tsx`
- `[ ]` `src/components/studio/sections/SectionMap.tsx`
- `[ ]` `src/components/studio/sections/SectionExtraPages.tsx`
- `[ ]` `src/components/studio/sections/SectionEmergency.tsx`
- `[ ]` `src/components/studio/sections/SectionInsurance.tsx`

### Proposal Templates (CRIAR)
- `[ ]` `src/components/proposals/templates/TemplateEditorialFlat.tsx`
- `[ ]` `src/components/proposals/templates/TemplateExecutivo.tsx`
- `[ ]` `src/components/proposals/templates/TemplateExcetur.tsx`
- `[ ]` `src/components/proposals/templates/TemplateRoteiro.tsx`
- `[ ]` `src/components/proposals/templates/index.ts`

### Voucher Templates (CRIAR)
- `[ ]` `src/components/vouchers/templates/TemplateNavyStory.tsx` (melhorado)
- `[ ]` `src/components/vouchers/templates/TemplateMinimalStory.tsx`
- `[ ]` `src/components/vouchers/templates/TemplateBrandStory.tsx`
- `[ ]` `src/components/vouchers/templates/TemplateVoucherA4.tsx`
- `[ ]` `src/components/vouchers/templates/TemplateEmbarqueA4.tsx`
- `[ ]` `src/components/vouchers/templates/TemplateEmergenciaA4.tsx`
- `[ ]` `src/components/vouchers/templates/index.ts`

### Rotas (REESCREVER/CRIAR)
- `[ ]` `src/routes/agency.$slug.proposals.$id.tsx` — container slim
- `[ ]` `src/routes/agency.$slug.trips.$id.vouchers.tsx` — refatorar editor
- `[ ]` `src/routes/m.proposal.$token.tsx` — atualizar visual responsivo
- `[ ]` `src/routes/agency.$slug.portal.pages.tsx` — CRIAR
- `[ ]` `src/routes/agency.$slug.portal.pages.$id.tsx` — CRIAR (editor)
- `[ ]` `src/routes/p.$slug.$page.tsx` — CRIAR (WebView pública do portal)

### Componentes Proposal (MODIFICAR)
- `[ ]` `src/components/proposals/NewProposalSheet.tsx` — já reescrito ✅
- `[ ]` `src/components/proposals/OcrButton.tsx` — reescrever usando StudioOcrDropzone
- `[ ]` `src/components/proposals/ExportPdfButton.tsx` — reescrever para Edge Fn

### Componentes Voucher (MODIFICAR)
- `[ ]` `src/routes/agency.$slug.trips.$id.vouchers.tsx` → `VoucherStudio.tsx`
- `[ ]` Gerador WhatsApp nativo

---

## 14. Padrões de Código a Seguir

1. **Sem `any`** — todos os tipos explícitos
2. **Arquivos de rota:** container slim, lógica em componentes/serviços
3. **Sem código morto** — todo botão tem handler, todo campo persiste
4. **CSS do canvas:** pixels fixos, nunca classes responsivas Tailwind como `md:grid-cols-2`
5. **Images:** sempre `crossOrigin="anonymous"` nos `<img>` dentro do canvas
6. **Autosave:** debounce de 800ms após qualquer mudança no draft
7. **Edge Functions:** sempre validar JWT, sempre retry, sempre logs estruturados
8. **Storage paths:** `{bucket}/{agency_id}/{resource_type}/{resource_id}/{filename}`

---

## 15. Ordem de Execução por Sprint

### Sprint 1 — Fundação (Priority: CRÍTICO)
1. Migration SQL proposals + portal_pages + bucket exports
2. StudioFrame + StudioSidebar + StudioToolbar (componentes base)
3. Sections: SectionFlights, SectionHotels, SectionItinerary (as mais usadas)
4. Template 1: TemplateEditorialFlat completo
5. ProposalStudio.tsx + rota container slim
6. ✅ Test: Criar cotação → editar no Studio → preview canvas

### Sprint 2 — Qualidade (Priority: ALTA)
1. Edge Fn: OCR Proposal (Gemini Vision)
2. Edge Fn: Generate PDF (Puppeteer)
3. StudioUnsplashPicker + proposal-storage.ts
4. Templates 2, 3, 4
5. StudioMapWidget (Leaflet + OSRM)
6. ✅ Test: Upload imagem operadora → dados extraídos → PDF gerado fiel

### Sprint 3 — Voucher Studio (Priority: ALTA)
1. VoucherStudio.tsx com StudioFrame
2. Templates voucher: Navy, Minimal, Brand (Story) + A4 completo
3. Template Embarque A4 + Emergência
4. Gerador WhatsApp nativo
5. Export PNG/PDF voucher via Puppeteer
6. ✅ Test: Importar PDF operadora → voucher gerado → export Story + PDF

### Sprint 4 — Portal Builder (Priority: MÉDIA)
1. portal_pages service + CRUD
2. PortalPageBuilder.tsx com blocos drag-and-drop
3. PortalPageWebView.tsx responsivo com SEO
4. Rotas públicas `p.$slug.$page`
5. ✅ Test: Criar página de roteiro → publicar → acessar URL pública

### Sprint 5 — Refinamento (Priority: NORMAL)
1. Contract Studio (reutiliza engine)
2. Template WhatsApp Message no Voucher Studio
3. Geração de capa com IA (Gemini Imagen) como feature premium
4. ✅ Test completo: E2E de cotação → aceite → viagem → voucher → portal
