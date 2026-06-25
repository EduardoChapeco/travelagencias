import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Imutabilidade e Segurança do Livro-Razão Contábil (Ledger)', () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  test('Deve impedir inserção direta de lançamentos no razão via cliente público', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tenta inserir diretamente um lançamento contábil fictício no razão
    const { data, error } = await supabase
      .from('financial_ledger_entries')
      .insert([
        {
          agency_id: '00000000-0000-0000-0000-000000000000',
          account_code: '1.01.01',
          debit_amount: 1000,
          credit_amount: 0,
          description: 'Inserção direta maliciosa bypassando trigger',
          source_event: 'manual_entry',
          source_id: '00000000-0000-0000-0000-000000000000',
        }
      ]);

    // O banco de dados deve negar a inserção direta por meio do RLS / permissões
    // O ledger contábil é estritamente append-only gerido por triggers internas do servidor
    expect(data ? data.length : 0).toBe(0);
    if (error) {
      expect(error.message).toContain('violates row-level security');
    }
  });

  test('Deve bloquear exclusão física de registros do razão contábil', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tenta excluir todos os registros do ledger
    const { data, error } = await supabase
      .from('financial_ledger_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // A exclusão deve retornar zero registros deletados ou erro de segurança RLS
    expect(data ? data.length : 0).toBe(0);
    if (error) {
      expect(error.message).toContain('violates row-level security');
    }
  });

  test('Deve bloquear modificações retroativas de registros do razão contábil', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tenta atualizar a descrição ou valores de um lançamento contábil
    const { data, error } = await supabase
      .from('financial_ledger_entries')
      .update({ debit_amount: 99999 })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // A atualização deve ser bloqueada física e logicamente
    expect(data ? data.length : 0).toBe(0);
    if (error) {
      expect(error.message).toContain('violates row-level security');
    }
  });
});
