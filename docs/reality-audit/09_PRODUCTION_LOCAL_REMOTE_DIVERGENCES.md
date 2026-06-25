# Divergências Local vs. Repositório vs. Produção

Este documento detalha o desalinhamento de estados entre o repositório git local, a branch remota e o banco de dados Supabase de produção.

---

## 🔀 Divergências no Repositório (Git)

1. **Commits Locais à Frente**:
   - O repositório local está **3 commits à frente** da branch `origin/main` remota.
   - Commits pendentes de push incluem correções fundamentais de rooming list (`2ac19cc`), scripts de aumento de heap de memória (`60240f4`) e a nova estrutura de sidebar contextual (`c594808`).
2. **Modificações Locais Não Comitadas**:
   - Existem **31 arquivos modificados** de forma ativa no diretório de trabalho. As alterações incluem refatorações estruturais de code-splitting das rotas principais (CRM, Omnichannel, Excursões) e o orquestrador de IA.
3. **Arquivos Não Rastreados (Untracked)**:
   - Os arquivos de migração corretivos de banco (`20260702000000_group_rooming_list_status.sql`, `20260703000000_group_hub_corrective_rpcs.sql`, `20260710000000_ai_orchestrator_schema.sql`) constam como não rastreados no Git local, o que significa que o histórico do Git da equipe de produção não possui qualquer registro dessas modificações de schema.

---

## 💾 Divergências do Banco de Dados (Supabase Remote)

1. **Migrations Locais Pendentes**:
   - As migrações locais que definem o schema de orquestração de IA (`ai_providers`, `ai_models`, `ai_api_credentials`, `ai_jobs`, `ai_job_attempts`) e a RPC `pick_active_api_key` foram criadas fisicamente na pasta local, mas não há registro automatizado de que tenham sido executadas ou auditadas no banco de dados de produção.
2. **Contratos TypeScript desatualizados**:
   - O arquivo `types.ts` local do frontend está em descompasso com as migrations locais criadas, visto que as novas tabelas de orquestração de chaves de IA **não** estão declaradas nos tipos estáticos exportados do banco.
