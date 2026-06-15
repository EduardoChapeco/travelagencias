# MIGRACAO_BACKUP_SEGURA.md NÃO ENCONTRADO

**ALERTA DE SEGURANÇA E INTEGRIDADE DE DADOS**

Procurei pelo arquivo `MIGRACAO_BACKUP_SEGURA.md` (o qual deveria conter o mapa completo da infraestrutura Lovable/Supabase, schemas, policies, hooks, functions, etc.) no repositório `travelagencias` (`https://github.com/EduardoChapeco/travelagencias-9d2bd1fc.git`) e ele **não foi encontrado** na raiz nem em nenhum subdiretório do projeto.

## O que foi verificado:

- Busca via `grep` por `MIGRACAO_BACKUP_SEGURA` em todos os arquivos de texto e markdown.
- Listagem da pasta raiz do projeto. O arquivo não está presente entre os arquivos clonados.

## Ação Necessária (Humano):

Para prosseguir de maneira 100% segura sem perder referências, chaves, políticas RLS, dependências de storage e integrações com o ambiente Lovable, **você precisa solicitar ao Lovable que gere este arquivo**.

> [!WARNING]
> Sem este arquivo, realizar uma migração para o novo Supabase significa depender apenas das migrations locais (que frequentemente não incluem as configurações de painel, secrets, triggers específicas criadas via UI e webhooks do Lovable).

Por favor, gere o arquivo `MIGRACAO_BACKUP_SEGURA.md` com o Lovable, coloque-o na raiz deste projeto, e me avise.

**Exceção:** Se você tiver absoluta certeza que podemos prosseguir apenas com as migrations e Edge Functions que estão no código atual (pasta `supabase/`), me dê a ordem expressa: _"Autorizo prosseguir a migração às cegas sem o MIGRACAO_BACKUP_SEGURA"_. (Não recomendado, mas prosseguirei se for a sua decisão).
