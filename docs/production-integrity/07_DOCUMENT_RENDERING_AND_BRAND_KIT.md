# 07. Renderização de Documentos e Brand Kit

Este relatório detalha a auditoria dos renderizadores visuais de documentos (PDF/PNG) na aplicação e a propagação e caching do Brand Kit da agência.

## 1. Mapeamento de Renderizadores e Exportadores

Auditamos todos os pontos onde bibliotecas de conversão HTML para Canvas (`html2canvas`) e PDF (`jsPDF`) são utilizadas para gerar documentos oficiais:

| Renderer / Local                           | Fontes (`fonts.ready`) | Aguarda Imagens? |     CORS Tratado?     | Loader na Interface? | Tratamento de Erro? | Suporta A4? | Suporta Story 9:16? | Código Testado? |
| :----------------------------------------- | :--------------------: | :--------------: | :-------------------: | :------------------: | :-----------------: | :---------: | :-----------------: | :-------------: |
| **VoucherStudio** (Voucher Studio)         |          SIM           |     **NÃO**      | SIM (`useCORS: true`) |         SIM          |         SIM         |     SIM     |         SIM         |       SIM       |
| **pdf-generator.ts** (Módulo Viagens)      |          SIM           |     **NÃO**      | SIM (`useCORS: true`) |         SIM          |         SIM         |     SIM     |       **NÃO**       |       SIM       |
| **ExportPdfButton** (Orçamentos/Propostas) |          SIM           |     **NÃO**      | SIM (`useCORS: true`) |         SIM          |         SIM         |     SIM     |       **NÃO**       |       SIM       |
| **CardDetailPanel** (Cartão de Embarque)   |          SIM           |     **NÃO**      | SIM (`useCORS: true`) |         SIM          |         SIM         |     SIM     |       **NÃO**       |       SIM       |

## 2. Detalhes Críticos de Renderização

1. **Gargalo de Imagens Externas:** Nenhum dos renderizadores implementa um promise check (`Promise.all(images.map(...))`) para garantir que todos os elementos `<img>` do DOM estejam completamente carregados (`img.complete === true`) antes de disparar o `html2canvas`. Isso causa falhas de renderização (imagens em branco/cortadas) se a exportação for feita durante o carregamento de recursos.
2. **CORS em Fontes Google:** A injeção dinâmica de fontes em `agency-context.tsx` funciona corretamente no navegador, mas o `html2canvas` precisa de configurações específicas de segurança no servidor CDN das fontes para renderizar os textos com a tipografia selecionada. Caso o CORS falhe, o texto é desenhado com fontes genéricas do sistema (`sans-serif`), gerando diferenças de layout no PDF exportado.
3. **Limitação de Story no VoucherStudio:** A exportação de Story (proporção 9:16) no `VoucherStudio.tsx` gera um arquivo PNG através do `exportStoryPng()`. O código utiliza o elemento `#story-canvas` ou `#story-preview-canvas` e realiza o download local, mas não salva esse asset de Story no Supabase Storage (ao contrário do PDF A4, que chama o callback `onPdfGenerated` para persistência em nuvem).

## 3. Comportamento do Brand Kit em Telas Diferentes

O Brand Kit gerencia a identidade visual (Cores primárias, secundárias, background e tipografias) por agência. A propagação ocorre da seguinte forma:

1. **Dashboard e Layout Interno:** Sincronizado e propagado dinamicamente via variáveis CSS (ex: `--brand-primary`, `--brand-secondary`). Funciona corretamente.
2. **Páginas Públicas (Checkout e Portais):** Carregam a partir do preloaded agency ou consulta ao banco. No entanto, o checkout público [p.$agency_slug.tour.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.tour.$id.tsx) não implementa cache de localStorage para o Brand Kit da agência pública, gerando flash visual nas cores default antes de baixar as configurações da agência via API.
3. **Persistência do Cache pós-Logout:** Como detalhado em relatórios anteriores, a persistência no `localStorage` não é limpa. Se outro operador/usuário fizer login no mesmo navegador para outra agência, os estilos antigos podem aparecer durante o primeiro ciclo de renderização.
