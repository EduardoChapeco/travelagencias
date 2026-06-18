# Plano de Testes: Integração com CRM e Geração de Leads

Este documento orienta os testes para garantir que formulários inseridos nas páginas públicas (Site/Biolink) gerem registros de leads reais no CRM da agência.

---

## 1. Formulário de Contato Padrão
* **Caso de Teste 1: Submissão e Criação de Lead**
  * **Passos**:
    1. Criar uma página e adicionar o bloco "Formulário de contato".
    2. Clicar em "Publicar Página".
    3. Acessar a página pública como visitante.
    4. Preencher o formulário com dados fictícios:
       * Nome: *João Lead Teste*
       * WhatsApp: *5549999999999*
       * E-mail: `joao@leadteste.com`
       * Mensagem/Observações: *Interessado no roteiro da Itália.*
    5. Clicar em "Enviar".
    6. Confirmar se a mensagem de sucesso aparece na tela.
  * **Verificação no Painel Admin (CRM)**:
    1. Fazer login como agente e navegar para a rota `/agency/$slug/crm` (ou Kanban de Leads).
    2. Verificar se um novo card de lead com o nome *João Lead Teste* foi criado na primeira coluna do pipeline de vendas.
    3. Abrir o lead e confirmar se o telefone, e-mail e notas da mensagem batem exatamente com o que foi preenchido.
    4. Verificar se a tag de origem do lead (`source`) está marcada como `'Lead Form Site'` ou similar.

---

## 2. Formulário de Interesse em Grupo/Pacote
* **Caso de Teste 2: Lead Vinculado a Produto**
  * **Passos**:
    1. Criar uma página e inserir o bloco "Solicitar Ligação" ou "Montar Pacote Personalizado".
    2. Associar um grupo de viagem específico (se houver campo de seleção).
    3. Publicar e preencher a solicitação na página pública.
    4. Garantir que o lead seja criado com a tag correspondente ao produto/destino de interesse para fins de segmentação automática do CRM.
