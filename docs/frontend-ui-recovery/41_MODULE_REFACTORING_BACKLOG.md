# 41 Backlog de Refatoração de Módulos

Este documento estabelece o roteiro de execução e prioridade para refatoração de todos os módulos pendentes ou parcialmente concluídos do TravelOS, assegurando paridade visual e conformidade geométrica.

## Classificação por Prioridade

### PRIORIDADE MÁXIMA (Impedem funcionamento ou quebram layout visivelmente)
1. **Módulo de Propostas / Proposal Builder (`/agency/$slug/proposals/new` e `/edit`):**
   * *Status Atual:* 🔴 NÃO ALCANÇADO.
   * *Ação Necessária:* Substituir as estruturas de grid internas legadas que sobrepõem ou conflitam com o viewport do AppShell. Garantir que as barras laterais do builder respeitem o workspace.
2. **Módulo Financeiro Geral (`/agency/$slug/financial/*`):**
   * *Status Atual:* 🟡 PARCIAL.
   * *Ação Necessária:* Unificar as sub-views (dre, cash, ledger, reconciliation) para que todas herdem a mesma PageShell de controle do eixo Y e scroll interno. Remover hardcodes em gráficos.
3. **Módulo de Viagens e Detalhes (`/agency/$slug/trips/*`):**
   * *Status Atual:* 🟡 PARCIAL.
   * *Ação Necessária:* Validar a cadeia de altura (`h-full` + `min-h-0`) nas sub-abas (passengers, contract, vouchers, flights) para que as tabelas de passageiros e dados de confirmação não estourem a janela.

### PRIORIDADE MÉDIA (Ajustes de Grid, Spacing e Densidade)
4. **CRM Leads Detalhes (`/agency/$slug/crm/$lead_id`):**
   * *Status Atual:* 🟡 PARCIAL.
   * *Ação Necessária:* Remover os blurs sobrepostos da timeline do lead e unificar o cabeçalho com a `ModuleToolbar`.
5. **Configurações Gerais (`/agency/$slug/settings/*`):**
   * *Status Atual:* 🟡 PARCIAL.
   * *Ação Necessária:* Uniformizar os formulários de cadastro de agência e time utilizando o mesmo grid de spacing do Design System.

### PRIORIDADE BAIXA (Ajustes Estéticos / Portais Externos)
6. **Portal do Cliente (`/client/*`):**
   * *Status Atual:* 🔴 NÃO ALCANÇADO.
   * *Ação Necessária:* Importar e aplicar o reset do Design System do Ambient Glass nas views do cliente.
7. **Portal Superadmin (`/admin/*`):**
   * *Status Atual:* 🔴 NÃO ALCANÇADO.
   * *Ação Necessária:* Unificar a folha de estilo para utilizar variáveis do sistema, eliminando backgrounds fixos sólidos antigos.
