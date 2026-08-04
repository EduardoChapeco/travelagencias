# 00. Current State and Baseline (Estado Atual e Linha de Base)

## 1. Contexto Geral da Integração Meta

A integração do Turis com a Meta está atualmente dividida em dois blocos conceituais e estruturais que coexistem de forma desorganizada:

- **Estrutura Antiga (Omnichannel Legacy):** Baseada na tabela `omnichannel_sessions` e `omnichannel_messages`, que suportavam principalmente instâncias da Evolution API (VPS / WhatsApp não-oficial).
- **Estrutura Nova (Umbler Inbox Foundation):** Introduzida em migrações recentes, baseada nas tabelas `channels`, `contacts`, `conversations` e `messages`.

## 2. Ponto de Partida e Constatações Rápidas

- **Canais e Conexões:** O banco de dados possui uma tabela `whatsapp_connections` (criada na migração `20260729000001`) e uma tabela `channels` (criada na migração `20260801000003`). Elas não estão integradas e o frontend cria registros na tabela `channels` diretamente com inserts no cliente, salvando tokens de acesso de forma insegura.
- **OAuth e Signups:** Não existe nenhum fluxo de OAuth ou Embedded Signup implementado no frontend (`integrations.tsx`). Apenas campos de input manuais para chaves.
- **Instagram Messaging:** O formulário no Inbox apenas solicita o Token e o ID da Conta no frontend, executando uma chamada no `ai-orchestrator` para salvar uma credencial e inserindo um registro na tabela `channels` de tipo `instagram`. Totalmente desconectado de webhooks oficiais e OAuth.
- **Webhooks:** O webhook oficial do WhatsApp está na Edge Function `whatsapp-webhook`, mas a assinatura de assinatura e autenticação de chaves usa parâmetros globais ou falha sob RLS restritivo. Não há webhook próprio para Instagram.
- **Páginas Legais e Exclusão:** Não existem as rotas públicas de `/privacy`, `/terms` ou `/data-deletion`.
- **Domínio:** O frontend usa caminhos relativos ou aponta para localhost:54321 nas chamadas.
