# 20 PLANO MESTRE DE FINALIZAÇÃO

## P0 (Riscos Críticos de Arquitetura)
1. **Queueing para IA (RAG):** Migrar `rag-document-processor` de chamada síncrona para uma Inngest/Supabase Queue, prevenindo perda de documentos grandes.

## P1 (Fluxos Quebrados ou Incompletos)
1. **Geração Server-side de Vouchers:** Mover a engine do `html2pdf` do navegador para uma Edge Function (Puppeteer/Playwright) garantindo recibos em background.
2. **Gateway Financeiro:** Trocar botões "Pagar" genéricos por Checkout real (Stripe/Iugu).

## P2 (Dívida Técnica)
1. **Validação Estrita de JSONB:** Converter dados soltos do `financial_data` em colunas reais ou aplicar `jsonb_schema_validation` no Postgres.

## P3 (UX e Refinamentos)
1. Refinar loaders infinitos nas listagens pesadas.

> [!IMPORTANT]
> A auditoria determinou que a fundação atual (Supabase + Tanstack) é extremamente sólida em segurança RLS. O foco 100% deve ser blindar fluxos assíncronos e pagamentos reais.