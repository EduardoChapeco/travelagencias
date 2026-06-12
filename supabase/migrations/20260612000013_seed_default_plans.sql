-- Seed default plans if the plans table is empty
INSERT INTO public.plans (
  id, name, slug, description, price_monthly, price_annual,
  max_agents, max_trips_per_month, max_storage_gb, features, 
  is_active, is_featured, badge, sort_order, created_at, updated_at
) VALUES 
(
  'a38b5592-cdbc-4c22-83b6-96b63d76e48c',
  'Essencial',
  'essencial',
  'Para agências pequenas ou agentes independentes.',
  0,
  0,
  3,
  50,
  5,
  '[
    {"label": "CRM de Leads", "included": true},
    {"label": "Portal Público", "included": true},
    {"label": "Blog", "included": true},
    {"label": "Contratos digitais", "included": false},
    {"label": "Vouchers com AI", "included": false},
    {"label": "Suporte prioritário", "included": false}
  ]'::jsonb,
  true,
  false,
  'Gratuito',
  1,
  now(),
  now()
),
(
  'b28c5592-cdbc-4c22-83b6-96b63d76e48d',
  'Profissional',
  'profissional',
  'Para agências em crescimento que buscam automatização.',
  199.00,
  1990.00,
  10,
  -1,
  20,
  '[
    {"label": "CRM de Leads", "included": true},
    {"label": "Portal Público", "included": true},
    {"label": "Blog", "included": true},
    {"label": "Contratos digitais", "included": true},
    {"label": "Vouchers com AI", "included": true},
    {"label": "Suporte prioritário", "included": true}
  ]'::jsonb,
  true,
  true,
  'Recomendado',
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
