# 07 ARQUITETURA ESPERADA VS REAL

- **Esperado:** Separação entre Domínio, Aplicação e Infraestrutura.
- **Real:** Arquitetura fortemente acoplada ao `@tanstack/react-query` e `@supabase/supabase-js` diretamente nos componentes (`src/routes`). A camada de Serviços (`src/services`) atua apenas como wrapper de fetch em alguns casos, mas a UI chama o banco via `useQuery` diretamente.
- **Diagnóstico:** Arquitetura BaaS (Backend-as-a-Service) típica, onde o Supabase (Postgres) é o Domínio e a Infraestrutura simultaneamente.
