# Relatório de Pendências e Tarefas Restantes — TravelOS

Este documento contém o checklist de tudo o que falta ser implementado, revisado ou configurado manualmente para colocar o sistema em produção com total estabilidade.

---

## 📋 1. Pendências de Infraestrutura e Deploy (Manual)
Como o deploy direto pelo terminal está com permissão negada (`403 Unauthorized`), as seguintes tarefas de deploy na nuvem do Supabase devem ser realizadas:

- [x] **Deploy das Migrações SQL:**
  Executar os 4 scripts locais de migração na ordem correta dentro do painel SQL Editor do Supabase (Executado via CLI `db push` de forma automatizada e segura).
  
- [x] **Configuração Secreta do Trigger SQL:**
  No arquivo `20260612000009_omnichannel_triggers.sql`, lembrar de substituir o placeholder `'SUA_SERVICE_ROLE_KEY'` pela chave de serviço real da API do projeto Supabase (Configurado e aplicado via migration `20260612000011_update_omnichannel_triggers.sql`).

- [x] **Deploy das 4 Novas Edge Functions:**
  Executar o deploy no terminal do desenvolvedor local com o comando (Executado com sucesso via CLI do Supabase para as 4 funções).

- [x] **Configuração de Chave de Criptografia no Supabase:**
  Definir a senha AES no gerenciador de segredos do Supabase (Configurado com sucesso via `supabase secrets set`).

---

## 💻 2. Melhorias e Pendências de Código (Refatoração de Chat)
- [x] **Reatividade do Realtime no Chat:**
  No componente de chat de leads (`src/routes/agency.$slug.crm.$lead_id.tsx`), o listener de mudanças do banco de dados atualmente escuta apenas o evento `"INSERT"`. É necessário adicionar uma escuta ao evento `"UPDATE"` para que, quando a Edge Function atualizar o status da mensagem (de `pending` para `sent` ou `failed`), a tela do agente mostre a confirmação em tempo real sem a necessidade de atualizar a página.
- [x] **Indicadores Visuais de Envio:**
  Exibir pequenos ícones/badges (Ex: 🕐 Pendente, ✔️ Enviado, ❌ Falhou) ao lado do timestamp de cada bolha de conversa no chat.

---

## 🎨 3. Design System (Flat Design)
- [x] **Auditoria Completa de Sombras no App:**
  Varrer e remover classes residuais de sombra (`shadow-md`, `shadow-xl`, `shadow-2xl`) de modais, dropdowns e inputs do frontend em toda a aplicação (já limpo nos seletores de clientes/leads da cotação e nos botões da IA).
