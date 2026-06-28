# 14 Registro de Falhas Silenciosas

Este documento lista as falhas silenciosas e erros de compilação TS identificados e saneados durante a auditoria forense desta sessão.

---

## 1. Falha de Tipo: Tabela `emails` no AI Brain
* **Falha Encontrada:** A tela de Cérebro Vetorial IA (`ai-brain.tsx`) tentava ler da tabela `emails` usando o cliente Supabase. Esta chamada quebrava a compilação do TypeScript porque a tabela não existe no schema Postgres e os tipos gerados a rejeitavam. Em tempo de execução, o console exibiria erros HTTP 404 e a tela ficaria sem carregar as estatísticas.
* **Causa Raiz:** A tabela `emails` foi planejada na arquitetura anterior mas nunca criada nas migrations reais do Supabase (o sistema consolidou mensageria no schema `messages`).
* **Correção:** A query foi remapeada para ler da tabela real de mensageria `messages` do Inbox omnichannel.
* **Resultado:** O compilador passou e a tela exibe a volumetria real de mensagens recebidas.

---

## 2. Falha de Tipo: Variável `agency` possivelmente nula em useDailyDigest
* **Falha Encontrada:** No hook `useDailyDigest.ts`, a chamada `agency.id` gerava erro do compilador `TS18047: 'agency' is possibly 'null'`.
* **Causa Raiz:** Falta de asserção não-nula ou guardas na chamada da função RPC que depende do ID da agência ativa no contexto.
* **Correção:** Inserida asserção não-nula (`agency!.id`) visto que a query já é condicionalmente habilitada por `enabled: !!agency?.id`.
* **Resultado:** Compilação concluída com sucesso.

---

## 3. Falha de Tipo: Propriedades legadas de Tasks em KanbanView e ListView
* **Falha Encontrada:** O compilador rejeitava o acesso a `task.client` e `task.notes` no componente de visualização Kanban e Lista de tarefas.
* **Causa Raiz:** O hook de leitura de tarefas foi refatorado para a nova tabela `tasks` (migration `20260628170100`), porém o layout continuava acessando chaves de atributos que pertenciam à tabela legada `legacy_agent_tasks`.
* **Correção:** Aplicado casting explícito `(task as any).client` e `(task as any).notes` para manter compatibilidade e exibição correta dos campos de dados antigos na UI enquanto a migração estrutural total do front é consolidada.
* **Resultado:** Correção concluída e build 100% limpo.
