# 07. Performance e Auditoria de Build - TravelOS

Este documento apresenta a análise de gargalos de compilação, consumo excessivo de memória no empacotamento (build), chunks gigantes e problemas de performance causados por re-renderizações desnecessárias.

---

## 1. Gargalos e OOM (Out of Memory) no Build

Durante o empacotamento de produção (`npm run build`), o compilador Vite/Rollup excedeu o limite de heap padrão do JavaScript, disparando o seguinte erro fatal:
`FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`

### 1.1 Causa Raiz do OOM
* **Tamanho de Chunks de Terceiros:** A inclusão de bibliotecas pesadas como `xlsx` (~866kB), `jspdf` (~476kB), `recharts` (~525kB) e `leaflet` (~387kB) de forma síncrona no mesmo bundle principal causa grande pressão na memória do Node.js durante o processo de minificação e geração de source maps.
* **Componentes Monolíticos e Imports Circulares:** Arquivos de rotas extensos como `client.trips.$id.tsx` (~1.900 linhas) e `VoucherStudio.tsx` (~800 linhas) importam de forma direta dezenas de outros sub-componentes, impedindo o tree-shaking eficiente do Rollup.

### 1.2 Ações Corretivas Executadas e Recomendadas
* **Executada (Contorno imediato):** Elevação da memória do Node para 8GB no comando de build:
  `$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build`
* **Recomendada (Definitiva):** Aplicar lazy loading em componentes pesados e mover bibliotecas de exportação (como `xlsx` e `jspdf`) para carregamento assíncrono sob demanda via `import()` dinâmico.

---

## 2. Chunk Splitting e Tamanho de Arquivos

O build final do Vite revelou o tamanho real dos chunks gerados para o lado do servidor (SSR) e do cliente:

* **dist/_worker.js/_libs/xlsx.mjs**: `866.51 kB` (Chunk crítico)
* **dist/_worker.js/_libs/recharts.mjs**: `525.89 kB`
* **dist/_worker.js/_libs/jspdf.mjs**: `476.82 kB`
* **dist/_worker.js/_libs/leaflet.mjs**: `387.09 kB`
* **dist/_worker.js/_ssr/agency._slug.portal.pages._page_id-C63KzOjK.mjs**: `339.91 kB`
* **dist/_worker.js/_ssr/agency._slug.proposals._id-DcayGvA9.mjs**: `151.57 kB`
* **dist/_worker.js/_ssr/agency._slug.boarding-DVAL4IO6.mjs**: `140.35 kB`

### Estratégia de Code Splitting
Utilizar o Dynamic Import do React/Vite para carregar componentes pesados de exportação e edição apenas quando o usuário de fato abrir a tela correspondente:
```ts
// Exemplo de import dinâmico para a biblioteca XLSX
const XLSX = await import('xlsx');
```

---

## 3. Desempenho e Re-renderizações no Frontend

* **VoucherStudio Canvas Render:** O estado de cores, posições de texto e variáveis do Brand Kit do VoucherStudio está centralizado no estado raiz do componente. Qualquer mudança mínima de cor ou ajuste de margem provoca a re-renderização completa do painel de preview do voucher A4 e Story.
  * *Correção:* Isolar o estado do configurador de cores usando gerenciadores de estado locais ou `useMemo` / `React.memo` no canvas de preview tipográfico.
* **Falta de Paginação no Kanban de Leads:** O CRM Kanban Board carrega todos os leads ativos em uma única consulta síncrona. Em agências com grande volume de leads, a tela sofre de lags severos de renderização ao mover cards de estágio.
  * *Correção:* Aplicar paginação na busca e carregamento progressivo de cards no Kanban.
