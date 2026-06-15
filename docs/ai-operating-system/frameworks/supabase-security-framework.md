# Framework: Zero Trust Supabase Security Framework

**Propósito:** Garantir que o banco de dados PostgreSQL e os serviços de armazenamento/autenticação do Supabase funcionem como barreiras de segurança intransponíveis contra fraudes, vazamento de dados inter-tenant (cross-tenant data breach) e privilégios excessivos.

---

## 1. Regras de Ouro de Row Level Security (RLS)

1. **RLS Habilitada por Padrão:**
   - Nenhuma tabela deve ser criada ou modificada sem a instrução de ativação do RLS nas migrações SQL:
     ```sql
     ALTER TABLE public.nome_da_tabela ENABLE ROW LEVEL SECURITY;
     ```
2. **Isolamento de Tenants (Multi-Tenancy):**
   - Toda tabela de escopo operacional deve possuir uma coluna `agency_id UUID` que referencia a tabela de agências do sistema.
   - Políticas de SELECT, INSERT, UPDATE e DELETE devem garantir isolamento estrito. A query deve verificar se o ID do tenant da linha é idêntico ao `agency_id` embutido nos metadados JWT do usuário logado:
     ```sql
     -- Exemplo de política restritiva padrão
     CREATE POLICY "tenant_isolation_select" ON public.leads
       FOR SELECT
       USING (
         (auth.jwt() ->> 'agency_id')::uuid = agency_id
       );
     ```
   - Evitar o uso de subconsultas complexas dentro de políticas de RLS para tabelas muito movimentadas, prevenindo degradação de performance. Prefira mapear claims customizados no token JWT ou usar tabelas auxiliares indexadas.

---

## 2. Governança de RPCs (Database Functions)

1. **Restrição de SECURITY DEFINER:**
   - Por padrão, toda função criada deve ser do tipo `SECURITY INVOKER` (executa com os privilégios do usuário que a invoca, respeitando as RLS).
   - Se for estritamente necessário elevar privilégios para executar ações em tabelas restritas (bypass de RLS), a função pode ser declarada como `SECURITY DEFINER`. Nesse caso, ela **deve conter obrigatoriamente** as seguintes salvaguardas:
     - O `search_path` deve ser explicitado para evitar ataques de manipulação de caminhos (Path Hijacking):
       ```sql
       CREATE OR REPLACE FUNCTION public.criar_primeiro_usuario_agencia(...)
       RETURNS void
       LANGUAGE plpgsql
       SECURITY DEFINER
       SET search_path = public
       AS $$ ... $$;
       ```
     - A função deve fazer verificação lógica de autorização no início do seu bloco de código (ex: validar se o executor possui privilégios de Admin Master).

---

## 3. Segurança e Isolamento de Storage Buckets

1. **Classificação de Mídias:**
   - **Buckets Públicos:** Usados apenas para conteúdo estático de visualização anônima (ex: imagens de postagens do blog, logotipos de agências no portal).
     - Políticas RLS de Storage para buckets públicos devem permitir `SELECT` para todos, mas limitar `INSERT`, `UPDATE` e `DELETE` para usuários autenticados da agência proprietária.
   - **Buckets Privados:** Usados para ativos de valor comercial ou dados pessoais (ex: relatórios financeiros, termos assinados, PDFs de vouchers, passaportes dos viajantes).
     - RLS de Storage deve restringir o acesso apenas a usuários vinculados ao tenant correspondente.
     - O download ou visualização de arquivos destes buckets deve ser feito estritamente por meio de **Signed URLs** de curta duração (ex: 10 a 15 minutos).

---

## 4. Otimização, Constraints e Índices

1. **Índices Compostos e Parciais:**
   - Toda tabela que implementa isolamento de tenant deve possuir um índice focado em `agency_id` para otimizar a velocidade das consultas filtradas pelo RLS.
   - Chaves estrangeiras (FK) críticas devem possuir índices anexos para evitar tabelas sequenciais (Table Scans) lentas em operações de Join.
2. **Database Constraints:**
   - Validar consistências diretamente no DDL. Utilizar restrições `CHECK` para campos numéricos positivos (ex: preços, tarifas, cotas de assento) e garantir integridade de e-mails usando expressões regulares (Regex) em constraints se necessário.
