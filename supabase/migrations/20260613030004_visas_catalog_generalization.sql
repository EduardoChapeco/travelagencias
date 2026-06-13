-- Migration: 20260613030004_visas_catalog_generalization.sql
-- FASE 8: Generalização do Catálogo de Requisitos Gerais

-- 1. Adicionar colunas category e rule_title à tabela visa_requirements
ALTER TABLE public.visa_requirements 
  ADD COLUMN IF NOT EXISTS category text not null default 'visa' CHECK (category in ('visa', 'fee', 'health', 'insurance', 'other')),
  ADD COLUMN IF NOT EXISTS rule_title text;

-- 2. Atualizar títulos de regras padrão para os vistos já existentes
UPDATE public.visa_requirements
SET rule_title = 'Visto de Turismo/Negócios (B1/B2)'
WHERE destination_country = 'Estados Unidos' AND category = 'visa';

UPDATE public.visa_requirements
SET rule_title = 'eTA (Autorização Eletrônica) / Visto de Visitante'
WHERE destination_country = 'Canadá' AND category = 'visa';

UPDATE public.visa_requirements
SET rule_title = 'eVisitor (Subclass 651)'
WHERE destination_country = 'Austrália' AND category = 'visa';

UPDATE public.visa_requirements
SET rule_title = 'Isenção de Visto para Turismo'
WHERE destination_country = 'Japão' AND category = 'visa';

UPDATE public.visa_requirements
SET rule_title = 'ETA Requisito Consular'
WHERE destination_country = 'Reino Unido' AND category = 'visa';

UPDATE public.visa_requirements
SET rule_title = 'e-Visa / On Arrival + Febre Amarela'
WHERE destination_country = 'Egito' AND category = 'visa';

-- 3. Inserir requisitos padrão adicionais para taxas (fee), saúde (health) e seguros (insurance)
INSERT INTO public.visa_requirements (agency_id, destination_country, origin_nationality, visa_required, visa_type, processing_days, price_estimate, required_documents, notes, official_url, category, rule_title) VALUES
-- Taxa de Turismo
(NULL, 'México', 'Brasil', true, 'Visitax (Cancun/Quintana Roo)', 1, 15.00, 
 ARRAY['Passaporte válido', 'Pagamento online via site oficial ou no aeroporto'], 
 'Taxa obrigatória para todos os visitantes estrangeiros que entram no estado de Quintana Roo (Cancun, Riviera Maya, Cozumel).', 'https://www.visitax.gob.mx/sitio/', 'fee', 'Visitax Quintana Roo (Cancun)'),

-- Saúde / Vacinas
(NULL, 'África do Sul', 'Brasil', true, 'Febre Amarela (CIVP)', 10, 0.00, 
 ARRAY['Certificado Internacional de Vacinação ou Provisório (CIVP)', 'Vacina aplicada há pelo menos 10 dias do embarque'], 
 'Exigência estrita de comprovação de vacina de febre amarela devido ao trânsito por áreas de risco ou origem brasileira.', 'https://www.gov.br/pt-br/servicos/obter-o-certificado-internacional-de-vacinacao-ou-profilaxia', 'health', 'Certificado de Febre Amarela Obrigatório'),

-- Seguro / Tratado de Schengen
(NULL, 'França', 'Brasil', true, 'Seguro Viagem Schengen', 1, 50.00, 
 ARRAY['Apólice de Seguro Viagem com cobertura mínima de 30.000 Euros para assistência médica e repatriação'], 
 'Exigido pelo Tratado de Schengen para entrada em qualquer país da área Schengen na Europa.', 'https://www.consulfrance.org/', 'insurance', 'Seguro Viagem Schengen (Mínimo €30k)');
