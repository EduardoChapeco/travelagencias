# 03. Previous vs. Current Feature Parity (Matriz de Paridade Funcional)

Este relatório apresenta a matriz de paridade funcional para auditar e provar que nenhuma capacidade útil foi perdida durante o saneamento da plataforma.

---

## 1. Matriz de Paridade de Recursos

| Funcionalidade Anterior | Capacidade Anterior | Comportamento Esperado | Implementação Atual | Capacidade Preservada | Capacidade Perdida | Correção Necessária | Teste de Paridade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Omnichannel Chat** | Envio de áudios, anexos, IA e notas. | Gravar áudio no navegador, fazer upload no Storage, sugerir resposta via RAG e salvar notas de contato. | Centralizado no `/inbox` com suporte nativo. | Sim | Nenhuma | Integrado 100% no schema novo. | Enviar mensagem com áudio e validar no Supabase. |
| **Kanban de Tarefas** | Ocultar/Exibir colunas do Kanban. | Configuração dinâmica de status de colunas e persistência local. | KanbanView.tsx lê e salva no `localStorage`. | Sim | Nenhuma | Nenhuma | Ocultar coluna e recarregar a página para validar. |
| **Módulo Agenda** | Menu principal com sub-itens integrados. | Agenda e inbox promovidos a módulos de 1ª classe na sidebarSlim. | AppSidebar.tsx configurado na raiz. | Sim | Nenhuma | Nenhuma | Clicar no menu lateral esquerdo e validar transição de rota. |
| **Cotações VibeTour** | PageHeader gigante com cara de IA. | Unificação de switchers de abas e busca em barra compacta premium. | quotes.index.tsx despoluído visualmente. | Sim | Nenhuma | Nenhuma | Visualizar o módulo em tela cheia e checar controles. |

---

## 2. Testes de Validação e Asserções
* **Paridade de Dados:** Garantimos que a mudança para o novo schema de inbox (`conversations`, `messages`, `channels`) mantém as conversas reais sincronizadas no webhook e na interface, sem dependência de tabelas órfãs.
* **Type Safety:** Eliminamos o uso de `as any` em queries essenciais, forçando o TypeScript a declarar os contratos reais.
