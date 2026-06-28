# 18. Test Characterization and Parity (Testes de Caracterização)

Este relatório apresenta o mapeamento de testes de caracterização para assegurar a paridade funcional e a ausência de regressões operacionais no TravelOS.

---

## 1. Testes de Caracterização da Interface (E2E)

Desenvolvemos cenários de testes automatizados e manuais para caracterizar o comportamento correto das novas telas:
* **Inbox Unificado:**
  * **Caso de Teste 1:** Selecionar conversa ativa, digitar mensagem e clicar em enviar. Asserção: A mensagem deve aparecer na thread central com o status de enviado (`queued`/`sent`) e atualizar a coluna da esquerda com a pré-visualização.
  * **Caso de Teste 2:** Clicar em "Gravar Áudio", falar ao microfone, clicar em parar gravação. Asserção: O arquivo de áudio deve ser enviado ao storage e um player HTML5 com controles deve ser renderizado na thread.
  * **Caso de Teste 3:** Clicar no botão "Canais" superior. Asserção: O Sheet deslizante lateral esquerdo deve abrir exibindo as configurações de conexões.

---

## 2. Testes de Contrato e Regressão RLS

* **Isolamento de Tenant:**
  * Executamos testes unitários de banco de dados para garantir que a consulta REST do Supabase por um usuário logado pertencente à agência X retorne erro ou conjunto vazio ao tentar acessar dados da agência Y.
  * O typecheck do TypeScript valida a inexistência de tipos desconhecidos no build final.
