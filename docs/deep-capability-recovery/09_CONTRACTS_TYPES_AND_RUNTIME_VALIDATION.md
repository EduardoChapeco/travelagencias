# 09. Contracts, Types and Runtime Validation (Auditoria de Tipos)

Este relatório descreve o mapeamento de tipagem TypeScript, schemas Zod e o saneamento de casts de dados no TravelOS.

---

## 1. Mapeamento de Tipos e DTOs de Domínio

Para garantir alinhamento robusto em tempo de compilação e execução:
* **Tabelas de Mensagens:** Mapeamos de forma estrita o tipo `Conversation` e `Message` para os dados em runtime no `/inbox`.
* **Uso de Casts (`as any`):** 
  * Identificamos ocorrências de `as any` no carregamento de tabelas novas do inbox e CRM (tabelas como `conversations`, `crm_leads` e `crm_pipeline_stages`) devido à ausência desses tipos státicos no arquivo `src/integrations/supabase/types.ts`.
  * **Resolução Temporária Homologada:** O uso do client `db` (declarado como `supabase as any`) foi saneado nas consultas críticas. A compilação é garantida e o typecheck retorna 0.
  * **Meta Final de Médio Prazo:** Configurar o token de acesso pessoal (PAT) no Supabase CLI local para atualizar o `types.ts` de forma automática, eliminando a necessidade de bypasses sintéticos de tipo no frontend.

---

## 2. Validação e Schemas Zod em Runtime

* **Segurança na Entrada de Dados:** Formulários críticos (criação de propostas, cotações, dados do cliente e transações financeiras) utilizam schemas Zod para validar a integridade dos payloads antes de disparar requisições ou mutações no Supabase.
* **Server Functions:** A Server Function `generateOmnichannelReply` em `ai-chat.functions.ts` possui validador Zod robusto que garante a UUID correta da agência e sessão de conversas:
  ```typescript
  .validator(
    z.object({
      agencyId: z.string().uuid(),
      sessionId: z.string().uuid(),
    }),
  )
  ```
