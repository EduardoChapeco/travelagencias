# 14 RESILIÊNCIA E FALHAS

- O sistema falha de forma não graciosa se o Supabase cair (apresenta erro de fetch na tela sem fallback offline).
- O Motor IA RAG (`rag-document-processor`) não possui retry automático (fila). Se o timeout da Edge Function ocorrer no meio do chunking, os vetores ficarão parciais.
