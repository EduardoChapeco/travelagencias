# 15 Auditoria de Mocks, Fakes e Fallbacks

Neste documento registramos a verificação de integridade operacional do TravelOS para garantir que nenhuma funcionalidade esteja usando simulações estáticas, dados sintéticos ou placeholders de "Em Construção".

---

## 1. Estatísticas de Fornecedores B2B
* **Estado Anterior:** Mapeamento de estatísticas simuladas estaticamente na visualização de detalhes do fornecedor.
* **Ação Corretiva:** Removida toda a simulação estática. Implementada query dinâmica em tempo real agregando dados das tabelas:
  * `proposal_items` (Vendas totais)
  * `supplier_products` (Cadastro de portfólio)
  * `supplier_reviews` (Reputação agregada)
* **Evidência:** Arquivo `agency.$slug.suppliers.$id.tsx` linhas 1060-1102 (queries ativas Supabase).

---

## 2. Interface do Módulo de Tarefas (Timeline, Lista, Calendário)
* **Estado Anterior:** Telas em branco marcadas com placeholders "Em Construção" que geravam frustração operacional e mascaravam a falta de backend.
* **Ação Corretiva:** O sistema de abas foi destruído para abrir o Kanban diretamente na rota raiz `/daily-tasks`. Os arquivos de visualização alternativos (`TimelineView`, `ListView`, etc.) foram restaurados e refatorados para consumir dados do hook real `useTasksQuery` conectado ao banco.
* **Evidência:** Arquivos em `src/components/tasks/views/` e hook `useTasksQuery.ts`.

---

## 3. Simulador de Seguro em Landing Pages
* **Estado Anterior:** Mensagens de "Em breve" e fluxos cenográficos sem persistência.
* **Ação Corretiva:** Substituição por orçamentações reais derivadas de tabelas de planos ativos ou "A definir" baseado em parametrizações reais da agência.
* **Evidência:** Arquivos `TemplateGroupCatalog.tsx` e `BlockRenderer.tsx`.
