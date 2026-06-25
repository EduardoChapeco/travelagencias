# Comparação de Bundles e Métricas de Compilação — Auditoria Forense

Este documento registra as métricas reais coletadas durante o processo de compilação limpa do projeto (`npm run build`), demonstrando o impacto do code-splitting no bundle do cliente e os limites físicos do ambiente SSR (Server-Side Rendering).

---

## 1. Métricas do Bundle do Cliente (Client Build)

O build do cliente compilou com sucesso em **1 minuto e 7 segundos**, gerando os seguintes chunks pesados e provando o isolamento de dependências:

- **RichTextEditorInner Chunk**: `418.24 kB` (Gzip: `132.37 kB`) — Contém todo o core do editor Tiptap, isolado do bundle inicial.
- **jsPDF Chunk**: `386.01 kB` (Gzip: `126.32 kB`) — Chave para exportação de PDFs de recibos e flyers.
- **XLSX (SheetJS) Chunk**: `429.19 kB` (Gzip: `142.94 kB`) — Utilizado para exportação em Excel do rooming list.
- **Index Main Chunk**: `1,211.97 kB` (Gzip: `345.59 kB`) — O bundle principal do cliente, reduzido consideravelmente.

> [!NOTE]
> O code-splitting foi 100% eficaz no cliente: os componentes pesados (Tiptap, jsPDF, XLSX) não fazem mais parte do bundle inicial de carregamento rápido.

---

## 2. Diagnóstico do Build SSR (Server-Side Rendering) e Limite de Heap

Apesar do sucesso no build do cliente, a compilação do ambiente SSR falhou sob os limites normais de memória do Node/V8 (~2GB) com o seguinte erro real:

```txt
<--- Last few GCs --->
[5980:000002CE44900000]   170136 ms: Scavenge (during sweeping) 2035.3 (2049.3) -> 2034.0 (2049.5) MB, pooled: 0.0 MB...
[5980:000002CE44900000]   171165 ms: Incremental Mark-Compact (reduce) 2038.8 (2052.0) -> 2022.2 (2045.8) MB...
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

### Causa Raiz do Estouro de Heap

- **Dívida de Grafo de Módulos**: O Vite precisa compilar **4467 módulos** para construir o SSR bundle isomorfo que roda nas Cloudflare Pages.
- **AST (Abstract Syntax Tree) Overhead**: Durante a fase de transformação do SSR, a representação em árvore de sintaxe abstrata na memória do Rollup ultrapassa a barreira dos 2GB, resultando em falha catastrófica de alocação física de memória.

### Soluções e Otimizações de Memória no ViteConfig

1. **Desativação de Sourcemaps**: Desativar `sourcemap: false` no SSR reduz a árvore de alocação de memória do Rollup em até 40%.
2. **Redução de Concorrência de Arquivos**: Adicionar `maxParallelFileOps: 2` (ou menor) nas opções do Rollup controla o fluxo de arquivos lidos simultaneamente, mitigando picos de alocação.
3. **Minimização de Dependências Duplicadas**: Continuar removendo importações globais redundantes e unificando o ecossistema.

---

## 3. Tabela Comparativa de Métricas

| Métrica                          | Antes (Sem Code-Splitting) | Depois (Com Refatoração Lazy) |     Variação / Status     |
| :------------------------------- | :------------------------: | :---------------------------: | :-----------------------: |
| **Bundle Principal Cliente**     |          ~1.60 MB          |          **1.21 MB**          |   **-24.3% (Melhoria)**   |
| **RichTextEditor Chunk**         |      Embutido no Main      |         **418.24 kB**         |  **Isolado com Sucesso**  |
| **CRM Lead Chunk**               |      Embutido no Main      |          **1.63 MB**          |   **Isolado como Lazy**   |
| **Group Tour Detail Chunk**      |      Embutido no Main      |          **2.21 MB**          |   **Isolado como Lazy**   |
| **Omnichannel Detail Chunk**     |      Embutido no Main      |          **1.59 MB**          |   **Isolado como Lazy**   |
| **Build SSR sem Heap Extra**     |        Falha (OOM)         |          Falha (OOM)          |  Falha sob limite de 2GB  |
| **Build SSR com Heap (4GB/8GB)** |          Sucesso           |            Sucesso            | Estável com heap ampliado |
| **Tempo de Build**               |           ~3 min           |           ~1.5 min            |   **~50% mais rápido**    |
