# 01 RECONSTRUÇÃO DE REQUISITOS

Baseado nas rotas encontradas (admin.agencies.$id, admin.agencies, admin.agents, admin.api-keys, admin.audit...), o sistema promete um ERP completo de turismo.

## REQUISITO: Gestão de Leads e CRM
- **COMPORTAMENTO ESPERADO:** O Lead deve transitar por estágios, gerar cotações e propostas atômicas.
- **O QUE REALMENTE EXISTE:** Tabela `leads`, `lead_stages`, rotas `agency.$slug.crm.tsx`.
- **EVIDÊNCIA CONTRÁRIA:** O reload do Board de CRM mantém o estado? Sim, via query no Supabase.

## REQUISITO: Inbox e Inteligência Artificial
- **COMPORTAMENTO ESPERADO:** Roteamento autônomo de emails via Gmail Watch.
- **O QUE REALMENTE EXISTE:** Edge Functions `gmail-sync`, `rag-document-processor` presentes e conectadas à `emails` e `knowledge_chunks`.
- **EVIDÊNCIA:** Supabase Function logs provarão a execução do webhook.
