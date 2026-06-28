# 01. Git Deletion and Simplification Forensics (Auditoria do Histórico Git)

Este relatório detalha a auditoria forense do histórico de commits do Git para identificar arquivos, rotas e módulos que foram removidos, simplificados ou desconfigurados em iterações recentes.

---

## 1. Módulos e Arquivos Removidos ou Simplificados

### 1.1 Módulo Omnichannel vs. Inbox Novo
* **Histórico:** O módulo Omnichannel completo estava implementado originalmente em `src/routes/agency.$slug.omnichannel.lazy.tsx` com suporte a reprodução/gravação de áudios, gerenciador de templates rápidos de IA, upload de documentos do cliente e mutações de importação de lead.
* **Simplificação:** O módulo foi substituído temporariamente por `src/routes/agency.$slug.inbox.tsx` contendo apenas uma interface básica de mensagens sem paridade operacional (sem controle de mídia, sem painéis de lead e sem os botões de ações automáticas).
* **Solução de Auditoria:** Restauramos a totalidade dos recursos do Omnichannel e os consolidamos na rota principal `/inbox`. O arquivo duplicado legada `agency.$slug.omnichannel.lazy.tsx` foi removido com segurança via Git.

### 1.2 Layout de Abas Contextuais de Tarefas
* **Histórico:** A barra superior do quadro de tarefas continha abas horizontais e switchers que foram duplicados, gerando lentidão e poluição visual ("cara de IA").
* **Simplificação:** Removemos o menutabs horizontal redundante da página principal, delegando o controle de visões contextuais de tarefas exclusivamente à barra lateral esquerda contextual de tarefas, sincronizada via query parameters do roteador (`?view=kanban`, `?view=my-day`).

---

## 2. Rastreabilidade de Commits de Regressão

Com base na varredura do git log, identificamos as transições de código mais críticas:
1. **Commit `f16d2ef`:** Introduziu as abas da Fase 4 e iniciou a limpeza das triggers de WhatsApp, porém simplificou a lógica de mutações de RLS de tarefas.
2. **Commit `dd831cf`:** Unificou cabeçalhos de visual de IA, mas removeu chaves estrangeiras que apontavam para `auth.users` quebrando consultas em runtime. Corrigido com migration incremental apontando para `public.profiles`.
3. **Commit `dff8fda`:** Reestruturou as sidebars promovendo Inbox e Calendário para aSlimSidebar extrema esquerda, mas causou sobreposições no carregamento de rotas lazy.
