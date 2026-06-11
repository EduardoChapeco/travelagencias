-- Migration para adicionar a coluna passengers_count em boarding_cards
-- Essa coluna é requisitada pelo frontend em agency.$slug.boarding.tsx
ALTER TABLE public.boarding_cards 
ADD COLUMN IF NOT EXISTS passengers_count INTEGER;

-- Comentário para a documentação da tabela
COMMENT ON COLUMN public.boarding_cards.passengers_count IS 'Número opcional de passageiros manual caso não haja lista detalhada';
