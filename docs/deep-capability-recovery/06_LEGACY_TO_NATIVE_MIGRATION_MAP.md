# 06. Legacy to Native Migration Map (Estratégia de Migração)

Este relatório descreve o plano de migração de componentes legados para o ecossistema moderno do TravelOS, com foco no Strangler Pattern.

---

## 1. Migração de Inbox/Omnichannel

### 1.1 Coexistência de Schemas (Concorrência)
* **Estrutura Antiga (Omnichannel):** Utilizava as tabelas `omnichannel_sessions` e `omnichannel_messages`.
* **Estrutura Nova (Inbox):** Utiliza as tabelas `conversations`, `messages`, `channels` e `contacts`.
* **Risco:** As Edge Functions de WhatsApp já haviam sido migradas para gravar na tabela nova `conversations`, deixando a leitura do Omnichannel antigo órfã.
* **Estratégia de Migração (Strangler Pattern):**
  1. **Consolidação:** Migramos a UI rica do Omnichannel para a rota principal `/inbox` e a direcionamos para ler e escrever de forma nativa e exclusiva nas tabelas novas (`conversations`, `messages`).
  2. **Compatibilidade:** Criamos o mapeamento dos campos antigos de áudio e anexo para salvar em `messages.media_url` e `messages.body` de forma alinhada.
  3. **Depreciação:** As tabelas antigas `omnichannel_*` serão mantidas em modo inativo no banco por 30 dias para auditoria de histórico, sendo excluídas em migração futura após homologação completa.

---

## 2. Migração de Agenda e Tarefas

### 2.1 Separação Contextual
* **Legado:** As tarefas do Kanban tinham schemas de chave estrangeira quebrados, apontando diretamente para `auth.users` no REST, impedindo o carregamento em runtime por falta de acesso direto do frontend.
* **Resolução:** A migration `20260802000000_fix_tasks_foreign_keys.sql` moveu as constraints de `assigned_to` e `created_by` para apontarem para `public.profiles(id)`. O código do React Query foi atualizado para fazer JOIN nativo com `profiles`, limpando erros em runtime e acelerando o tempo de carregamento de tarefas.
