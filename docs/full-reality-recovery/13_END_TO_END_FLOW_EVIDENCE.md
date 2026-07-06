# 13 Evidências de Fluxos End-to-End

Neste documento reunimos as evidências operacionais de fluxos que estão 100% funcionais no Turis, conectando o banco de dados Supabase diretamente à renderização do frontend.

---

## 1. Criação e Movimentação de Tarefas no Kanban

### Ação Real:
* O usuário abre o modal de criação de tarefa em `/daily-tasks`.
* Preenche título, prioridade, data de entrega e clica em salvar.
* A API insere em `tasks` e retorna o registro completo.
* O Kanban atualiza instantaneamente (via invalidação otimista de queries).
* O usuário arrasta a tarefa para "Done" (DND Kit).
* O payload `moveTask(taskId, status="done")` é enviado via mutation.
* O banco executa a trigger Postgres e atualiza a coluna `resolved_at` para a data/hora atual.
* Recarregando a página (F5/Reload), a tarefa permanece na coluna correspondente, demonstrando **persistência real**.

---

## 2. Métricas Reais do Parceiro B2B (Fornecedores)

### Ação Real:
* Ao acessar `/suppliers/$id`, o frontend dispara a query de agregação:
  1. Contagem em `proposal_items` filtrada por `supplier_id = id`.
  2. Contagem de produtos em `supplier_products`.
  3. Média aritmética das notas em `supplier_reviews`.
* A página renderiza os números reais nos cards da sidebar (Vendas, Produtos e Avaliação Média).
* Se submetida nova avaliação pelo modal de reviews, a sidebar atualiza a média dinamicamente após invalidação da query de estatísticas.
* **Preservação de Dados:** Nenhum dado sintético ou fallback estático é usado. Se não houver dados, exibe "N/A" ou "0", conforme regras de negócio para produção.
