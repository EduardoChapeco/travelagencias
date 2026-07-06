# 00. Baseline e Escopo da Auditoria Forense

Este documento estabelece o ponto de partida técnico, a metodologia e as premissas da auditoria forense de pré-produção de nível BigTech realizada no sistema **Turis** (TravelAgências).

---

## 1. Escopo Técnico do Sistema

O Turis é um ecossistema de gestão de agências de turismo (SaaS B2B2C) projetado para operar sob alta concorrência e armazenar dados altamente sensíveis. O stack tecnológico de base identificado no repositório compreende:

- **Frontend & Routing**: React, Vite, TanStack Router, TanStack Start (SSR/Isomórfico).
- **Banco de Dados**: Supabase PostgreSQL 15, PostgREST para consulta direta client-side.
- **Camada de Segurança**: Row Level Security (RLS) no Supabase, JWT estruturado, middlewares de autenticação baseados em TanStack middleware.
- **Integrações e Serviços**: Edge Functions no Deno Deploy, Gateway OpenRouter/OpenAI para inteligência artificial, Gemini 2.5 Flash para OCR de documentos e faturas de fornecedores.
- **Design System**: Light Editorial SaaS (Flat Premium, sem sombras, bordas finas, tipografia fluida corporativa).

---

## 2. Metodologia da Auditoria

A auditoria foi conduzida inspecionando diretamente os artefatos do repositório, o histórico de alterações do Git e o código executável local/remoto. Foram seguidas as seguintes premissas rígidas:

1.  **Código como Única Fonte de Verdade**: Comentários na UI, documentações anteriores e stubs foram desconsiderados quando divergentes da lógica executada.
2.  **Verificação de Compilação Estática**: Foram analisados os erros de compilação reais gerados pelo compilador TypeScript (`tsc --noEmit`) e pelo processo de build do Vite.
3.  **Segurança e Isolamento de Tenants**: Analisou-se a integridade das políticas de RLS e o isolamento de dados entre empresas parceiras.
4.  **Saneamento de Lógicas Simuladas**: Verificou-se se as ações descritas como automáticas ou inteligentes possuem persistência de banco e acionamento real ou se são apenas simulações visuais (mocks).

---

## 3. Estrutura dos Artefatos Gerados

A auditoria está distribuída nos seguintes documentos dentro do diretório `docs/master-audit-100-commits/`:

- **00_BASELINE.md**: Definição de escopo e metodologia.
- **01_COMMIT_FORENSICS.md**: Análise forense individualizada dos últimos 100 commits.
- **02_PROMISES_VS_REALITY.md**: Confronto entre as especificações de entrega e o código físico.
- **03_ARCHITECTURE_XRAY.md**: Mapeamento integral e raio-X da arquitetura do sistema.
- **04_UI_DATABASE_CONTRACT_MATRIX.md**: Rastreamento de ponta a ponta dos fluxos críticos de UI ao banco.
- **05_DATABASE_MIGRATIONS_RLS.md**: Auditoria de tabelas, migrações, triggers, RLS e concorrência.
- **06_APIS_AI_OCR_INTEGRATIONS.md**: Inventário de APIs, Edge Functions, Gemini e resiliência de rede.
- **07_SECURITY_AND_MULTI_TENANCY.md**: Análise de vulnerabilidades de RLS, controle de acessos e risco de tenant.
- **08_UI_UX_DESIGN_SYSTEM.md**: Auditoria visual em múltiplos viewports e aderência estética.
- **09_END_TO_END_TESTS.md**: Relatório de testes de fluxos e validações transacionais.
- **10_DEAD_LEGACY_DUPLICATED_CODE.md**: Identificação de código morto, órfão e redundâncias.
- **11_LOCAL_MAIN_PRODUCTION_DIVERGENCES.md**: Mapeamento de discrepâncias entre ambientes.
- **12_REALITY_MATRIX.md**: Classificação categórica restrita de todas as funcionalidades.
- **13_RISK_REGISTER.md**: Registro de riscos consolidado de P0 a P3.
- **14_MASTER_CORRECTIVE_PLAN.md**: Plano estratégico de correções ordenado por gravidade técnica.
- **15_EXECUTIVE_TRUTH_REPORT.md**: Resumo executivo de métricas de prontidão para produção.
