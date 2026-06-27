# 07. Paridade de Contratos Estáticos e Tempo de Execução

Este documento analisa a conformidade entre as definições de tipos no TypeScript, os esquemas de validação em tempo de execução (Zod) e o esquema físico de tabelas e colunas do banco de dados remoto.

---

## 1. Mapeamento de Divergências de Contratos (TypeScript vs. Banco)

Após a última rodada de sincronização de tipos em [src/integrations/supabase/types.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/integrations/supabase/types.ts), obtivemos os seguintes resultados:

### A. Coerções e Casts Identificados no Código (Corrigidos)
1. **Casts em Chamadas de RPC (Resolvido)**:
   * Removemos completamente o cast `as any` na chamada da RPC `convert_quote_to_proposal` em `quotes.$id.tsx`.
   * **Correção**: A RPC foi catalogada no arquivo de tipos do Supabase `types.ts`, habilitando o autocompiles e a validação estática de parâmetros nativos do compilador TypeScript.
2. **Uso de `(supabase as any)` em Consultas (Resolvido)**:
   * Removemos todas as coerções de `(supabase as any)` em `financial.cash.tsx` e `financial.reconciliation.tsx`.
   * **Correção**: Atualizamos a tipagem estática e vinculamos as tabelas `cash_registers` e `cash_sessions` diretamente no cliente do Supabase, garantindo typecheck ativo e livre de desvios.
3. **Mapeamento de JSONB (`normalized_intent`)**:
   * Em `quotes.ts` e `quotes-scoring.ts`, o objeto de intenção é forçado a assumir o tipo `TravelIntent` através de:
     ```ts
     const intent = candidate.quote_requests?.normalized_intent as unknown as TravelIntent;
     ```
   * **Causa**: A coluna `normalized_intent` no banco de dados está modelada como tipo `jsonb` genérico. O TypeScript não consegue inferir a estrutura da intenção sem o cast `as unknown as TravelIntent`, o que é aceito dada a flexibilidade do JSONB do Postgres.

---

## 2. Validação em Tempo de Execução (Runtime Validation)

O sistema utiliza a biblioteca **Zod** para validar as entradas do usuário no frontend antes da persistência:
* **Caixa Diário**: Os esquemas `openSchema`, `closeSchema` e `txSchema` em `cash.tsx` validam valores numéricos positivos e campos de texto obrigatórios, garantindo consistência sintática antes do envio das mutações.
* **Intenção de Viagem**: A interpretação de linguagem natural no chat omnichannel converte o texto livre do lead em um objeto estruturado Zod no frontend para depois gravá-lo como `jsonb` no banco.

---

## 3. Diretrizes para Eliminar Casts Perigosos
* **Regenerar Tipos Automaticamente**: Configurar um script de CI ou comando local (`npm run gen-types`) que execute `supabase gen types typescript --linked > src/integrations/supabase/types.ts` pós-migrações para eliminar a necessidade de `as any` ou `as unknown`.
* **Schemas de Validação Zod no Backend**: Validar payloads complexos de `jsonb` (como a intenção de viagem) no nível da Edge Function usando esquemas Zod antes de persistir nas tabelas de cotação.
