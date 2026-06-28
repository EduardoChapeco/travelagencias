# 21. Corrective Execution Plan (Plano Corretivo de Execução)

## 1. Escopo de Correção de Mocks e Pendências (Roadmap Real)

### Prioridade P0: Saneamento e Segurança
1. **Remoção de Drift de Migrations:** Aplicar as tabelas legais `data_subject_requests` e `data_subject_request_evidence` e as novas colunas de `whatsapp_connections` na instância de produção remota do Supabase.
2. **Secrets nos Webhooks:** Validar em produção as variáveis de ambiente `META_APP_SECRET` e `META_VERIFY_TOKEN`.

### Prioridade P1: Fluxos Reais Meta e CRM
1. **Embedded Signup Frontend:** Adicionar o botão oficial de Login com Facebook na aba de WhatsApp integrando com o SDK da Meta, coletando o authorization code e enviando para troca pelo token no backend.
2. **Instagram Messaging Webhook & Sender:** Implementar o recebimento de direct messages no webhook e suporte a envio de respostas da página para o Instagram no `whatsapp-sender` (reutilizando e adaptando para o canal de Instagram).

### Prioridade P2: Persistência de Colunas Kanban
1. **Kanban Backend Persistence:** Mover a persistência de nomes de colunas customizadas do `localStorage` para uma tabela de metadados ou coluna `kanban_config` em `public.agencies` para que seja compartilhada entre agentes da mesma agência.
