# Rule 01 — Zero Mock, Zero Scratch

## Princípio
Todo dado exibido na UI **deve vir de uma tabela real do Supabase**, de uma Edge Function real, ou de um cálculo derivado desses dados.

## O que é BLOQUEANTE (nunca merge sem corrigir)
- `const mockData = [...]` em qualquer arquivo de produção
- `// TODO: conectar depois` em qualquer componente de feature
- Arrays de exemplo hardcoded onde deveria haver uma query
- Dados de formulário salvos apenas em estado local sem persistência

## O que é OBRIGATÓRIO antes de criar qualquer arquivo novo
1. Buscar se já existe componente/hook/serviço equivalente no codebase
2. Verificar: `grep -r "nomeDaFuncionalidade" src/ --include="*.tsx" --include="*.ts"`
3. Declarar explicitamente: "Não encontrei equivalente existente" antes de criar do zero
4. Duplicação de lógica (dois hooks que fazem o mesmo fetch, dois schemas Zod para a mesma entidade) é incidente a resolver, não débito aceitável

## Fluxo correto quando dado ainda não existe no banco
1. Criar migration com a coluna/tabela necessária
2. Adicionar RLS imediatamente (nunca tabela sem política)
3. Regenerar tipos: `supabase gen types typescript --linked > src/types/supabase.ts`
4. Atualizar os hooks/queries que consomem esse tipo
5. Conectar a UI ao dado real

## Heurística rápida
> "Se eu desligar a internet e o componente ainda renderizar dados, é mock. Bug crítico."
