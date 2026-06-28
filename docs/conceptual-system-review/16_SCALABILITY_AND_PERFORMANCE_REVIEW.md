# 16 PERFORMANCE E ESCALABILIDADE

- JSONB pesado nas tabelas `portal_pages` (blocos de landing pages) fará o payload da query inflar rapidamente se não for feito carregamento sob demanda.
