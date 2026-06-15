# Sistema Operacional de Engenharia do TravelOS: Catálogo de Artefatos

Este catálogo define a estrutura exata e o conteúdo obrigatório para cada um dos 20 artefatos técnicos gerados pelo Antigravity durante o desenvolvimento do TravelOS. Toda entrega de funcionalidade deve referenciar estes templates em seu diretório de documentação.

---

## 1. Product Intent Brief

Documento de alinhamento estratégico que descreve o valor da funcionalidade para o ecossistema TravelOS.

```markdown
# Product Intent Brief: [Nome da Feature]

## 1. Alinhamento de Negócio

- **Problema Comercial:** [Que problema do operador de turismo ou agência estamos resolvendo?]
- **Valor Proposto:** [Como a feature impacta a conversão de vendas, eficiência operacional ou governança?]

## 2. Escopo de Produto

- **Público-alvo:** [Agente, Cliente Final, Admin Master, Operador Financeiro]
- **Módulos Conectados:** [Listar componentes e caminhos do sistema afetados]
- **Fluxo Operacional Ideal:** [Passo a passo resumido da experiência do usuário]
```

---

## 2. Inventory Report & 3. Reuse/Refactor/Create Matrix

Relatório que mapeia a base de código antes de qualquer nova codificação, reduzindo código morto e duplicações.

```markdown
# Inventory & Code Reuse Report: [Nome da Feature]

## 1. Varredura de Recursos Existentes

- **Tabelas do Banco Similares:** [Nomes das tabelas e colunas mapeadas via migrations/types]
- **Componentes React Relacionados:** [Arquivos listados no repositório]
- **Hooks & Services Mapeados:** [Hooks de conexão ao Supabase ou chamadas de API]

## 2. Matriz de Decisão (Reuse/Refactor/Create Matrix)

| Entidade Planejada | Recurso Existente Mapeado   | Ação Proposta (Reusar/Refatorar/Extender/Criar) | Justificativa Técnica                                                     |
| :----------------- | :-------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------ |
| [Ex: FileUploader] | `src/components/Upload.tsx` | Extender                                        | Adicionar suporte para múltiplos arquivos em vez de criar novo componente |
| [Ex: leads_status] | _Nenhum_                    | Criar                                           | Nova tabela de controle de pipeline comercial                             |
```

---

## 4. PRD Expansion

Especificação técnica exaustiva que traduz o pedido de negócio em regras de engenharia.

```markdown
# PRD Expandido: [Nome da Feature]

## 1. Descrição e Contexto

[Visão técnica detalhada do escopo final expandido]

## 2. Regras de Negócio Inquebráveis

- **RN01:** [Ex: O agente não pode alterar o status de um lead já ganho sem registrar justificativa.]
- **RN02:** [Ex: O limite máximo de passageiros em um grupo rodoviário deve respeitar a lotação do ônibus.]

## 3. Critérios de Aceitação (Gherkin format)

- **Cenário 01:** [Título do Cenário]
  - **Dado que:** [Contexto prévio]
  - **Quando:** [Ação realizada]
  - **Então:** [Resultado esperado]

## 4. Riscos de Engenharia & Mitigações

- **Risco 01:** [Ex: Concorrência ao reservar o último assento do ônibus]
  - **Severidade:** [Crítico / Alto / Médio]
  - **Mitigação:** [Uso de transação PostgreSQL com lock pessimista na linha]
```

---

## 5. Technical Design Document

Especificação arquitetural detalhada da solução contendo padrões de componentização e fluxos.

```markdown
# Technical Design Document: [Nome da Feature]

## 1. Arquitetura da Solução

- **Camada de UI:** [Componentes React envolvidos, estrutura de pastas]
- **Camada de Estado:** [Uso de Zustand, React Query ou Context API]
- **Camada de Integração:** [Hooks e Services customizados para consumo do Supabase]

## 2. Fluxo de Dados (Sequência lógica)

1. Usuário interage com [Componente X].
2. [Componente X] dispara ação através do hook [Hook Y].
3. [Hook Y] executa RPC ou chamada direta ao Supabase.
4. Banco de dados valida as regras via RLS e persiste a alteração.
5. React Query invalida cache e atualiza a interface de forma otimista.
```

---

## 6. Data Model Plan & 7. Supabase Security Plan

Estrutura de dados proposta com foco nas tabelas, chaves, índices e políticas de Row Level Security.

````markdown
# Data & Supabase Security Plan: [Nome da Feature]

## 1. Estrutura de Tabelas (DML)

```sql
-- Schema da nova tabela
CREATE TABLE public.leads_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices recomendados
CREATE INDEX idx_leads_tracking_agency_id ON public.leads_tracking(agency_id);
CREATE INDEX idx_leads_tracking_lead_id ON public.leads_tracking(lead_id);
```
````

## 2. Diretrizes de Segurança (Supabase Security)

- **Row Level Security (RLS):**
  - `ALTER TABLE public.leads_tracking ENABLE ROW LEVEL SECURITY;`
- **Políticas (Policies):**
  ```sql
  CREATE POLICY "Permitir leitura apenas para agentes da mesma agência"
    ON public.leads_tracking FOR SELECT
    USING (auth.jwt() ->> 'agency_id' = agency_id::text);
  ```

````

---

## 8. Threat Model
Mapeamento preventivo contra ataques e vulnerabilidades na nova funcionalidade.

```markdown
# Threat Model: [Nome da Feature]

## 1. Ativos & Atores
* **Ativos Críticos:** [Dados de clientes, relatórios financeiros, contratos]
* **Atores Autorizados:** [Admin da Agência, Cliente, Agente comercial]

## 2. Attack Surface Matrix (Matriz de Superfície de Ataque)
| Superfície | Ator Malicioso | Ataque Possível | Dado Afetado | Controle Atual | Severidade | Correção Proposta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Endpoint `/api/upload` | Usuário público | Upload de shell web | Servidor backend | Validação de extensão visual | Alta | Validar MIME-type real no storage policy |
| Parâmetro `lead_id` | Agente de outro tenant | Acesso a leads cross-tenant | Dados do cliente | Filtro no Frontend | Crítica | Política RLS validando `auth.uid() -> agency_id` |
````

---

## 9. UI/UX Premium Specification & 10. Design System Compliance Report

Garanta que as interfaces correspondam a experiências ricas de nível SaaS Premium.

```markdown
# UI/UX Premium & Compliance Report: [Nome da Feature]

## 1. Especificações Visuais Premium

- **Estados de Interface:**
  - **Loading State:** [Uso de Skeleton Loaders ou Spinners customizados do Design System]
  - **Error State:** [Tratamento visual amigável com botão de Retry]
  - **Empty State:** [Ilustração ilustrativa e CTA para engajamento]
- **Micro-animações:** [Transições suaves de foco, hover e abertura de modais]

## 2. Checklist de Conformidade Visual

- [ ] O componente usa exclusivamente cores declaradas no tema do Tailwind (sem hexadecimais hardcoded).
- [ ] A interface foi testada em resolução mobile (375px) e não possui quebras de layout ou overflow horizontal.
- [ ] Elementos interativos possuem estados `:hover` e `:active` claramente distinguíveis.
```

---

## 11. Prompt-to-Code Match Matrix & 12. Feature Reality Matrix

Relatório empírico provando que o código implementado corresponde à realidade funcional do sistema.

```markdown
# Feature Reality & Match Matrix: [Nome da Feature]

## 1. Matriz de Correspondência (PRD vs Código)

| Requisito do PRD   | Arquivo/Código de Implementação | Status de Match | Observações/Simplificações                                             |
| :----------------- | :------------------------------ | :-------------- | :--------------------------------------------------------------------- |
| Paginação de leads | `src/hooks/useLeads.ts`         | Match Completo  | Implementado paginação cursor-based com limite padrão de 20            |
| Logs de alteração  | `supabase/migrations/logs.sql`  | Match Parcial   | Registra apenas alterações de status, não histórico de edições do nome |

## 2. Prova de Vida da Feature (Reality Matrix)

- [ ] **Camada Visual:** Arquivo `src/routes/agency.$slug.leads.tsx` contém interface interativa funcional.
- [ ] **Integração:** Hook `src/hooks/useLeads.ts` consome dados dinâmicos do banco Supabase.
- [ ] **Persistência:** Tabela `public.leads` contém colunas físicas reais para todos os campos cadastrados.
- [ ] **Segurança:** Políticas RLS habilitadas e ativas no banco de dados.
```

---

## 13. Regression Report & 18. Release Gate Report

Checagem de compilação, integridade do sistema e decisão técnica para publicação do código.

```markdown
# Regression Gate & Release Report: [Nome da Feature]

## 1. Auditoria de Integridade e Compilação

- **Build do Projeto:** [Sucesso / Falhou] (Comando: `npm run build`)
- **TypeScript Compiler (tsc):** [Sem erros / Lista de avisos]
- **Análise estática (Linter):** [Sem avisos / Correções pendentes]

## 2. Veredito Final (Release Gate)

- **Status de Publicação:** [APPROVED / APPROVED WITH RISKS / BLOCKED]
- **Riscos Identificados:** [Catalogar se houver riscos aceitáveis em produção]
- **Assinatura do QA:** [Nome do agente responsável pela auditoria]
```

---

## 14. Tourism Operations Fit Report & 15. Commercial Flow Report

Validação do funcionamento prático do produto e seu encaixe nos fluxos de venda reais da agência.

```markdown
# Tourism & Commercial Operations Report: [Nome da Feature]

## 1. Validação de Regras do Turismo

- **Processamento de Viajantes:** [Como o sistema gerencia dados de passageiros, rooming list ou bilhetes?]
- **Documentação Turística:** [O fluxo gera vouchers válidos, roteiros limpos e contratos assináveis?]

## 2. Pipeline Comercial (CRM de Vendas)

- **Rotatividade de Leads:** [Como a feature impacta a velocidade e rastreabilidade no funil comercial?]
- **Comissionamento:** [Há divisão clara de metas de vendas ou cálculo automático de margens de comissão?]
```

---

## 16. CMS Block Matrix

Matriz de consistência estrutural para componentes de blog, landing pages e construtores de conteúdo.

```markdown
# CMS Block Matrix: [Página ou Módulo do CMS]

| Tipo de Bloco | Propriedades do Schema JSON                       | Editor Visual Anexo               | Renderizador Frontend        | Suporte SEO Dinâmico             |
| :------------ | :------------------------------------------------ | :-------------------------------- | :--------------------------- | :------------------------------- |
| `FAQBlock`    | `{ questions: { q: string, a: string }[] }`       | `src/admin/blocks/FAQEditor.tsx`  | `src/portal/blocks/FAQ.tsx`  | Sim (Schema FAQPage estruturado) |
| `HeroBanner`  | `{ title: string, bgImage: string, cta: string }` | `src/admin/blocks/HeroEditor.tsx` | `src/portal/blocks/Hero.tsx` | Sim (Injeção de Tags OpenGraph)  |
```

---

## 17. Contracts & Legal Governance Report

Auditoria de conformidade com a LGPD e governança de aceites digitais.

```markdown
# Contracts & Legal Governance Report: [Nome da Feature]

## 1. Governança e Rastreabilidade LGPD

- **Finalidade do Dado:** [Qual a justificativa legal para coletar e armazenar cada informação do viajante?]
- **Dados Pessoais Sensíveis:** [Há coleta de dados de saúde, alergias ou restrições alimentares? Como são protegidos?]

## 2. Evidência Jurídica de Aceite

- [ ] O cliente deve marcar ativamente a caixa de aceitação (sem seleção prévia por padrão).
- [ ] O sistema grava no banco a trilha de auditoria: IP de origem, data/hora exata do clique e o hash do documento.
- [ ] O banco impede a modificação retroativa dos registros de aceites dos termos.
```

---

## 19. Risk Register

Registro contínuo de riscos técnicos e de negócios mapeados na funcionalidade.

```markdown
# Risk Register: [Nome da Feature]

| ID    | Descrição do Risco                                  | Categoria   | Probabilidade | Impacto | Nível de Risco | Ação Mitigadora                                                  |
| :---- | :-------------------------------------------------- | :---------- | :------------ | :------ | :------------- | :--------------------------------------------------------------- |
| RK-01 | Lentidão na consulta ao listar milhares de vouchers | Performance | Média         | Alto    | Alto           | Adicionar paginação e índice composto nas colunas do voucher     |
| RK-02 | Inserção de dados com agência incorreta via payload | Segurança   | Baixa         | Crítico | Alto           | RLS no Supabase comparando o agency_id do token com o do payload |
```

---

## 20. Evidence Log

Trilha de auditoria técnica que fornece provas físicas das alegações de funcionamento.

```markdown
# Evidence Log: [Nome da Feature]

## 1. Provas de Persistência no Banco (Supabase)

- **Migration Criada:** [Path do arquivo de migração sql]
- **Evidência RLS:** [Exemplo de consulta SQL testada que comprova a restrição de Tenant]

## 2. Provas Funcionais Frontend (React / Vite)

- **Rotas Implementadas:** [Lista de rotas físicas no arquivo router]
- **Testes de UI:** [Capturas de tela de loading, empty states ou logs de transações bem-sucedidas salvas]
```
