# 08. Invariantes de Banco de Dados e Sincronização de Migrações

Este documento audita as garantias físicas de integridade (constraints, índices e foreign keys) e detalha o status de sincronização das migrações do banco de dados remoto.

---

## 1. Status das Migrações (Local vs. Remoto)

Realizamos uma consulta direta à tabela `supabase_migrations.schema_migrations` na instância do banco de dados remota (`esmppoxxnyiscidzsjvy`), comparando com o diretório local de migrações:
* **Matched (Aplicadas com Sucesso)**: **207 migrações**.
* **Plataformas Sincronizadas**: 100% de paridade física de arquivos. Todas as migrações locais, incluindo as últimas de omnichannel, segurança RLS de tokens de WhatsApp, chaves estrangeiras de pacotes e RFPs (até `20260730000004`), foram completamente aplicadas no Supabase remoto.

---

## 2. Invariantes de Negócio Protegidas no Banco

O banco de dados do **Turis** atua como a camada de defesa definitiva da integridade dos dados, protegendo as seguintes invariantes operacionais:

### A. Integridade Relacional Omnichannel
* **Invariante**: Uma mensagem não pode ser inserida sem pertencer a uma sessão ativa, e a sessão deve obrigatoriamente estar vinculada à agência proprietária.
* **Mecanismo de Defesa**:
  * Chaves estrangeiras com integridade relacional:
    ```sql
    session_id uuid REFERENCES public.omnichannel_sessions(id) ON DELETE CASCADE
    agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE
    ```

### B. Idempotência de Webhooks Meta
* **Invariante**: Mensagens duplicadas enviadas pela Meta em caso de instabilidade de rede não podem ser inseridas duas vezes.
* **Mecanismo de Defesa**: Índice físico de unicidade parcial na tabela `omnichannel_messages` para a coluna `external_message_id`:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS omnichannel_messages_external_id_uidx 
    ON public.omnichannel_messages(external_message_id) 
    WHERE external_message_id IS NOT NULL;
  ```

### C. Consistência do Scorecard de Cotações
* **Invariante**: Um scorecard de avaliação não pode existir de forma órfã sem estar associado a um candidato de pacote existente.
* **Mecanismo de Defesa**:
  * A tabela `package_scorecards` vincula-se a `package_candidates` com restrição de exclusão física:
    ```sql
    package_candidate_id uuid REFERENCES public.package_candidates(id) ON DELETE CASCADE
    ```

### D. Imutabilidade e Integridade do Caixa
* **Invariante**: Lançamentos e alterações de caixas fechados ou modificados por terceiros devem ser rastreáveis de forma indelével.
* **Mecanismo de Defesa**: Triggers de banco `audit_cash_sessions_trigger` e `audit_cash_transactions_trigger` interceptam comandos INSERT, UPDATE e DELETE e inserem registros na tabela de auditoria `cash_audit_logs`, protegidos por RLS.
