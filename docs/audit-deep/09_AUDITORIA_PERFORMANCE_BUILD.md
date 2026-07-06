# 09. Auditoria de Performance e Build de Produção

Este documento analisa o comportamento da build de produção do Vite, o empacotamento de pacotes (chunks), consumo de memória em CI/CD e estratégias de carregamento assíncrono.

---

## 1. Análise da Configuração de Build (`vite.config.ts`)

- **Configuração Atual:** A build utiliza o encapsulador customizado `@lovable.dev/vite-tanstack-config` com preset `cloudflare-pages`.
- **Tratamento de PWA:** Implementa o plugin `vite-plugin-pwa` de forma customizada (`safePwaPlugins`) com ganchos envolvidos para evitar a execução do Workbox durante a build de SSR (Server-Side Rendering). Isso corrige problemas históricos de geração de cache precache em builds híbridas.
- **Gargalo de Memória (Build OOM - Out of Memory):**
  - O deploy em produção depende da instrução `--max-old-space-size=4096` no script de CI/CD para evitar travamentos de memória.
  - **Causa Raiz:** O arquivo `vite.config.ts` **não possui** lógica explícita de `rollupOptions.output.manualChunks` ou minificação agressiva. Ao compilar um sistema denso como o Turis (que importa Lucide Icons de forma massiva, Leaflet para mapas, Recharts para gráficos financeiros, Tiptap como editor rico, html2canvas e jsPDF para geração de documentos), o compilador consome toda a memória heap padrão do Node.js.
  - **Correção Recomendada:** Configurar manualChunks no Rollup para separar as dependências pesadas (`@supabase/supabase-js`, `leaflet`, `recharts`, `jspdf`, `html2canvas`) em chunks independentes, otimizando o cacheamento do navegador e diminuindo a pegada de processamento da build.

---

## 2. Abordagem de Lazy Loading no Frontend

- **Componentes Críticos Identificados:**
  - O editor visual do portal CMS e o `VoucherStudio` são importados de forma direta.
  - O mapa do Leaflet na visualização de destinos também é acoplado.
  - **Problema:** A falta de `React.lazy` ou `@tanstack/react-router` lazy loader nestes componentes faz com que o chunk inicial (`index.js`) do painel administrativo fique extremamente pesado (acima de 1.5MB), prejudicando os tempos de carregamento iniciais em conexões 3G/4G e elevando a métrica LCP (Largest Contentful Paint).
  - **Correção Recomendada:** Utilizar imports dinâmicos (`import()`) e carregamento lazy para bibliotecas de mapas, gráficos e geração de PDFs, injetando-os sob demanda apenas quando as respectivas abas (ex: "Financeiro DRE" ou "Vouchers") forem acessadas pelo agente.
