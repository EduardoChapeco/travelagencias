# 06_UI_CONTRACT_DATABASE_TRACEABILITY.md
# Rastreabilidade de Contratos de UI e DB

## 1. Mapeamento
Páginas consomem queries e mutations tipadas geradas pelo Supabase. O isolamento multi-tenant é garantido via RLS e verificação de `agency_id`.
