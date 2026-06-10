-- Migration: Fase B - Fonte da Verdade (Migração de Dados)
-- Objetivo: Migrar os dados estruturados de plans, policies e brand 
-- que estão serializados em JSON dentro da tabela api_keys para as tabelas relacionais corretas.

DO $$
DECLARE
  rec record;
  plan_array jsonb;
  plan_elem jsonb;
  policies_array jsonb;
  policy_elem jsonb;
  brand_obj jsonb;
BEGIN

  -----------------------------------------------------------------------------
  -- 1. PREPARAÇÃO DO SCHEMA
  -----------------------------------------------------------------------------
  
  -- PLANS
  -- Adiciona as colunas extras que o front-end está usando, mas não existiam na tabela
  ALTER TABLE IF EXISTS public.plans ADD COLUMN IF NOT EXISTS max_trips_per_month int DEFAULT -1;
  ALTER TABLE IF EXISTS public.plans ADD COLUMN IF NOT EXISTS max_storage_gb int DEFAULT 5;
  ALTER TABLE IF EXISTS public.plans ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
  ALTER TABLE IF EXISTS public.plans ADD COLUMN IF NOT EXISTS badge text;
  
  -- O front-end usa 'features' como um array de objetos JSON {label, included}. O schema original era text[].
  -- Para manter total compatibilidade com o front, recriamos a coluna como jsonb.
  ALTER TABLE IF EXISTS public.plans DROP COLUMN IF EXISTS features;
  ALTER TABLE IF EXISTS public.plans ADD COLUMN features jsonb NOT NULL DEFAULT '[]'::jsonb;

  -----------------------------------------------------------------------------
  -- 2. MIGRAÇÃO DE PLANOS (__platform_plans__)
  -----------------------------------------------------------------------------
  SELECT * INTO rec FROM public.api_keys WHERE provider = '__platform_plans__' LIMIT 1;
  IF FOUND AND rec.key_value IS NOT NULL AND btrim(rec.key_value) <> '' AND rec.key_value <> 'null' THEN
    BEGIN
      plan_array := rec.key_value::jsonb;
      IF jsonb_typeof(plan_array) = 'array' THEN
        FOR plan_elem IN SELECT * FROM jsonb_array_elements(plan_array) LOOP
          INSERT INTO public.plans (
            id, name, slug, description, price_monthly, price_annual,
            max_agents, max_trips_per_month, max_storage_gb, features, 
            is_active, is_featured, badge
          )
          VALUES (
            COALESCE((plan_elem->>'id')::uuid, gen_random_uuid()),
            COALESCE(plan_elem->>'name', 'Plano Desconhecido'),
            COALESCE(plan_elem->>'name', 'Plano Desconhecido') || '-' || substr(md5(random()::text), 1, 4), -- slug provisório único
            plan_elem->>'description',
            COALESCE((plan_elem->>'price_monthly')::numeric, 0),
            COALESCE((plan_elem->>'price_yearly')::numeric, 0), -- O json usa price_yearly
            COALESCE((plan_elem->>'max_agents')::int, 3),
            COALESCE((plan_elem->>'max_trips_per_month')::int, -1),
            COALESCE((plan_elem->>'max_storage_gb')::int, 5),
            COALESCE(plan_elem->'features', '[]'::jsonb),
            COALESCE((plan_elem->>'is_active')::boolean, true),
            COALESCE((plan_elem->>'is_featured')::boolean, false),
            plan_elem->>'badge'
          )
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Falha ao migrar planos: %', SQLERRM;
    END;
  END IF;

  -----------------------------------------------------------------------------
  -- 3. MIGRAÇÃO DE POLÍTICAS (__platform_policies__)
  -----------------------------------------------------------------------------
  SELECT * INTO rec FROM public.api_keys WHERE provider = '__platform_policies__' LIMIT 1;
  IF FOUND AND rec.key_value IS NOT NULL AND btrim(rec.key_value) <> '' AND rec.key_value <> 'null' THEN
    BEGIN
      policies_array := rec.key_value::jsonb;
      IF jsonb_typeof(policies_array) = 'array' THEN
        FOR policy_elem IN SELECT * FROM jsonb_array_elements(policies_array) LOOP
          -- 'kind' é a pk, no JSON é salvo como 'id' (privacy, terms, dpa)
          INSERT INTO public.policy_documents (
            kind, version, content_md, effective_at, created_at
          )
          VALUES (
            COALESCE(policy_elem->>'id', 'terms'),
            COALESCE(policy_elem->>'version', '1.0.0'),
            COALESCE(policy_elem->>'content', ''),
            COALESCE((policy_elem->>'published_at')::timestamptz, now()),
            COALESCE((policy_elem->>'updated_at')::timestamptz, now())
          )
          ON CONFLICT (kind, version) DO NOTHING;
        END LOOP;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Falha ao migrar políticas: %', SQLERRM;
    END;
  END IF;

  -----------------------------------------------------------------------------
  -- 4. MIGRAÇÃO DE MARCA/CONFIGS (__platform_brand__)
  -----------------------------------------------------------------------------
  SELECT * INTO rec FROM public.api_keys WHERE provider = '__platform_brand__' LIMIT 1;
  IF FOUND AND rec.key_value IS NOT NULL AND btrim(rec.key_value) <> '' AND rec.key_value <> 'null' THEN
    BEGIN
      brand_obj := rec.key_value::jsonb;
      IF jsonb_typeof(brand_obj) = 'object' THEN
        INSERT INTO public.global_settings (key, value, updated_at)
        VALUES ('branding_config', brand_obj, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Falha ao migrar brand config: %', SQLERRM;
    END;
  END IF;

END $$;
