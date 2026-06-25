# 13. Registro de Riscos Consolidados

Este documento cataloga, classifica e propõe estratégias de mitigação para todos os riscos técnicos, de segurança, de infraestrutura e operacionais identificados na auditoria do TravelOS.

---

## 1. Tabela Consolidada de Riscos

| Risco ID      | Descrição do Risco                                                                                                     | Impacto Potencial                                                                       | Classificação  | Mitigação Recomendada                                                                           |
| :------------ | :--------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :------------: | :---------------------------------------------------------------------------------------------- |
| **RSK-P1-01** | **Ausência de Testes E2E Automatizados**: Falta de Playwright/Cypress para testar rotas e mutações críticas.           | Regressões indetectáveis em atualizações futuras; falha humana em testes manuais.       | **P1 (Alto)**  | Implementar suíte de testes de integração e RLS automatizados via Playwright.                   |
| **RSK-P1-02** | **Dependência de Cotas/Outages de APIs Externas**: Instabilidade ou falta de saldo nas APIs de OpenAI, Gemini ou Meta. | Queda nas funcionalidades de IA chat, RAG e OCR de faturas/passaportes.                 | **P1 (Alto)**  | Estabelecer modo de contingência local que notifique o operador e libere formulários manuais.   |
| **RSK-P2-01** | **Retenção de Colunas Legadas**: Coluna JSONB `rooming_list` mantida em `group_tours` após a normalização.             | Risco de desalinhamento de dados caso scripts legados tentem escrever na coluna antiga. | **P2 (Médio)** | Executar migration para remover a coluna JSONB do banco após 30 dias de monitoramento.          |
| **RSK-P2-02** | **Carga de Memória em Relatórios SaaS**: Lógica de consolidação de faturamento corporativo no superadmin.              | Lentidão de carregamento se o volume de agências registradas crescer exponencialmente.  | **P2 (Médio)** | Centralizar consolidação no banco via RPCs paginadas e aplicar cache em redis ou cloudflare KV. |
| **RSK-P3-01** | **Exposição Acidental de Segredos Locais**: Desenvolvedores adicionando chaves de teste no controle de versão.         | Vazamento de credenciais da agência ou do gateway de inteligência artificial.           | **P3 (Baixo)** | Ativar ferramentas de Git Guardian / pre-commit hooks para barrar segredos nos commits.         |

---

## 2. Detalhamento dos Riscos de Maior Severidade

### RSK-P1-01 — Ausência de Testes E2E Automatizados

- _Causa Raiz_: O repositório focou estritamente na compilação, modelagem de banco de dados e layout estético.
- _Impacto_: O TravelOS gerencia dados financeiros reais e isolamento de tenants. Sem uma barreira de testes de segurança automatizados que simulem invasões de tenants (Agência A tentando consultar a API da Agência B), novas alterações no código ou refatorações do Supabase podem desativar triggers de RLS silenciosamente, expondo dados corporativos privados.

### RSK-P1-02 — Instabilidade ou Falta de Credenciais de APIs Externas

- _Causa Raiz_: Funcionalidades core do chat, RAG e OCR dependem de tokens do OpenAI, Gemini e Meta.
- _Impacto_: Se a conta de OpenAI da agência expirar por falta de saldo, a server function de chat falhará silenciosamente ou retornará erro 500 no navegador se o fallback não for robusto.
- _Mitigação_: A auditoria constatou que o código atual implementa desvios elegantes (fallbacks de busca clássica e preenchimento manual de formulários), contudo, recomenda-se monitoramento de status da API e avisos explícitos de "Sem Conexão com IA" na barra superior do chat.
