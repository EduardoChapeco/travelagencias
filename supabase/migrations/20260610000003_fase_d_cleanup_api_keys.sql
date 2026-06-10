-- Fase D: Limpeza de lixo residual da api_keys
-- Removemos com segurança as chaves velhas pois a nova UI agora usa as tabelas nativas.

DELETE FROM public.api_keys 
WHERE provider IN ('__platform_plans__', '__platform_policies__', '__platform_brand__');
