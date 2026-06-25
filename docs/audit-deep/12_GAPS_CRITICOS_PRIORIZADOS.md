# 12. Gaps Críticos Priorizados

Este documento classifica e ordena as falhas de integridade, mocks e stubs identificados no sistema com base no risco técnico e impacto ao negócio.

---

## 1. Tabela de Gaps Priorizados

| Rank  | Gap Identificado                                                                                                                                                                                    | Tipo de Risco      | Impacto ao Negócio                                         | Severidade  | Ação Imediata                                                                                                                    |
| :---- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- | :--------------------------------------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Migrations locais não rastreadas (`untracked`):** As migrations de `flight_itineraries` e `trip_confirmation_items` (`20260624*`) não estão commitadas no Git, embora residam no Supabase remoto. | Quebra de CI/CD    | Bloqueio de novas deploys                                  | **CRÍTICA** | Stagear e commitar os arquivos de migrations locais.                                                                             |
| **2** | **Duplicação de Rooming Lists:** Conflito de persistência entre `group_tours.rooming_list` (JSONB) e a tabela normalizada `boarding_rooming_list`.                                                  | Corrupção de Dados | Overwrites concorrentes e perda de alocações               | **ALTA**    | Migrar a UI de grupos para ler e escrever na tabela normalizada, excluindo a coluna JSONB.                                       |
| **3** | **Checkout B2C de Pix Simulado:** O upload de comprovante de Pix no checkout de excursões é mockado, salvando apenas o nome do arquivo em texto.                                                    | Perda de Arquivos  | Falta de comprovação financeira real de pagamentos B2C     | **ALTA**    | Implementar upload real para o bucket de Storage e salvar a URL no banco de dados.                                               |
| **4** | **Central Omnichannel Comentada:** O painel de suporte não envia e-mails reais via Resend/Gmail (integração mockada).                                                                               | UI Fake            | Clientes não recebem e-mails da central de suporte         | **ALTA**    | Habilitar a chamada das Edge Functions `gmail-send`/Resend API no envio do chat.                                                 |
| **5** | **Tabelas de Check-in Inexistentes:** Falta das tabelas `checkin_links` e `boarding_events` no Supabase de produção.                                                                                | Quebra de Banco    | Erros ao tentar carregar sub-telas de controle de embarque | **MÉDIA**   | Criar e rodar a migration para criar estas tabelas na produção.                                                                  |
| **6** | **Duplicação de Itinerários Aéreos:** Desacoplamento entre `boarding_tickets` (tipo flight) e `flight_itineraries`.                                                                                 | Detrito Técnico    | Trabalho duplicado para o agente ao atualizar voos         | **MÉDIA**   | Fazer com que o fechamento/confirmação do itinerário de voo crie/atualize automaticamente os `boarding_tickets` correspondentes. |
| **7** | **Monolitos de Roteamento:** Arquivos como `client.trips.$id.tsx` (1960 linhas) e `flights.tsx` (1006 linhas) com acoplamento crítico.                                                              | Débito Técnico     | Lentidão de manutenção e risco de regressão                | **BAIXA**   | Refatorar e fatiar em sub-componentes isolados.                                                                                  |

---

## 2. Impacto Macro no Ciclo de Vida da Viagem

- **Inviabilidade do Fluxo Automatizado:** O sistema hoje depende de ações manuais redundantes dos agentes (ex: redigitar localizadores nas duas abas, atualizar quartos manualmente em tabelas diferentes e auditar comprovantes Pix sem ter acesso ao arquivo no painel).
- **Risco Legal (LGPD):** A coleta de PII no checkout B2C sem termo de privacidade expõe a empresa a multas e passivos jurídicos.
