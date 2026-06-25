# Plano Corretivo e Refatoração (Corrective Refactoring Plan)

Este documento descreve a estratégia técnica e ações necessárias para compatibilizar, proteger e corrigir todas as inconformidades identificadas na auditoria do Motor VibeTour.

---

## 1. Fase 1: Sincronização e Aplicação de Migrations (Banco de Dados)

### Ação 1.1: Registrar a Migration `20260726000000_vibetour_quote_tables.sql` como Aplicada

- **Causa Raiz**: As tabelas core foram criadas manualmente, impedindo o deploy automático de novas migrations locais.
- **Estratégia**: Executar uma inserção manual na tabela de controle de migrations do Supabase para registrar o timestamp local como aplicado, sem tentar recriar as tabelas.
- **SQL a Executar**:
  ```sql
  INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260726000000');
  ```

### Ação 1.2: Aplicar Migrations Pendentes (`20260727000000` e `20260728000000`)

- **Estratégia**: Executar as migrations de segurança RLS e de tabelas RAG no banco remoto utilizando a ferramenta de migração oficial do Supabase:
  ```bash
  npx supabase db push
  ```

---

## 2. Fase 2: Correção de Bugs de Código e Segurança

### Ação 2.1: Resolver Vulnerabilidades RLS (Multi-Tenant)

- **Objetivo**: Garantir que perfis de scoring e regras de decisão globais sejam somente-leitura para usuários autenticados comuns, exigindo papel de `super_admin` para escrita.
- **Ficheiros Afetados**: Supabase remoto (aplicando a migration `20260727000000_vibetour_global_rules_security.sql`).

### Ação 2.2: Resolver Erros de Compilação TypeScript

- **Ficheiro**: `src/services/quotes-simulation.ts`
- **Correções**:
  1. Realizar cast de `normalized_intent` para a interface `TravelIntent` antes de acessar propriedades estruturadas:
     ```typescript
     const intent = cand.quote_requests?.normalized_intent as unknown as TravelIntent;
     const destination = intent?.destinations?.[0]?.name || "Destino";
     ```
  2. Converter ou forçar cast do campo JSONB `warnings` para array antes de chamar `.join()`:
     ```typescript
     const warningsArray = Array.isArray(cand.warnings) ? (cand.warnings as string[]) : [];
     // ...
     Alertas Logísticos: ${warningsArray.join(", ") || "Nenhum"}
     ```

### Ação 2.3: Resolver Bug de Handshake HTTPS do Infotravel

- **Causa Raiz**: O conector local aponta para `http://reservas.incomumviagens.com.br/api/v1` que sofre redirecionamento 301.
- **Ficheiro**: Banco de dados (tabela `api_keys`) e `src/services/infotravel.ts`.
- **Correção**: Alterar a URL padrão registrada no banco e nas chamadas para utilizar `https` nativo de forma direta.

### Ação 2.4: Bloquear Duplo Clique na UI (Idempotência)

- **Ficheiro**: `src/routes/agency.$slug.quotes.$id.tsx`
- **Correção**: Desabilitar fisicamente o botão de converter cotação em proposta usando o estado `converting` e o loader:
  ```tsx
  <PrimaryButton
    disabled={converting !== null || converting === cand.id}
    onClick={() => convertMut.mutate(cand)}
  >
    {converting === cand.id ? <Loader2 className="animate-spin" /> : <CheckCircle />}
    Converter em Proposta
  </PrimaryButton>
  ```

---

## 3. Fase 3: Otimizações de Custos e Performance

### Ação 3.1: Consolidação de Chamadas de Simulação por Persona

- **Causa Raiz**: Executa 15 chamadas HTTP separadas para simular 5 personas em 3 alternativas de pacotes.
- **Correção**: Refatorar `src/services/quotes-simulation.ts` para enviar todas as 3 alternativas consolidadas em uma única chamada de IA ao orquestrador e receber um JSON estruturado contendo a matriz de notas inteira. Redução imediata de chamadas de IA em 93% (de 15 chamadas consecutivas para apenas 1).
