# INCIDENTE DE SEGURANÇA: EXPOSIÇÃO DE SECRETS

## Identificação
- **Variáveis Vazadas:** `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` e suas respectivas chaves prefixadas com `VITE_`.
- **Arquivos Envolvidos:** `.env`
- **Commits Expostos:** `4ecb7215`, `bc884424`, `269798ea`, `33f60506`.

## Classificação do Incidente
**Severidade:** MÉDIA / ALTA (Dependendo do RLS ativo no Supabase). As chaves expostas são de acesso anônimo (Anon Key) que, se o Row Level Security estiver vulnerável, podem permitir by-pass de leitura/escrita no DB. Nenhum `SERVICE_ROLE` key foi vazado.

## Impacto
O histórico do repositório no Github retém a visualização dos commits passados, o que significa que remover o arquivo `.env` da branch atual (HEAD) não o elimina da árvore de commits `origin`. Qualquer pessoa com acesso ao repositório pode navegar no histórico e coletar a chave.

## Plano de Correção e Rotação
1. **Rotação Necessária:** O `SUPABASE_PUBLISHABLE_KEY` precisa ser revogado e regerado via painel do Supabase.
2. **Limpeza de Histórico (Ação Manual Pendente):** A reescrita automatizada via `git filter-branch` foi abortada por tomar tempo não viável (>15 min) e gerar corrupção potencial no ambiente local. O comando `git filter-repo --path .env --invert-paths` ou BFG Repo-Cleaner DEVE ser executado pelo administrador de repositório de forma isolada, antes do próximo `git push --force`.
3. **Bloqueio no Git:** A regra `*.env` já foi validada no `.gitignore` no commit `33f60506`.
