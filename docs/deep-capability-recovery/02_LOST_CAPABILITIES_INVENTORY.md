# 02. Lost Capabilities Inventory (Inventário de Capacidades Perdidas)

Este relatório apresenta o inventário completo de funcionalidades e capacidades avançadas que foram perdidas ou simplificadas, bem como o diagnóstico de cada recurso.

---

## 1. Inventário de Recursos de Alta Complexidade

### 1.1 Visões de Tarefas e Cronogramas
* **Funcionalidades:** Timeline, Lista, Calendário, Workload, Relatórios e Kanban.
* **Capacidade Anterior:** O Kanban e a Timeline de tarefas travavam ou mostravam spinners infinitos devido a restrições de chaves estrangeiras errôneas (`auth.users`) no PostgREST e select inadequado.
* **Impacto:** O carregamento falhava silenciosamente e as visões se tornavam inutilizáveis.
* **Diagnóstico de Restauração:** Saneado por meio da migration `20260802000000_fix_tasks_foreign_keys.sql` e query normalizada via PostgREST.

### 1.2 Mídias e Interatividade do Inbox/Omnichannel
* **Funcionalidades:** Gravação de áudio do microfone, player de áudio HTML5, envio de documentos e imagens pelo bucket do Storage.
* **Capacidade Anterior:** Permitia ao operador do chat gravar áudio em formato `.webm` direto do navegador para enviar pelo WhatsApp API e fazer upload de comprovantes ou RG/Passaporte do cliente.
* **Simplificação:** O novo Inbox tratava mensagens apenas como texto simples, removendo o uploader e gravador de voz.
* **Diagnóstico de Restauração:** Reintroduzido e consolidado de forma nativa e integrada na rota principal `/inbox`.

### 1.3 Inteligência Artificial & RAG
* **Funcionalidades:** Geração de propostas baseadas em IA (Edge Function `ai-message-processor`), sugestões RAG contextuais (`ai-chat.functions.ts`) e análise de sentimentos.
* **Simplificação:** Os botões foram ocultados e a lógica do AI Panel foi mockada com dados estáticos na interface.
* **Diagnóstico de Restauração:** Reintegrado de forma 100% real no painel do cliente, conectando-se diretamente às Edge Functions correspondentes no Supabase.
