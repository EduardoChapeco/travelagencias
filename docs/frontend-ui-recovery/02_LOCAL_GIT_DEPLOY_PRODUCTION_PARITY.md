# PARIDADE LOCAL / GIT / STAGING / PRODUÇÃO

| ARQUIVO OU RECURSO | LOCAL | GIT | ORIGIN | BUILD | PRODUÇÃO | DIVERGÊNCIA | AÇÃO |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Commit HEAD** | `d64329c` | `d64329c` | `f9ee366` | NA | Desconhecido (não verificado) | Local possui 5 commits a mais | Push após aprovação / testes. |
| **`design.css`** | Sim | Sim (HEAD) | Não | Sim (local) | Não | Produção usa root quebrado | Deploy Cloudflare após QA. |
| **`package.json`** | Com `design:check` | Com `design:check` | Sem scripts | Roda | Sem scripts | Build de prod não linta o design | Rodar deploy remoto. |
| **Migrations** | Até `...keys.sql` | `...keys.sql` | Até `20260707201224` | NA | Aplicadas no remoto | Nenhuma | Banco Remoto validado. |
