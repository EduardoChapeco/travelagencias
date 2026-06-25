# 11. Divergências entre Local, Main e Produção

Este documento detalha o mapeamento de discrepâncias técnicas, de configuração e de infraestrutura entre o ambiente de desenvolvimento local, o ramo `main` do Git e a infraestrutura de produção ativa no Cloudflare e Supabase Cloud.

---

## 1. Mapeamento de Ambientes

### 1.1 Ambiente de Desenvolvimento Local
*   **Banco de Dados**: Instância PostgreSQL rodando localmente (Supabase CLI/Docker) ou conectada diretamente à branch de desenvolvimento no Supabase Cloud.
*   **Servidor Web**: Vite Dev Server executando em modo SPA/SSR local.
*   **Variáveis de Ambiente**: Lidas do arquivo `.env` local, onde chaves de API secundárias podem estar vazias ou apontando para sandboxes.

### 1.2 Ramo Main (Git Baseline)
*   **Código-Fonte**: Contém a especificação canônica do código. Após a resolução das tipagens contábeis e de inteligência de destinos na presente auditoria, o código do ramo `main` compila com **zero erros** e gera builds estáveis.
*   **Configurações**: Wrangler.toml configurado para integração contínua (CI/CD) com o Cloudflare Pages.

### 1.3 Ambiente de Produção (Remote Cloud)
*   **Hospedagem**: Cloudflare Pages (Frontend e SSR) + Supabase Cloud (Banco de Dados, RLS, Storage e Auth).
*   **Edge Functions**: Deno Deploy integrado ao Supabase para execução de RAG, OCR e webhooks do WhatsApp.

---

## 2. Divergências e Riscos Identificados

### 2.1 Latência e Desempenho de Consultas
*   *Divergência*: Consultas e agregações contábeis client-side que funcionam instantaneamente com volumes pequenos locais podem falhar por timeout ou apresentar lentidão crítica em produção com milhares de registros.
*   *Resolução*: Resolvido pela centralização de cálculos complexos na vista SQL `group_tours_financial_summary`, permitindo paginação e indexação nativas.

### 2.2 Limitações do Runtime de Produção (SSR Cloudflare)
*   *Divergência*: O ambiente do Cloudflare Workers possui restrições estritas de APIs globais do navegador (como a ausência de `window` ou `document`). A biblioteca de higienização de HTML `isomorphic-dompurify` causava quebras de execução (500 Internal Server Error) em produção.
*   *Resolução*: A biblioteca foi substituída por `dompurify` envelopada condicionalmente para ignorar a fase de renderização do servidor (SSR), mantendo a build estável e segura contra XSS.

### 2.3 Sincronização de Migrações e Schemas do Supabase
*   *Divergência*: Timestamps de migrações locais gerados incorretamente criavam conflitos com o histórico de migrações aplicadas no banco de produção remoto, bloqueando deployments automáticos.
*   *Resolução*: Os conflitos foram mitigados pela consolidação técnica do histórico de migrações e higienização dos arquivos SQL duplicados no diretório `supabase/migrations`.
