-- Migration: P3 Rate Limit / Anti-spam for Knowledge Article Votes
-- 1. Criar tabela de controle de votos por IP
-- 2. Recriar a função vote_knowledge_article para verificar duplicidade

CREATE TABLE IF NOT EXISTS public.knowledge_article_votes (
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (article_id, ip_address)
);

-- Habilitar RLS por segurança na tabela de votos
ALTER TABLE public.knowledge_article_votes ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Ninguém pode ler/escrever diretamente na tabela de votos, apenas via RPC (que roda como SECURITY DEFINER)
-- Deixa a tabela inacessível via API REST direta

CREATE OR REPLACE FUNCTION public.vote_knowledge_article(p_article_id uuid, p_is_upvote boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers text;
  v_ip text;
BEGIN
  -- Tenta ler cabeçalhos HTTP da requisição do Supabase
  v_headers := current_setting('request.headers', true);
  IF v_headers IS NOT NULL AND v_headers <> '' THEN
    v_ip := split_part(v_headers::json->>'x-forwarded-for', ',', 1);
  END IF;
  
  -- Fallback caso não seja possível obter o IP (ex: chamado via console sql)
  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := '127.0.0.1';
  END IF;

  -- Remove espaços em branco
  v_ip := trim(v_ip);

  -- Verifica se o IP já votou neste artigo
  IF EXISTS (
    SELECT 1 FROM public.knowledge_article_votes 
    WHERE article_id = p_article_id AND ip_address = v_ip
  ) THEN
    RAISE EXCEPTION 'Você já votou neste artigo.';
  END IF;

  -- Registra o voto
  INSERT INTO public.knowledge_article_votes (article_id, ip_address)
  VALUES (p_article_id, v_ip);

  -- Atualiza o contador na tabela principal
  IF p_is_upvote THEN
    UPDATE public.knowledge_articles SET votes_up = votes_up + 1 WHERE id = p_article_id;
  ELSE
    UPDATE public.knowledge_articles SET votes_down = votes_down + 1 WHERE id = p_article_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_knowledge_article(uuid, boolean) TO public;
