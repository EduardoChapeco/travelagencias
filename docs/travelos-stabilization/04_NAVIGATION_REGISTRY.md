# 04_NAVIGATION_REGISTRY.md — Registro de Navegação e Rotas

## Estrutura de Navegação Canônica
A navegação do sistema é totalmente configurada de forma declarativa e tipada no arquivo `src/lib/navigation.config.ts`.

### Módulos Principais Cadastrados
- `dashboard` -> Rota: `/`
- `daily-tasks` -> Rota: `/daily-tasks` (submódulos para Meu Dia, Kanban, Lista, Calendário, Timeline, Workload e Relatórios).
- `calendar` -> Rota: `/calendar`
- `inbox` -> Rota: `/inbox`
- `crm` -> Rota: `/crm` (submódulos para Funil, Cotações, Propostas e Contratos).
- `trips` -> Rota: `/trips` (submódulos para Viagens, Aéreos e Embarques).
- `group-tours` -> Rota: `/group-tours` (submódulos para Excursões, Frota/Ônibus, Rooming List e Financeiro de Grupos).
- `clients` -> Rota: `/clients` (submódulos para Clientes, Corporativo e Fornecedores).
- `financial` -> Rota: `/financial` (submódulos para Caixa, DRE, Conciliação, Faturas, Grupos e Razão).
- `support` -> Rota: `/support` (submódulos para Tickets e Vistos).
- `portal` -> Rota: `/portal` (submódulos para Site da Agência, Concorrentes e Inteligência de Destinos).
- `settings` -> Rota: `/settings` (submódulos para Empresa, Equipe, Marca, APIs, Assinatura, Configurações, Fechamentos e Auditoria).

## Redirecionamentos de Segurança
Qualquer requisição relativa ou rota legada para `/daily-tasks/support` é direcionada via TanStack Router com redirecionamento absoluto para `/support`, mantendo a integridade da navegação.
