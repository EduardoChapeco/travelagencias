# 05. Domain and Shared Capabilities Map (Domínios e Capacidades Reutilizáveis)

Este relatório mapeia os domínios específicos do negócio do TravelOS e define as capacidades transversais (compartilhadas) para evitar código duplicado ou generalizações excessivas.

---

## 1. Mapeamento de Domínios do Negócio

* **Tarefa (`Task`):** Representa um item de ação pendente de um consultor (ex: "Enviar voucher do cliente X").
* **Compromisso / Reunião (`Meeting`):** Representa um evento com horário agendado, com participantes e recursos associados.
* **Lembrete (`Reminder`):** Notificação em tempo definido disparada para um consultor.
* **Viagem (`Trip`):** Roteiro e reserva ativa de um ou mais passageiros (vinculado a um lead ou cliente).
* **Embarque (`Boarding`):** Evento operacional de início de trecho de viagem ou excursão de grupo.

---

## 2. Capacidades Compartilhadas Transversais (Shared Kernel)

Para evitar duplicar motores de uploads, comentários, logs de auditoria e tags por toda a aplicação:
1. **Sistema de Anexos e Documentos (`client_documents` & `agency-media` Storage):**
   * Núcleo único de envio de arquivos no bucket Supabase com RLS. O mesmo motor é reutilizado na aba de documentos de Inbox, CRM, detalhe de Viagens e Financeiro.
2. **Histórico de Auditoria (`audit_logs`):**
   * Trigger genérica de banco que escuta `INSERT/UPDATE/DELETE` nas tabelas principais (`crm_leads`, `proposals`, `financial_records`) e grava a autoria (`profiles.id`) e o payload alterado.
3. **Gerenciador de Tags (`agency_tags`):**
   * Tabela única de tags por agência. A mesma tag pode ser associada a um contato de Inbox, a um Lead de CRM ou a uma Excursão de Grupo de forma padronizada.
