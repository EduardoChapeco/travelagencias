# 02. Requirements and Expected Behavior (Requisitos e Comportamento Esperado)

## 1. Módulo Meta (WhatsApp e Instagram)
* **Requisito:** As conexões com a Meta devem usar chaves de forma segura (criptografadas e não legíveis pelo frontend) e o onboarding deve ser feito via Embedded Signup.
* **Comportamento Esperado:** Ao clicar em "Conectar", um popup oficial do Facebook se abre. Ao concluir, o código retornado é enviado para uma Edge Function que faz a troca pelo token e busca os ativos programaticamente, registrando no banco com status intermediários. O Inbox renderiza as DMs do Instagram e WhatsApp atualizando em tempo real.
* **Comportamento Encontrado:** O frontend não possui botão de Embedded Signup e a conexão é feita colando chaves de acesso manuais em inputs de texto. O Instagram não possui suporte real de envio/recebimento no webhook.

## 2. Termos e Políticas
* **Requisito:** Rotas públicas `/privacy`, `/terms` e `/data-deletion` responsivas, acessíveis sem autenticação e com texto e fluxo de exclusão de dados funcional com protocolo.
* **Comportamento Esperado:** Qualquer usuário acessa essas páginas de forma anônima e lê o texto oficial. A exclusão de dados gera um registro em `data_subject_requests` e permite consulta.
* **Comportamento Encontrado:** Criadas nesta sessão, respondem ao esperado localmente usando fallback de texto se o banco estiver vazio.

## 3. Kanban de Tarefas
* **Requisito:** Mover colunas e renomear colunas do Kanban com persistência e criação rápida de tarefas.
* **Comportamento Esperado:** Renomear uma coluna atualiza o cabeçalho e persiste para todos os operadores da agência no banco de dados.
* **Comportamento Encontrado:** A renomeação é puramente local por dispositivo (salva em `localStorage`).
