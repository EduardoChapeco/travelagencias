# Qualidade do Código e Arquitetura (Turis)

Este relatório expõe problemas de qualidade de código, dependências inadequadas, acoplamento e desvios de arquitetura no Turis.

---

## 1. Problemas de Dívida Técnica Identificados

### 1.1 Uso Excessivo de `as any` em Consultas do Supabase

- **Problema**: O arquivo [reconciliation.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx) e o [ActionExecutor.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) recorrem frequentemente a coerções de tipo (`as any`) em chamadas como `(supabase as any).from('cash_registers')` e `(supabase.rpc as any)('calculate_dre_summary')`.
- **Impacto**: O compilador TypeScript não valida os parâmetros e payloads das tabelas e RPCs recém-criadas, abrindo margem para bugs em caso de refatoração do banco de dados.
- **Ação**: Consolidar/gerar novamente as definições do esquema do Supabase na tipagem global `src/integrations/supabase/types.ts`.

### 1.2 Cálculo de Rentabilidade de Grupos no Frontend (Falta de Paginação)

- **Problema**: O cálculo de receita realizada, custos operacionais e margem de ROI de grupos em [groups.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.groups.tsx) é inteiramente client-side. Não há paginação: todas as excursões da agência são trazidas de uma só vez.
- **Impacto**: Lentidão de carregamento se a agência possuir centenas de grupos históricos.
- **Ação**: Reescrever a agregação no banco de dados e aplicar paginação limite de 20 itens por página.

### 1.3 Mocks de Ação e Lógica Simulada no `ActionExecutor`

- **Problema**: Cerca de 12 das 23 ações estruturadas descritas em [ActionExecutor.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts#L744-L748) (ex: `generate_contract`, `generate_voucher`, `query_supplier`) não possuem implementações reais no banco de dados, apenas gerando UUIDs aleatórios na memória e disparando mensagens estáticas de sucesso.
- **Impacto**: O motor de IA é "fake" para essas ações: finge cadastrar ou consultar dados, induzindo o operador ao erro na produção.
- **Ação**: Implementar fisicamente os CRUDs e triggers de banco correspondentes a cada uma dessas ações pendentes.
