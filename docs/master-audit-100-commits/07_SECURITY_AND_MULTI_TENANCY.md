# 07. Segurança e Isolamento Multi-Tenancy

Este documento audita a segurança do ecossistema TravelOS, analisando o isolamento de dados entre empresas (tenants), controle de privilégios dos usuários, segurança do portal B2C do passageiro, e resiliência contra injeções e vazamentos.

---

## 1. Isolamento Multi-Tenancy e Vazamento de Dados

A plataforma adota uma arquitetura de banco de dados compartilhada (Single Database, Shared Schema) onde o isolamento lógico das agências parceiras é garantido na camada do PostgreSQL.

### 1.1 RLS de Membros da Agência (B2B SaaS)

- **Regra Geral**: Tabelas críticas como `financial_ledger_entries`, `leads`, `trips`, `contracts` e `suppliers` implementam Row Level Security (RLS) associando registros à coluna `agency_id`.
- **Implementação**: A política de acesso executa a função de segurança `public.is_agency_member(auth.uid(), agency_id)` ou `public.has_role(auth.uid(), 'agency_admin', agency_id)`. Um operador autenticado na Agência A que tentar forçar um GET ou UPDATE apontando para o UUID de um registro da Agência B receberá uma resposta vazia ou negação de acesso direta do Supabase.

### 1.2 Privacidade do Portal do Cliente (B2C)

- **Vulnerabilidade Mitigada**: Anteriormente, a leitura da Rooming List no portal do cliente era parcial ou bloqueada por políticas RLS, pois o cliente final não é membro da agência.
- **Resolução**: Foram criadas políticas RLS estritas de leitura baseadas na associação direta do passageiro à viagem. A política permite que um usuário autenticado como cliente final leia apenas os registros de quarto em `boarding_rooming_list` que estejam associados ao seu próprio UUID em `trip_passengers`. Isso impede que passageiros usem ferramentas de desenvolvedor (DevTools) para listar os quartos e dados privados de outros passageiros do grupo.

---

## 2. Escalada de Privilégios e Autorização (RBAC)

O controle de papéis (Role-Based Access Control) é verificado em duas frentes:

1.  **Segurança no Banco (RLS por Papel)**:
    - Ações críticas como alteração de ajustes de comissões em `seller_adjustments` ou o fecho de meses em `monthly_closing_periods` possuem políticas RLS que verificam explicitamente se o `auth.uid()` do usuário possui o papel `agency_admin` ou `super_admin` na tabela `user_roles`.
2.  **Segurança nas Ações de IA (`ActionExecutor.ts`)**:
    - Antes de executar qualquer uma das 27 ferramentas ativas, o backend resolve a função `user_roles` para o operador ativo.
    - O papel é confrontado com o array `action.allowedRoles`. Se um vendedor comum tentar forçar a execução de uma ação restrita a gestores (como `generate_report`), o `ActionExecutor` dispara uma exceção imediata de acesso negado, bloqueando a transação e registrando a tentativa falha no log de auditoria.

---

## 3. Prevenção contra Prompt Injection e Sanitização

O assistente de IA omnichannel consome dados externos e conversas que podem conter instruções maliciosas (Prompt Injection).

- **Isolamento de Conteúdo**: O raspador de páginas e conteúdos do chat isola dados externos dentro de blocos estruturados `<scraped_content>`.
- **Sanitização**: O arquivo `sanitize.ts` remove sistematicamente tags de script, frames e caracteres especiais contra injeções de código (XSS) antes de processar o conteúdo.
- **IA Revisora Sequencial**: O chat implementa uma segunda chamada sequencial ao modelo de linguagem que funciona como um "Gatekeeper" de segurança, analisando se a resposta gerada viola diretrizes de privacidade ou expõe chaves secretas antes de exibi-la ao operador.
