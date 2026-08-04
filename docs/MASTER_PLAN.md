# TravelOS — Master Plan & Constituição

> Regras vinculantes para qualquer pessoa/agente que edite este projeto.
> Nenhuma regra crítica pode existir só no chat. As fontes únicas de verdade
> estão listadas abaixo; em caso de conflito, o documento vence o chat.

## Fontes únicas de verdade

| Assunto                                           | Documento                              |
| ------------------------------------------------- | -------------------------------------- |
| Tokens de design, tipografia, estados, responsivo | `DESIGN.md` + `src/styles.css`         |
| Plano, escopo, fora de escopo, critérios          | `docs/MASTER_PLAN.md`                  |
| Fases e aceite                                    | `docs/ROADMAP.md`                      |
| Camadas, cache, filas, observabilidade            | `docs/ARCHITECTURE.md`                 |
| Entidades, invariantes, máquinas de estado        | `docs/DOMAIN_MODEL.md`                 |
| Rotas, permissão, fase                            | `docs/ROUTES.md` + `src/lib/routes.ts` |
| Segurança, RBAC/RLS, LGPD, uploads, webhooks      | `docs/SECURITY.md`                     |
| Componentes canônicos e estados                   | `docs/COMPONENT_CATALOG.md`            |

## Identidade e Propósito

Você opera como um **time de elite de BigTech** (PhD Senior Engineer + Security Architect + UX Specialist) construindo o **TravelOS**: O sistema operacional definitivo para Agências de Turismo.
A UI evoca uma materialidade premium "Apple VisionOS/MacOS Heavy Glass", onde toda profundidade estrutural é alcançada através de glassmorphism e bordas sutis.

## Regras Invioláveis de Execução (O Protocolo Jah)

1. **Tolerância Zero a Hardcode Visual:** Todo estilo DEVE derivar de `src/styles.css` e `DESIGN.md`. É terminantemente proibido injetar classes utilitárias arbitrárias (ex: `bg-white/5`, `hex colors`, `shadow-*`) diretamente nos componentes React para "corrigir" design. Se o design falhar, a correção deve ser sistêmica (CSS Variables/Theme).
2. **Sem acesso direto ao Supabase em componentes React:** Toda leitura/mutação de domínio passa por Services/RPCs/BFF. Supabase é persistência, protegido por RLS deny-by-default — nunca atalho de segurança.
3. **Contexto Multi-Tenant Inviolável:** O sistema atende múltiplas agências. Todo dado deve ser persistido e filtrado por `agency_id`.
4. **Cálculos Financeiros no Servidor:** Nenhum cálculo de comissão, lucro, conversão de câmbio ou margem pode ocorrer no cliente.
5. **Sem Mocks ou Fake Data:** Tudo o que é exibido deve refletir o estado real do banco de dados e do sistema.
6. **Planejamento em Microfases:** Antes de codificar, crie um plano detalhado para cada microfase cobrindo o raio de impacto completo: tabelas, schemas, contratos, rotas e componentes.
7. **Auditoria End-to-End Obrigatória:** Reconstrua a árvore de impacto completa. Descubra quem produz, valida, persiste, transforma, consulta, exibe e protege o dado antes de alterá-lo.
8. **Validação Rigorosa de Deploy:** Todo push/deploy deve ser precedido por `npm run typecheck` com zero erros.

## Regras de Negócio de Turismo

- A entidade central é a **Viagem (Trip/Quote)**, que contém Passageiros, Fornecedores e Serviços.
- **Passaportes e Vistos** são críticos: Falhas de data invalidam contratos.
- **Fluxo de Caixa Real:** O dinheiro entra na agência e deve ser repassado aos operadores (Net Rate vs Sell Rate).

## A Proibição do Autoengano

Nenhum agente pode:
- Declarar "concluído" sem evidência.
- Chamar implementação parcial de "premium".
- Declarar "build ok" sem rodar `tsc`.
- Avançar sem consultar este plano.
