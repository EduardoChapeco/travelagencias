# Auditoria de Contratos de Dados: TypeScript, Zod e Banco de Dados

Este documento analisa o alinhamento de tipos entre as definições de código TypeScript (`src/types/quotes.ts`), os schemas gerados pelo Supabase (`src/integrations/supabase/types.ts`) e o banco de dados remoto.

---

## 1. Matriz de Auditoria de Entidades e Tipos

| Entidade | TypeScript Contract | Supabase Generated Type | Banco de Dados Remoto | Divergência Identificada | Correção Necessária |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`quote_requests`** | `TravelIntent` (representação estruturada de `normalized_intent`) | Presente | Presente | Nenhuma divergência estrutural. O JSONB é mapeado como `Json` no Supabase e tipado no service. | OK |
| **`quote_travelers`** | `TravelerParty` | Presente | Presente | No banco, o campo é relacional por linhas; no tipo TS, é um objeto aninhado. O service faz a conversão correta. | OK |
| **`quote_preferences`** | Mapeamento dinâmico chave-valor | Presente | Presente | Nenhuma divergência. | OK |
| **`normalized_offers`** | `NormalizedOffer` (dentro de `normalized_data`) | Presente | Presente | O client faz parse de `normalized_data` como `any` para converter em `NormalizedOffer`. | Alinhar interface no service. |
| **`package_scorecards`** | `PackageScorecard` | Presente | Presente | Nenhuma divergência. | OK |
| **`simulation_runs`** | `SimulationRunDetails` | Presente | Presente | Nenhuma divergência. | OK |
| **`knowledge_sources`** | **Inexistente** | **Ausente** (não gerado) | **Ausente** (tabela inexistente) | A tabela não existe no banco, logo o tipo gerado não existe no arquivo Supabase. O código usa `.from("knowledge_sources" as any)` para compilar. | Executar migration RAG e regenerar tipos. |
| **`knowledge_documents`**| **Inexistente** | **Ausente** | **Ausente** | Bypass de tipo com `as any` no service. | Executar migration RAG e regenerar tipos. |
| **`knowledge_chunks`**   | **Inexistente** | **Ausente** | **Ausente** | Bypass de tipo com `as any` no service. | Executar migration RAG e regenerar tipos. |
| **`knowledge_embeddings`**| **Inexistente** | **Ausente** | **Ausente** | Bypass de tipo com `as any` no service. | Executar migration RAG e regenerar tipos. |

---

## 2. Diagnóstico de Uso de Tipos Evasivos ("Bypasses")

Para manter o build de TypeScript passando sem erros, foram identificadas coerções e tipagens fracas em arquivos estratégicos:

### 2.1. Arquivo `src/services/quotes-rag.ts`
* **Código (linha 29)**: `.from("api_keys" as any)`
* **Código (linha 110)**: `.from("knowledge_sources" as any)`
* **Código (linha 125)**: `.from("knowledge_documents" as any)`
* **Código (linha 151)**: `.from("knowledge_chunks" as any)`
* **Código (linha 173)**: `.from("knowledge_embeddings" as any)`

### 2.2. Arquivo `src/routes/agency.$slug.quotes.index.tsx`
* **Código (linha 139)**: `.from("knowledge_documents" as any)`
* **Código (linha 379)**: `.from("knowledge_documents" as any)`

### Impacto
O uso sistemático de `as any` esconde erros de digitação de nomes de campos e impede que o compilador detecte desalinhamentos em tempo de compilação. Se uma coluna for alterada ou removida nas tabelas RAG, a UI e os services continuarão compilando, quebrando apenas em tempo de execução no cliente.
