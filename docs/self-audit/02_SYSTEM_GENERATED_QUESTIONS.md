# 02. Perguntas Críticas de Auditoria (Socráticas e Adversariais)

Este documento elenca as perguntas formuladas sob a ótica de múltiplos especialistas, com foco em segurança, integridade transacional, paridade de contratos e escalabilidade sob alta carga.

---

## 1. Perspectiva do Especialista em Segurança (Security Auditor)
1. **P1.1**: Como o `ai-quote-engine` garante que um agente malicioso da Agência A não consiga obter ou alterar cotações da Agência B alterando o `quote_request_id` no corpo da requisição?
2. **P1.2**: O webhook do WhatsApp (`whatsapp-webhook`) valida de fato a assinatura digital da Meta (`x-hub-signature-256`) ou apenas aceita qualquer payload JSON?
3. **P1.3**: As tabelas de equipes e filas (`inbox_teams`, `inbox_queues`, `whatsapp_connections`) possuem RLS configurada? Como o banco impede IDOR ou vazamento de credenciais Meta entre agências?
4. **P1.4**: O banco expõe tokens de autenticação da Meta de forma transparente em consultas SELECT públicas no frontend?

---

## 2. Perspectiva do Arquiteto de Software (Software Architect)
1. **P2.1**: A conversão de cotação em proposta comercial está centralizada em uma única transação atômica no banco de dados ou dispersa em chamadas sequenciais no frontend React (double writes)?
2. **P2.2**: Onde está definida a lógica de cálculo de score de candidatos a pacotes? Ela é determinística, baseada em regras de negócio ou é delegada inteiramente à IA?
3. **P2.3**: Existe acoplamento indevido no frontend React com chamadas diretas ao cliente do Supabase contornando a camada de serviços?
4. **P2.4**: A integração RAG de busca de diretrizes semânticas de destino está acoplada diretamente na UI ou abstraída no backend?

---

## 3. Perspectiva do Desenvolvedor Sênior (Senior Developer)
1. **P3.1**: Existem branches, adapters ou trechos de código que atuam como fallbacks falsos/mocks que ocultam erros de rede ou de banco de dados?
2. **P3.2**: Como o `ai-quote-engine` lida com a ausência de chaves reais em `api_keys`? Ele falha visivelmente ou gera alternativas simuladas?
3. **P3.3**: O frontend utiliza coerções estáticas perigosas como `as any` ou `@ts-ignore` para contornar divergências de campos no banco de dados?
4. **P3.4**: A página de detalhes de cotação possui waterfall de chamadas assíncronas no React que degradam a performance do usuário?

---

## 4. Perspectiva do Engenheiro de Dados (Data Engineer)
1. **P4.1**: As tabelas recém-criadas na migração de omnichannel (`whatsapp_connections`, `inbox_queues`, `inbox_teams`, `inbox_team_members`) possuem chaves estrangeiras (FKs) e constraints de integridade adequadas?
2. **P4.2**: Como o banco garante a idempotência na recepção de mensagens do WhatsApp, evitando que a mesma mensagem seja persistida duas vezes em caso de repetição de webhook pela Meta?
3. **P4.3**: A tabela de logs de auditoria do caixa (`cash_audit_logs`) é inviolável? Como ela registra alterações nas sessões e transações de caixas?

---

## 5. Perspectiva do QA e Tester (Quality Assurance)
1. **P5.1**: O que acontece se o usuário clicar duas vezes seguidas no botão "Converter em Proposta"? São geradas propostas duplicadas no banco?
2. **P5.2**: O que acontece se a rede cair na metade da execução da conversão de proposta? O sistema deixa dados órfãos ou inconsistentes?
3. **P5.3**: O saldo líquido do caixa diário é persistido de forma redundante ou recalculado dinamicamente a partir dos lançamentos de entradas e saídas no banco?

---

## 6. Perspectiva do Engenheiro SRE (SRE & Performance)
1. **P6.1**: As tabelas críticas de cotações e mensagens omnichannel possuem índices de busca eficientes para evitar Table Scans sob carga?
2. **P6.2**: Há limites rígidos ou rate limiting aplicados nas Edge Functions para evitar estouro de limite de requisições de IA e consumo excessivo de tokens?
