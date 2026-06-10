-- Fase H.2: Catálogo Curado de Vistos (Visa Requirements)

-- Limpar a tabela antes de popular
DELETE FROM public.visa_requirements WHERE agency_id IS NULL;

-- Inserir catálogo padrão oficial de Vistos para Brasileiros
INSERT INTO public.visa_requirements (agency_id, destination_country, origin_nationality, visa_required, visa_type, processing_days, price_estimate, required_documents, notes, official_url) VALUES 
(NULL, 'Estados Unidos', 'Brasil', true, 'B1/B2 (Turismo/Negócios)', 30, 185.00, 
 ARRAY['Passaporte válido por 6 meses', 'Formulário DS-160', 'Foto 5x5 recente', 'Comprovante de pagamento da MRV', 'Agendamento CASV e Consulado', 'Comprovante de Vínculo (Imposto de Renda, Extratos, Holerites)'],
 'Atenção: Filas para agendamento podem variar entre 30 a 200 dias dependendo da cidade.', 'https://br.usembassy.gov/pt/visas-pt/'),

(NULL, 'Canadá', 'Brasil', true, 'eTA (Eletrônico) / Visitante', 5, 7.00, 
 ARRAY['Passaporte válido', 'Visto americano válido OU visto canadense emitido nos últimos 10 anos', 'Formulário Online IMM'],
 'O eTA é aplicável apenas para viajantes chegando de avião que já tenham visto americano ou tiveram visto canadense nos últimos 10 anos. Senão, é necessário visto físico.', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html'),

(NULL, 'Austrália', 'Brasil', true, 'eVisitor (Subclass 651)', 15, 190.00,
 ARRAY['Passaporte válido', 'Extratos bancários (últimos 3 meses)', 'Vínculo empregatício', 'Seguro viagem com cobertura mínima'],
 'Aplicado 100% de forma digital pelo ImmiAccount.', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651'),

(NULL, 'Japão', 'Brasil', false, 'Turismo (Isenção)', 0, 0,
 ARRAY['Passaporte válido', 'Passagem de ida e volta', 'Comprovante de hospedagem'],
 'A partir de Setembro/2023, brasileiros não precisam mais de visto para viagens de até 90 dias a turismo.', 'https://www.sp.br.emb-japan.go.jp/itpr_pt/visto_isencao_brasileiros.html'),

(NULL, 'Reino Unido', 'Brasil', false, 'Turismo (ETA em Breve)', 0, 0,
 ARRAY['Passaporte válido por 6 meses', 'Comprovante de fundos', 'Hospedagem', 'Passagem de volta'],
 'O Reino Unido está implementando o ETA (Autorização Eletrônica) que será exigido em breve. Fique atento às datas oficiais.', 'https://www.gov.uk/check-uk-visa'),

(NULL, 'Egito', 'Brasil', true, 'e-Visa / On Arrival', 7, 25.00,
 ARRAY['Passaporte com validade de 6 meses', 'Certificado Internacional de Vacinação (Febre Amarela)'],
 'Pode ser tirado no aeroporto de chegada (On Arrival), mas é recomendado o e-Visa para evitar filas.', 'https://www.visa2egypt.gov.eg/');
