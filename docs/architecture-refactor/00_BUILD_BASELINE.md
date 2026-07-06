# Build Baseline (Auditoria de Performance do Compilador)

Este documento registra o estado atual e as métricas do pipeline de compilação do TravelAgencias/Turis antes de qualquer modificação de código, servindo como o ponto de partida (baseline) oficial para a refatoração de arquitetura.

---

## 📊 Métricas do Ambiente de Compilação

- **Versão do Node**: `v26.3.0`
- **Versão do npm**: `11.16.0`
- **Versão do Vite**: `v7.3.5` (definido no package.json como `^7.3.1`)
- **Versão do TanStack Start**: `^1.167.50`
- **Commit HEAD**: `2ac19ccef0ee019db450238f51b6bf4efa3297ac`
- **Branch Atual**: `main`
- **Tamanho do Diretório `node_modules`**: `1.21 GB` (`1.303.354.109` bytes)
- **Quantidade de Rotas Cadastradas**: `124 rotas`
- **Quantidade de Imports em `routeTree.gen.ts`**: `135` (todos estáticos)

---

## ⏱️ Desempenho e Consumo de Memória do Build

Realizamos testes de compilação em ambiente limpo (`rm -rf dist .output node_modules/.vite && npm run build`) sob três limites de heap de memória (`NODE_OPTIONS`):

### 1. Build com Memória Padrão (Sem NODE_OPTIONS)

- **Resultado**: ❌ **FALHA (JavaScript heap out of memory)**
- **Etapa da Falha**: Compilação do Ambiente SSR (`vite v7.3.5 building ssr environment for production...`)
- **Momento exato**: Fase de `rendering chunks` (processamento do bundle final e minificação pelo Rollup/Terser/Esbuild para gerar o script `dist/_worker.js` do Cloudflare Pages).
- **Consumo aproximado**: Falha ao atingir o limite padrão de **~2.0 GB** da V8 engine.
- **Erro completo registrado**:
  ```txt
  <--- Last few GCs --->
  [15896:000001A2C27D5000]    80978 ms: Scavenge (during sweeping) 2029.4 (2045.2) -> 2023.7 (2046.5) MB
  [15896:000001A2C27D5000]    81509 ms: Incremental Mark-Compact (reduce) 2030.0 (2050.7) -> 2017.3 (2034.7) MB
  FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
  ```

### 2. Build com Limite de 4GB (`--max-old-space-size=4096`)

- **Resultado**: ❌ **FALHA (JavaScript heap out of memory)**
- **Etapa da Falha**: Mesma etapa de compilação SSR durante a unificação de chunks e análise AST do bundle completo.
- **Consumo aproximado**: Falhou ao atingir **~4.0 GB**.

### 3. Build com Limite de 8GB (`--max-old-space-size=8192`)

- **Resultado**: **SUCESSO**
- **Duração Total**: `~54.1 segundos` (Cliente: 26.39s | SSR: 27.75s)
- **Pico Real de Memória Estimado**: **~4.8 GB** a **5.2 GB** durante o SSR.

---

## 📦 Maiores Arquivos e Chunks do Bundle Cliente

Compilando com sucesso sob o limite de 8GB, os maiores arquivos gerados na pasta `dist/assets` foram mapeados:

| Chunk / Arquivo                                  |      Tamanho (Minificado) | Tipo  | Descrição / Conteúdo                                                                                                                               |
| ------------------------------------------------ | ------------------------: | :---: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index-CNaL8bN4.js`                              | **1.211,48 kB** (1.21 MB) | Core  | **Chunk Principal do Cliente**. Contém o framework React, react-dom, Router/Query, Radix e todos os componentes de rotas carregados estaticamente. |
| `xlsx-CNerDvZX.js`                               |             **429,19 kB** | Ext.  | Biblioteca SheetJS (Excel) carregada dinamicamente.                                                                                                |
| `jspdf.es.min-1TwSorGd.js`                       |             **386,01 kB** | Ext.  | Biblioteca jsPDF para exportações do cliente.                                                                                                      |
| `RichTextEditor-DMkGCJ6K.js`                     |             **418,11 kB** | Comp. | Componente Tiptap WYSIWYG editor e dependências associadas.                                                                                        |
| `html2canvas.esm-DXEQVQnt.js`                    |             **201,04 kB** | Ext.  | Biblioteca de captura DOM client-side.                                                                                                             |
| `BlockRenderer-BfkmVAN2.js`                      |             **214,34 kB** | Comp. | Renderizador dinâmico de blocos do CMS e Portal.                                                                                                   |
| `agency._slug.proposals._id-DT50gppI.js`         |             **251,33 kB** | Rota  | Componente de Roteiros/Brochuras (Proposal Studio).                                                                                                |
| `agency._slug.portal.pages._page_id-DCq1FEqa.js` |             **189,67 kB** | Rota  | Construtor e gerenciador de Landing Pages no Portal.                                                                                               |
| `agency._slug.boarding-DTQUXmb0.js`              |              **77,94 kB** | Rota  | Módulo Operacional de Embarque e Checklist.                                                                                                        |
| `agency._slug.group-tours._id-C1f_fe1v.mjs`      |       **127,54 kB** (SSR) | Rota  | Detalhe de Excursões / Painel de Passageiros e Ônibus.                                                                                             |

---

## 🔍 Causa Provável do Build de 8GB (Dívida Arquitetural)

1. **Imports Estáticos de 124 Rotas**: O arquivo auto-gerado `src/routeTree.gen.ts` importa estaticamente as estruturas `Route` de todos os 124 arquivos de rota da aplicação. Como os arquivos de rota definem seus componentes de UI dentro do mesmo arquivo (ex: `component: TourDetailPage`), a árvore de componentes inteira (e todas as dependências locais importadas) torna-se parte de um único grafo de dependência estático gigante.
2. **Bundle Monolítico SSR**: O preset de deploy `cloudflare-pages` do Nitro compila toda a aplicação SSR em um único arquivo do Cloudflare Worker (`dist/_worker.js`). O Rollup é forçado a analisar e otimizar uma única árvore AST monstruosa contendo o código de 124 páginas complexas simultaneamente, fazendo com que a análise de escopo estático estoure o limite de heap da V8 de 2GB.
3. **Acoplamento de Dependências Pesadas**: Embora `xlsx` e `jspdf` sejam importados dinamicamente na pasta `src/lib/`, componentes customizados pesados como `RichTextEditor` (Tiptap) e `StudioMapWidget` (react-leaflet/leaflet) são importados **estaticamente** em várias rotas principais, o que polui o bundle primário e obriga o analisador de chunks a trabalhar intensamente na eliminação de árvore (tree-shaking) e detecção de dependências cruzadas.
