# 19. Relatório Executivo da Verdade: Integração Infotravel

Este documento apresenta a síntese executiva de prontidão, riscos e conformidade da integração com o GDS **Infotravel** (Infotera) no **TravelOS**, compilando as métricas de conformidade coletadas na auditoria.

---

## 1. Métricas Consolidadas de Prontidão da Integração

- **Quantidade Total de Endpoints na Especificação OpenAPI (api-doc.json)**: 70
- **Quantidade de Endpoints Críticos Relevantes para a Integração**: 14 (Autenticação, busca de hotéis, busca de voos, busca de reserva, e variações contábeis/operacionais de backoffice).
- **Quantidade Implementada no TravelOS**: 4 (Login, busca de hotéis, busca de voos, importação de reserva individual pelo ID).
- **Quantidade Testada**: 0 (Toda a integração opera sem cobertura de testes unitários, integrados ou E2E de barramento).
- **Quantidade Parcial**: 1 (Importação de reserva via ID do GDS - funcional na UI e no backend, mas sem resolvedor de conflitos no CRM).
- **Quantidade Quebrada / Stub**: 0.
- **Quantidade sem Consumidor (Mocks/Stubs de serviço)**: 2 (Busca de hotéis e busca de voos estão declaradas no serviço do frontend, mas não possuem botões ou interfaces de chamada ativos nas telas de propostas ou roteiros).

---

## 2. Diagnóstico de Recursos e Divergências

### Recursos disponíveis no Infotravel, mas ausentes no TravelOS:

1. **Busca de Transfers e Seguros**: A API externa suporta busca e contratação de traslados e seguros, mas não há barramento para essas tabelas no conector local.
2. **Criação e Confirmação de Novas Reservas (`POST /booking`)**: O TravelOS depende inteiramente da importação de reservas geradas fora do sistema, sem capacidade de emitir reservas programaticamente.
3. **Check Rate e Validação Tarifária**: Inexistência do fluxo de verificação antes do faturamento, assumindo preços estáticos.

### Recursos prometidos no TravelOS, mas não suportados pela API:

1. **Sincronização Bilateral em Tempo Real**: A API da Infotera não possui webhooks para notificação de alterações. Qualquer sincronização depende exclusivamente de polling programado e consultas periódicas de backoffice.
2. **Edição e Cancelamento Autônomo**: A escrita de dados de cancelamento ou alteração de leitos/assentos por API não é suportada nas permissões padrão de barramento, exigindo operação manual direta na interface web do Infotravel.

---

## 3. Top 20 Lacunas de Integração e Vulnerabilidades (Gaps)

1. **Ausência de Validação de IDOR na Edge Function**: Risco de operadores de uma agência acessarem chaves de API de outra agência enviando o `agencyId` no payload da chamada HTTP do frontend.
2. **Acoplamento de Mapeamento na UI**: Lógica de mapeamento e inserção dos dados da reserva importada escrita diretamente no componente React da rota `agency.$slug.trips.index.tsx`.
3. **Armazenamento de Credenciais em Texto Plano**: A tabela `api_keys` não possui criptografia em repouso na coluna `key_value`.
4. **Falta de Idempotência na Importação**: Risco de importação em lote duplicar reservas locais se o mesmo código for enviado sucessivamente.
5. **Uso de Tipo `any` em Retornos de API**: Respostas estruturadas do Infotravel tratadas de forma genérica no frontend, sem validação de contrato por schemas (Zod).
6. **Ausência de Fila de Erros e Retentativas**: Falhas temporárias da API externa causam a rejeição imediata do fluxo local, sem agendamento assíncrono de reprocessamento.
7. **Ausência de Webhooks**: Dependência exclusiva de polling incremental para detecção de alterações na operadora.
8. **Mocks de Serviço de Busca**: Busca de hotéis e voos declaradas no código com retorno sandbox, sem conexão nas telas de propostas.
9. **Exposição de Dados Confidenciais em Logs**: Risco de vazamento de tokens JWT e senhas nos logs do Deno runtime se as chamadas de erro não forem tratadas.
10. **Concorrência em Saldos do Razão**: Lançamentos de faturamento importados gravados sem travas de isolamento pessimista no banco.
11. **Falta de Matching Inteligente de Passageiros**: Passageiros importados criados sem controle de CPF duplicado, gerando redundâncias no CRM.
12. **Falta de Caching de Tokens**: A Edge Function efetua uma chamada de login (`/auth/login`) a cada requisição de serviço do operador, causando consumo excessivo de recursos e latência alta.
13. **Ausência de Monitor de Cota**: Sem alertas de estouro de limite de chamadas de API (Rate Limit).
14. **Documentos em URLs Públicas**: Links de contratos e faturas expostos em texto puro na tabela de vouchers, sem bucket de armazenamento privado protegido por RLS.
15. **Falta de Dry Run**: Sem visualização de preview dos dados que serão alterados ou inseridos na base do CRM antes da gravação definitiva da importação.
16. **Acoplamento de Modelos de Domínio**: O TravelOS consome diretamente a estrutura retornada pelo Infotravel, sem conversão para um objeto unificado (`NormalizedOffer`).
17. **Sem Suíte de Testes Automatizados**: A integração não conta com testes unitários, integrados ou e2e para cobrir autenticação ou fluxos de erro.
18. **Ausência de Circuit Breaker**: O sistema continua enviando requisições mesmo se a API externa estiver fora do ar, gerando surtos e lentidão geral na UI.
19. **Throttling Inexistente em Carga Histórica**: Risco de bloqueio temporário do IP da agência por suspeita de ataque ao rodar importações volumosas de reservas.
20. **Falta de Interface de Log de Sincronização**: O administrador da agência não possui visibilidade de falhas de processamento de sync no painel.

---

## 4. Conclusão de Prontidão

A integração Infotravel **NÃO ESTÁ PRONTA** para produção. Embora o fluxo de importação individual de reservas atue de forma parcial no frontend e backend através do simulador de sandbox, a **falta de testes automatizados**, a **ausência de validação de privilégios contra IDOR** e o **armazenamento de credenciais sem criptografia** representam riscos críticos de segurança e consistência que devem ser mitigados na Fase P0 do Plano Mestre antes do lançamento público do TravelOS.
