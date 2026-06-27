# 04. Matriz de Comportamento Esperado versus Real

Este documento mapeia o comportamento esperado versus a execução real do sistema sob cenários operacionais normais e condições de exceção (casos extremos).

---

## 1. Matriz de Casos de Uso e Comportamento Operacional

| Fluxo / Operação | Cenário / Entrada | Comportamento Esperado | Comportamento Real (Código/BD) | Classificação Real |
| :--- | :--- | :--- | :--- | :--- |
| **Pesquisa de Cotações** | UUID de cotação válido pertencente a outra agência (Cross-Tenant) | Rejeição imediata `403 Forbidden` ou `404 Not Found`. | O `userClient` tenta selecionar a cotação no banco com o JWT do chamador. A RLS bloqueia e retorna erro de leitura, e o motor aborta respondendo `403`. | **COMPROVADO E SEGURO** |
| **Pesquisa de Cotações** | UUID de cotação válido de sua agência, sem chaves reais em `api_keys` | Erro visível informando a ausência de chaves operacionais e solicitando configuração. | O motor emite um log e recorre ao gerador lógico gerando dois candidatos sintéticos e gravando-os em `package_candidates`. | **FALLBACK SINTÉTICO ATIVO** |
| **Conversão para Proposta** | Clique no botão "Converter em Proposta" | Conversão atômica dos dados do voo/hotel para `proposals` e redirecionamento rápido. | Invoca a RPC `convert_quote_to_proposal` no banco remoto em chamada única de rede. Banco processa e retorna ID da proposta. Redireciona na UI. | **COMPROVADO PONTA A PONTA** |
| **Conversão para Proposta** | Queda de conexão de rede durante a conversão | Rollback total da transação. Nenhuma proposta incompleta é persistida. | A transação SQL é abortada no Postgres pelo cancelamento/timeout da RPC. Nenhum dado órfão é gravado na tabela `proposals`. | **COMPROVADO PONTA A PONTA** |
| **Conversão para Proposta** | Duplo clique rápido no botão de conversão | Apenas uma única requisição RPC deve ser disparada. | O botão de ação na UI é imediatamente desabilitado ao mudar o estado `converting` na primeira linha da mutação React. | **COMPROVADO PONTA A PONTA** |
| **Recebimento de Mensagens** | Payload de webhook do WhatsApp duplicado (`wamid` idêntico) | Apenas um único registro inserido. A duplicação é descartada sem causar erro na rede. | A Edge Function verifica a existência do `wamid` no banco e descarta. Se passar, o índice exclusivo em `external_message_id` causa rejeição física. | **COMPROVADO PONTA A PONTA** |
| **Recebimento de Mensagens** | Payload de webhook de contato inexistente | Criação automática do Lead e da sessão Omnichannel de forma segura. | Cria o lead em `leads` e a sessão correspondente em `omnichannel_sessions` antes de persistir a mensagem. | **COMPROVADO PONTA A PONTA** |
| **Abertura/Fechamento de Caixa** | Abertura física com valor negativo | Rejeição com erro explicativo sobre saldo inválido. | O formulário de validação Zod bloqueia a submissão com erro visual: *"Saldo de abertura inválido"*. | **COMPROVADO PONTA A PONTA** |
| **Auditoria do Caixa** | Alteração ou deleção manual de transações de caixas | Registro inviolável de histórico de alteração contendo os dados anteriores e novos. | Triggers PostgreSQL `audit_cash_sessions_trigger` e `audit_cash_transactions_trigger` interceptam a ação e gravam em `cash_audit_logs`. | **COMPROVADO PONTA A PONTA** |
