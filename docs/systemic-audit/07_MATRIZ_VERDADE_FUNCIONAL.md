# 07. Matriz de Verdade Funcional - TravelOS

Este documento consolida a auditoria de verdade funcional de todas as funcionalidades de todos os domínios do TravelOS, classificando-as rigorosamente de acordo com seu estado real comprovado pelo código.

---

## 1. Classificação Geral das Funcionalidades

| Domínio / Módulo      | Funcionalidade Mapeada           | Prometido                                                  | Código Existe | Banco Existe | UI Existe | Integrações Reais | Classificação        | Evidência Técnica / Notas                                                                      |
| :-------------------- | :------------------------------- | :--------------------------------------------------------- | :------------ | :----------- | :-------- | :---------------- | :------------------- | :--------------------------------------------------------------------------------------------- |
| **Onboarding**        | Criação de agências e perfis     | Registro de tenant, private data e RBAC do administrador.  | Sim           | Sim          | Sim       | Sim (API CNPJ)    | **REAL E TESTADO**   | RPC `create_agency_onboarding` e forms de onboarding 100% funcionais.                          |
| **RBAC / Segurança**  | Isolamento multi-tenant e RLS    | Permissões de escrita e políticas RLS de tabelas críticas. | Sim           | Sim          | Sim       | Não aplicável     | **REAL E TESTADO**   | Políticas RLS ativas em todas as tabelas em `supabase/migrations/`.                            |
| **CRM e Leads**       | Funil de Vendas e Kanban         | Cadastro, alteração de estágio e promoção de lead.         | Sim           | Sim          | Sim       | Sim (Webhooks)    | **REAL NÃO TESTADO** | RPC `promote_lead_to_client` ativa no banco, sem testes automatizados.                         |
| **Propostas**         | Editor de Propostas B2C          | Criação de itinerários, hotéis, margens e markups.         | Sim           | Sim          | Sim       | Parcial           | **PARCIAL**          | Totais e comissões recalculados por trigger, mas catalogação automática rústica.               |
| **Conversão**         | Proposta para Viagem             | Geração atômica de viagem e faturas a partir da proposta.  | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | RPC `convert_proposal_to_trip` em uso ativo no admin.                                          |
| **Viagens / Grupos**  | Gestão de Grupos Terrestres      | Associação de viagens, ônibus virtual e lotações.          | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | Criação de layouts de assentos e bloqueios de ônibus funcionando no banco.                     |
| **Passageiros / KYC** | Upload e Validação KYC           | Snapshot de documentos e processamento automático.         | Sim           | Sim          | Sim       | Sim (Gemini)      | **REAL NÃO TESTADO** | OCR de documentos de passageiros funciona com Gemini Flash.                                    |
| **Pagamentos**        | Upload Pix no Checkout B2C       | Envio de comprovantes no checkout e quitação de parcelas.  | Sim           | Sim          | Sim       | Parcial           | **PARCIAL**          | O backend de comprovante Pix existe no banco, mas a UI de Checkout B2C possui partes mockadas. |
| **Fornecedores**      | OCR de Faturas Fornecedor        | Upload, OCR Gemini Flash e matching relacional de tarifas. | Sim           | Sim          | Sim       | Sim (Gemini)      | **REAL E TESTADO**   | Fluxo de ingestão de OCR finaliza com sucesso de gravação em `supplier_products`.              |
| **Roteiros**          | Roteiros públicos e vitrine      | Criação e exibição pública de landing pages.               | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | Rotas e renderização públicas de pacotes integradas ao site builder.                           |
| **Contratos**         | Editor de Cláusulas e Assinatura | Edição de cláusulas, IP logs e upload do PDF assinado.     | Sim           | Sim          | Sim       | Parcial           | **PARCIAL**          | Rota `/m/contract/$token` ativa, mas geração de PDFs base64 depende do client-side.            |
| **Confirmação**       | Localizadores e PNR              | Inserção e exibição de localizadores no portal.            | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | Itens em `trip_confirmation_items` em uso e expostos no portal do cliente.                     |
| **Vouchers**          | Geração e layout de Vouchers     | Renderizadores A4 e Story e uploads de PDFs.               | Sim           | Sim          | Sim       | Não aplicável     | **PARCIAL**          | Vouchers gerados no frontend e baixados via browser, sem filas no backend.                     |
| **Aéreos**            | Motor de Diff e Reacomodação     | Comparação de voos e aceite do cliente no portal.          | Sim           | Sim          | Sim       | Parcial           | **PARCIAL**          | Lógica de comparação e aceitação existe via RPC, mas faltam triggers de rollback.              |
| **Embarque**          | e-Check-in e Emergências         | Overrides de links de check-in e botões de emergência.     | Sim           | Sim          | Sim       | Sim (Suporte)     | **REAL E TESTADO**   | Rota `/m/checkin/$token` funcional com gravação em `boarding_events` e tickets.                |
| **Rooming List**      | Alocação Relacional de Quartos   | CRUD relacional de quartos e passageiros e planilhas.      | Sim           | Sim          | Sim       | Não aplicável     | **PARCIAL**          | Tabela `boarding_rooming_list` ativa, mas interface opera sem Drag and Drop (Dnd).             |
| **Suporte (Chat)**    | Tickets Omnichannel              | Abertura de tickets, e-mails Gmail/Resend e SLAs.          | Sim           | Sim          | Sim       | Parcial           | **PARCIAL**          | Gravação local da thread ativa, mas conexões reais com Gmail/Resend estão comentadas.          |
| **Portal Cliente**    | Rota móvel de passageiros        | Visualização de voos, hotéis, dicas e contratos.           | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | Consome RPCs seguras contornando RLS para anônimos autenticados por token.                     |
| **Destination Info**  | Dicas de Destino por IA          | Cartões de dicas locais gerados por IA e revisados.        | Sim           | Sim          | Sim       | Sim (Gemini)      | **REAL E TESTADO**   | Rota admin gera via Gemini Flash, salva como draft e publica no portal móvel.                  |
| **Site Builder**      | CMS e Biolinks                   | Bloco de seções editável, biolinks e posts.                | Sim           | Sim          | Sim       | Não aplicável     | **REAL NÃO TESTADO** | Páginas dinâmicas criadas em `portal_pages` expostas na rota `/p/$slug`.                       |
| **Admin Global**      | Painel administrativo global     | Gestão de subscriptions, cotas e agências.                 | Sim           | Sim          | Sim       | Parcial           | **REAL NÃO TESTADO** | RPCs de cobrança e suspensão ativas no banco, testadas via logs.                               |
| **Logs / Auditoria**  | Audit Log Append-Only            | Histórico imutável de transações críticas.                 | Sim           | Sim          | Sim       | Não aplicável     | **REAL E TESTADO**   | Tabela `audit_log` bloqueada contra updates/deletes por políticas RLS.                         |

---

## 2. Resumo Quantitativo do Status das Funcionalidades

- **REAL E TESTADO (Segurança e Funcionalidade ponta a ponta):** **6**
- **REAL NÃO TESTADO (Funciona com banco real, mas carece de testes automatizados):** **8**
- **PARCIAL (Implementado parcialmente, com partes offline ou pendências de UI/UX):** **8**
- **MOCK / SIMULADO (Apenas front ou dados estáticos, sem conexões reais no banco):** **0** _(Nota: Todos os mocks de banco foram resolvidos com as migrações recentes do repositório)._
- **AUSENTE (Stubs não declarados ou sem código de base):** **0**
- **LEGADO / ÓRFÃO:** **1** (A antiga coluna de array `group_tours.rooming_list` substituída pela tabela relacional `boarding_rooming_list`).
