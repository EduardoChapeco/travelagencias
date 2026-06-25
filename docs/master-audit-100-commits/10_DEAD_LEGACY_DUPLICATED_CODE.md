# 10. Código Morto, Legado e Duplicações

Este documento identifica componentes obsoletos, rotas redundantes, campos de tabelas abandonados e lógica duplicada que representam dívida técnica no repositório do TravelOS.

---

## 1. Mapeamento de Código Morto e Órfão

Ao longo das sucessivas rodadas de reestruturação e migração para dados reais, diversas estruturas foram descontinuadas ou substituídas:

1.  **Mocks de Chat e Lógicas Simuladas (Descontinuados)**:
    - _Onde_: `ActionExecutor.ts`.
    - _Descrição_: O código continha blocos de retorno simulado com dados fictícios para ações como `generate_contract` e `generate_voucher`. Estes blocos foram substituídos por inserções reais nas tabelas do Supabase, restando apenas logs de contingência para falhas de chaves de API.
2.  **Array localPending de Conciliação Pix (Excluído)**:
    - _Onde_: `reconciliation.tsx`.
    - _Descrição_: A listagem de comprovantes pendentes era gerida por uma lista estática mockada em memória. O componente foi limpo, consumindo diretamente os dados físicos das tabelas.
3.  **Arquivos scratch e Scripts Auxiliares (Não Utilizados em Produção)**:
    - _Onde_: Diretório raiz e pasta `scratch/`.
    - _Descrição_: Diversos scripts NodeJS (`patch_types.cjs`, `patch_advanced_financials.cjs`, `patch_reaccommodation_types.cjs`, `reorganize_types.cjs`, etc.) são mantidos no espaço de trabalho para sincronização de tipos locais e migrations. Eles não são empacotados na build final do Vite, mas devem ser catalogados para evitar poluição visual.

---

## 2. Dívidas Técnicas de Banco de Dados e Schemas

- **Uso Legado de JSONB na Rooming List (Migrado)**:
  - _Situação_: A tabela `group_tours` continha uma coluna `rooming_list` do tipo JSONB que armazenava de forma desestruturada os ocupantes de leitos.
  - _Ação Corretiva_: A migração `20260625000001_rooming_list_consolidation.sql` normalizou essa estrutura para a tabela `boarding_rooming_list`. A antiga coluna JSONB foi mantida temporariamente no banco de dados para retrocompatibilidade de consultas de leitura legadas, mas é considerada código legado ativo e deve ser removida permanentemente após a homologação completa dos novos portais.
- **Filtros Contábeis e Agregações Client-side (Substituídos)**:
  - _Situação_: O faturamento de grupos e cálculos de ROI eram calculados por meio de laços `map` e `reduce` diretamente no navegador do operador em `groups.tsx`.
  - _Ação Corretiva_: Toda a agregação foi centralizada na vista SQL `group_tours_financial_summary`. O frontend foi limpo, consumindo a vista paginada diretamente, eliminando carga excessiva de memória no cliente.
- **Campos de Contatos e Reviews de Fornecedores**:
  - A tabela `suppliers` mantinha campos textuais genéricos para contatos e classificações. Estes dados foram normalizados nas novas tabelas `supplier_contacts` e `supplier_reviews`, mas os campos legados originais na tabela `suppliers` permanecem nulos e devem ser descontinuados (dropped) em migrations futuras.
