import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Isolamento Multi-Tenant e Segurança RLS', () => {
  test('Deve redirecionar usuário não autenticado ao tentar acessar rotas da agência', async ({ page }) => {
    // Tenta acessar a rota administrativa de uma agência sem estar logado
    await page.goto('/agency/excelencia-turismo/crm');
    
    // Deve ser redirecionado para a página de login ou exibir tela de login
    await page.waitForURL(url => url.pathname.includes('/login') || url.pathname === '/');
    const loginForm = page.locator('input[type="email"]');
    await expect(loginForm).toBeVisible();
  });

  test('Deve bloquear acesso direto à API do Supabase de outro tenant via RLS', async () => {
    // Inicializa o cliente do Supabase com chaves públicas genéricas de teste
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tenta selecionar dados de uma agência sem estar autenticado
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('agency_id', '00000000-0000-0000-0000-000000000000'); // UUID fictício

    // O RLS do Supabase deve retornar uma lista vazia ou erro de privilégio
    if (error) {
      expect(error.status).toBe(401);
    } else {
      expect(data.length).toBe(0);
    }
  });

  test('Deve impedir vazamento de dados de comprovantes de pagamento entre agências', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tenta listar transações de caixa de agências
    const { data } = await supabase
      .from('cash_transactions')
      .select('*');

    // Como anon/unauthenticated, o RLS não deve retornar nenhum registro
    expect(data ? data.length : 0).toBe(0);
  });
});
