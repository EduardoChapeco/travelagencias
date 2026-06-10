# Framework: BigTech Regression Gate

**Propósito:** Garantir que nenhuma linha de código entregue quebre o que já estava funcionando antes. O TravelOS não pode sofrer de regressões bobas.

## Checklist Obrigatório (Pré-Deploy)
1. **Linter & Types:** Executar as verificações de TypeScript para garantir que a feature nova não contaminou arquivos adjacentes.
2. **Caça aos Fantasmas (Grep estrito):**
   - Buscar por restos de testes (`mockData`, `console.log`, `alert`).
   - Buscar botões quebrados (`href="#"`).
   - Buscar variáveis sensíveis hardcoded.
   - Buscar query builders perigosos sem `.limit()` ou chamadas de deleção sem `soft delete` ou RLS rigorosa.
3. **Vazamento de Escopo:** Garantir que rotas administrativas (`/admin`) não acabaram cruzando lógicas em rotas de agências (`/agency`).

Nenhuma aprovação ocorre sem a passagem por este portão.
