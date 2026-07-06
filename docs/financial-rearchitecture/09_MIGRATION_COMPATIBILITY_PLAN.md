# Plano de Compatibilidade e Migração (Turis)

Este plano descreve as diretrizes técnicas para implantação de mudanças no banco de dados e migração de dados históricos do Turis sem indisponibilidade (zero downtime) ou quebras de retrocompatibilidade com o frontend atual.

---

## 1. Princípio da Não-Disruptividade (Zero-Downtime)

Qualquer refatoração de banco de dados deve seguir a estratégia **Expand and Contract**:

1. **Expand (Expandir)**: Adicionar as novas tabelas (`financial_ledger_entries`, `seller_adjustments`, `monthly_closing_periods`) e novas colunas sem renomear ou remover os campos legados de `financial_records` ou `payment_installments` usados atualmente pelo frontend.
2. **Sync (Sincronizar)**: Criar triggers no banco de dados que sincronizem lançamentos criados ou alterados nas tabelas antigas diretamente para o novo livro-razão (ledger) em tempo real.
3. **Migrate (Migrar)**: Executar um script de backfill de dados históricos de forma parcelada (batching) para evitar sobrecarga de CPU no banco de dados.
4. **Contract (Contrair)**: Após o deploy estável do novo frontend consumindo a arquitetura alvo, desativar as colunas e tabelas legadas (apenas em fases futuras, após aprovação do gestor).

---

## 2. Roteiro de Migração de Dados Históricos

Criaremos um script de migração transacional (`backfill`) para converter lançamentos existentes em `financial_records` para a tabela contábil de ledger:

```sql
DO $$
DECLARE
  v_rec record;
BEGIN
  -- Iterar sobre registros financeiros confirmados não cancelados
  FOR v_rec IN
    SELECT * FROM public.financial_records
    WHERE status = 'confirmed' AND deleted_at IS NULL
  LOOP
    -- Verificar se já existe lançamento para evitar duplicações
    IF NOT EXISTS (
      SELECT 1 FROM public.financial_ledger_entries
      WHERE source_event = 'financial_records.backfill' AND source_id = v_rec.id
    ) THEN
      -- Inserir débito ou crédito dependendo do tipo de transação
      INSERT INTO public.financial_ledger_entries (
        agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id
      ) VALUES (
        v_rec.agency_id,
        CASE WHEN v_rec.type = 'income' THEN '1.1.1.01' ELSE '2.1.1.01' END,
        CASE WHEN v_rec.type = 'income' THEN v_rec.amount ELSE 0.00 END,
        CASE WHEN v_rec.type = 'expense' THEN v_rec.amount ELSE 0.00 END,
        COALESCE(v_rec.paid_at, v_rec.created_at),
        COALESCE(v_rec.description, 'Importação Histórica'),
        'financial_records.backfill',
        v_rec.id
      );
    END IF;
  END LOOP;
END $$;
```

---

## 3. Estratégia de Rollback

Se a nova lógica do ledger contábil introduzir comportamentos indesejados no fechamento mensal ou nas transações diárias:

1. **Passo 1**: Dropar os gatilhos de sincronização automática entre as tabelas operacionais e o ledger.
2. **Passo 2**: Reverter a exibição do frontend para consumir diretamente de `financial_records` (as colunas legadas permanecerão intactas e atualizadas devido à estratégia de expansão).
3. **Passo 3**: Truncar de forma segura as tabelas auxiliares criadas nesta fase se o backup inicial de integridade estiver intacto.
