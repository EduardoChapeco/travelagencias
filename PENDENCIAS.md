# Relatório de Pendências e Tarefas Restantes — TravelOS

Este documento contém o checklist de tudo o que falta ser implementado, revisado ou configurado manualmente para colocar o sistema em produção com total estabilidade.

---

## 📋 1. Pendências de Infraestrutura e Deploy (Manual)
Como o deploy direto pelo terminal está com permissão negada (`403 Unauthorized`), as seguintes tarefas de deploy na nuvem do Supabase devem ser realizadas:

- [ ] **Deploy das Migrações SQL:**
  Executar os 4 scripts locais de migração na ordem correta dentro do painel SQL Editor do Supabase:
  1. `20260612000006_crm_kanban_enrichment.sql` (Enriquecimento CRM)
  2. `20260612000007_crm_onboarding_calendar.sql` (Calendar/Acompanhantes)
  3. `20260612000008_meta_integrations.sql` (Tabelas de mensagens/Pixel)
  4. `20260612000009_omnichannel_triggers.sql` (Webhooks e Triggers de disparo de functions)
  
- [ ] **Configuração Secreta do Trigger SQL:**
  No arquivo `20260612000009_omnichannel_triggers.sql`, lembrar de substituir o placeholder `'SUA_SERVICE_ROLE_KEY'` pela chave de serviço real da API do projeto Supabase.

- [ ] **Deploy das 4 Novas Edge Functions:**
  Executar o deploy no terminal do desenvolvedor local com o comando:
  ```bash
  npx supabase functions deploy whatsapp-sender --project-ref ezfgelkamreguhapcgfm
  npx supabase functions deploy whatsapp-webhook --project-ref ezfgelkamreguhapcgfm
  npx supabase functions deploy ai-message-processor --project-ref ezfgelkamreguhapcgfm
  npx supabase functions deploy meta-capi-sync --project-ref ezfgelkamreguhapcgfm
  ```

- [ ] **Configuração de Chave de Criptografia no Supabase:**
  Definir a senha AES no gerenciador de segredos do Supabase:
  ```bash
  npx supabase secrets set API_KEY_SECRET="sua_chave_secreta_aqui" --project-ref ezfgelkamreguhapcgfm
  ```

---

## 💻 2. Melhorias e Pendências de Código (Refatoração de Chat)
- [ ] **Reatividade do Realtime no Chat:**
  No componente de chat de leads (`src/routes/agency.$slug.crm.$lead_id.tsx`), o listener de mudanças do banco de dados atualmente escuta apenas o evento `"INSERT"`. É necessário adicionar uma escuta ao evento `"UPDATE"` para que, quando a Edge Function atualizar o status da mensagem (de `pending` para `sent` ou `failed`), a tela do agente mostre a confirmação em tempo real sem a necessidade de atualizar a página.
- [ ] **Indicadores Visuais de Envio:**
  Exibir pequenos ícones/badges (Ex: 🕐 Pendente, ✔️ Enviado, ❌ Falhou) ao lado do timestamp de cada bolha de conversa no chat.

---

## 🎨 3. Design System (Flat Design)
- [ ] **Auditoria Completa de Sombras no App:**
  Varrer e remover classes residuais de sombra (`shadow-md`, `shadow-xl`, `shadow-2xl`) de modais, dropdowns e inputs do frontend em toda a aplicação (já limpo nos seletores de clientes/leads da cotação e nos botões da IA).
