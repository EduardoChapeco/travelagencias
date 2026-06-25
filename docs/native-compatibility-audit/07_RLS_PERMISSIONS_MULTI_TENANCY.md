# Auditoria de RLS, Permissões e Multi-Tenancy

Este documento analisa a eficácia das políticas de segurança baseadas em Row Level Security (RLS) aplicadas no banco de dados para garantir o isolamento estrito de dados entre diferentes agências (multi-tenant) e a proteção de privilégios de administrador global.

---

## 1. Status de RLS por Tabela Remota

| Tabela                   | RLS Ativo? | Política Existente           | Nível de Segurança | Risco / Vulnerabilidade                                                                                                                                                              |
| :----------------------- | :--------- | :--------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quote_requests`         | Sim        | `quote_requests_all`         | Seguro             | Garante isolamento estrito via `is_agency_member` para o tenant da agência.                                                                                                          |
| `quote_travelers`        | Sim        | `quote_travelers_all`        | Seguro             | Valida a existência do request associado com a agência do membro.                                                                                                                    |
| `quote_preferences`      | Sim        | `quote_preferences_all`      | Seguro             | Valida a existência do request associado.                                                                                                                                            |
| `quote_search_plans`     | Sim        | `quote_search_plans_all`     | Seguro             | Valida o request associado.                                                                                                                                                          |
| `quote_scenarios`        | Sim        | `quote_scenarios_all`        | Seguro             | Valida o plano de busca associado.                                                                                                                                                   |
| `normalized_offers`      | Sim        | `normalized_offers_all`      | Seguro             | Isolado no escopo da agência.                                                                                                                                                        |
| `package_candidates`     | Sim        | `package_candidates_all`     | Seguro             | Isolado via request.                                                                                                                                                                 |
| `package_scorecards`     | Sim        | `package_scorecards_all`     | Seguro             | Isolado via candidato.                                                                                                                                                               |
| `score_profiles`         | Sim        | `score_profiles_all`         | **Vulnerável**     | O RLS permite `ALL` (Select, Insert, Update, Delete) se o escopo for `global`. Qualquer usuário autenticado de qualquer agência pode alterar ou remover um perfil de scoring global. |
| `decision_rules`         | Sim        | `decision_rules_all`         | **Vulnerável**     | Permite `ALL` para escopo `global` para qualquer usuário autenticado.                                                                                                                |
| `decision_rule_versions` | Sim        | `rule_versions_all`          | **Vulnerável**     | Qualquer usuário autenticado pode gravar ou alterar versões de regras se a regra pai for global.                                                                                     |
| `knowledge_sources`      | **Não**    | Inexistente (Tabela ausente) | **Quebrado**       | Sem proteção ativa.                                                                                                                                                                  |
| `knowledge_documents`    | **Não**    | Inexistente                  | **Quebrado**       | Sem proteção ativa.                                                                                                                                                                  |
| `knowledge_chunks`       | **Não**    | Inexistente                  | **Quebrado**       | Sem proteção ativa.                                                                                                                                                                  |
| `knowledge_embeddings`   | **Não**    | Inexistente                  | **Quebrado**       | Sem proteção ativa.                                                                                                                                                                  |

---

## 2. Riscos de Escalação de Privilégios e Vazamento de Tenant

### 2.1. Vulnerabilidade P0: Modificação de Regras Globais por Agências Comuns

Como a migração `20260727000000_vibetour_global_rules_security.sql` não está aplicada, o banco de dados remoto mantém as políticas históricas fracas:

```sql
CREATE POLICY score_profiles_all ON public.score_profiles
  FOR ALL TO authenticated USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );
```

- **Cenário de Ataque**: Um agente malicioso ou uma conta comprometida da **Agência A** pode emitir uma instrução `UPDATE public.score_profiles SET weights = '{"price": 1.0, "comfort": 0.0}' WHERE scope = 'global'`. A chamada será aceita pelo banco de dados e corromperá as regras de qualificação de todas as outras agências que utilizam o perfil "Equilíbrio".

### 2.2. Falta de RLS em Tabelas RAG

Como as tabelas de conhecimento não existem no banco de dados remoto, quando forem implantadas, é crítico garantir a aplicação estrita das políticas descritas em `20260728000000`. Sem elas, documentos internos confidenciais indexados pela **Agência A** (como comissões e negociações diretas com fornecedores) seriam visíveis via busca vetorial ou select para a **Agência B**.
