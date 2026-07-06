# 12. Matriz de Realidade Técnica

Este documento classifica formalmente cada funcionalidade da plataforma Turis com base em auditoria estrita do código-fonte e do banco de dados, eliminando stubs e categorizando o estado de paridade real.

---

## 1. Classificação de Funcionalidades e Módulos

### 1.1 Módulo Financeiro e Contábil

- **Livro-Razão Contábil (Ledger)**: **REAL PONTA A PONTA**.
  - _Evidência_: Lançamentos são persistidos em `financial_ledger_entries` por triggers SQL. RLS restritiva ativada (Fase P0). Rota `/ledger` funcional com débito/crédito coloridos, filtros e paginação.
- **Travas de Fechamento**: **REAL PONTA A PONTA**.
  - _Evidência_: Trigger SQL `enforce_closed_period_lock` operando nas tabelas transacionais. Interface administrativa de períodos ativa.
- **Comissões Progressivas**: **REAL PONTA A PONTA**.
  - _Evidência_: Funções matemáticas SQL rodando e brackets cadastrados em `seller_commission_tiers`. Tela de controle ativa.
- **Conciliação de Recibos Pix**: **REAL PONTA A PONTA**.
  - _Evidência_: Upload de comprovantes salvos no storage e lançamentos transacionais reais persistidos, com eliminação completa de mocks.
- **Faturamento de Grupos (Performance)**: **REAL PONTA A PONTA**.
  - _Evidência_: Agregação nativa na vista SQL `group_tours_financial_summary`. Listagem paginada no frontend com buscas server-side.
- **Abertura e Fechamento de Caixa**: **REAL PONTA A PONTA**.
  - _Evidência_: Caixas abertos e fechados por RPCs reais no banco salvando saldos em `cash_sessions`.

### 1.2 Módulo de Inteligência Artificial e OCR

- **Motor de Ações de IA (CRM)**: **REAL PONTA A PONTA**.
  - _Evidência_: `ActionExecutor.ts` reescrito. Todas as 27 ações executam transações físicas reais nas tabelas do banco, sem stubs.
- **Busca Semântica RAG (Chat)**: **REAL PONTA A PONTA**.
  - _Evidência_: Consulta semântica de memórias implementada em `ai-chat.functions.ts` acionando a RPC `match_memories` por cosseno.
- **OCR de Faturas e Passaportes**: **PARCIAL**.
  - _Evidência_: A Edge Function `supplier-ocr-extractor` está deployada e realiza chamadas reais ao Gemini Flash para parse de dados estruturados. No entanto, o envio depende de chaves de API secretas de desenvolvimento configuradas, revertendo para formulários manuais em caso de ausência.

### 1.3 Módulo de Viagens e Documentação (Ciclo de Vida)

- **Reacomodação Aérea & Assinatura (Fases 5 e 6)**: **REAL PONTA A PONTA**.
  - _Evidência_: Fluxo completo de casos, diffs comparativos e aceites eletrônicos salvando IP, User Agent e Hash criptográfico.
- **Rooming List Normalizada (Fase 10)**: **REAL PONTA A PONTA**.
  - _Evidência_: Tabela `boarding_rooming_list` ativa. UI com arrastar e soltar e exportadores PDF, Excel e Word totalmente funcionais.
- **Curadoria de Destinos (Fase 11)**: **REAL PONTA A PONTA**.
  - _Evidência_: Campos de validade e confiança integrados. Logs de auditoria gravados na tabela `destination_review_logs`. B2C exibindo apenas dados revisados.
- **GDS Infotravel Integration**: **REAL NÃO TESTADA**.
  - _Evidência_: Código de integração com a API da Infotravel está presente e estruturado, mas não possui cobertura de testes automatizados unitários ou integrados.

### 1.4 Infraestrutura Geral

- **Design System Light Editorial SaaS**: **REAL PONTA A PONTA**.
  - _Evidência_: Higienização completa de sombras (`shadow-none`) e aplicação de tipografia, bordas e paddings consistentes.
- **Suíte de Testes Automatizados E2E**: **AUSENTE**.
  - _Evidência_: Não existem arquivos de configuração ou scripts Cypress/Playwright no repositório.
- **Webhook real do WhatsApp (Outbound)**: **REAL NÃO TESTADA**.
  - _Evidência_: As triggers e rotas de envio de templates estão prontas, mas dependem de conexões de aparelhos reais ativos na API do Meta.
- **Suporte e Tickets de suporte**: **REAL PONTA A PONTA**.
  - _Evidência_: Histórico de conversas gravado em `ticket_messages` e abertura de tickets salvando em `support_tickets` de forma real.
- **Controle de Cláusulas Contratuais (Fase 5)**: **REAL PONTA A PONTA**.
  - _Evidência_: Biblioteca de cláusulas ativas com carregamento do banco de dados e controle de versão funcional.
- **Voucher e Guia de Embarque A4 PDF (Fase 9)**: **REAL PONTA A PONTA**.
  - _Evidência_: Geração de arquivos PDF baseada em dados reais e disponibilizada para download do passageiro no portal.
