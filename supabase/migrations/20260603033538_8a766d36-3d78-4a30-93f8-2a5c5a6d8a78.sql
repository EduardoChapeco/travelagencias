
-- 1. trip_passengers magic link & extra fields
ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS magic_link_token text UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  ADD COLUMN IF NOT EXISTS magic_link_filled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS passport_expiry date,
  ADD COLUMN IF NOT EXISTS meal_preference text,
  ADD COLUMN IF NOT EXISTS disabilities text,
  ADD COLUMN IF NOT EXISTS document_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vaccination_certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_complete boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS trip_passengers_magic_link_idx ON public.trip_passengers(magic_link_token);

-- Public read by magic token (anon can fetch the row to fill the form)
DROP POLICY IF EXISTS "passengers public by token" ON public.trip_passengers;
CREATE POLICY "passengers public by token" ON public.trip_passengers
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "passengers public update by token" ON public.trip_passengers;
CREATE POLICY "passengers public update by token" ON public.trip_passengers
  FOR UPDATE TO anon USING (magic_link_filled_at IS NULL);

GRANT SELECT, UPDATE ON public.trip_passengers TO anon;

-- 2. proposals structured CMS data
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pax_seniors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hotels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transfers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tours jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excludes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pix_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installments_card integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installments_boleto integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'editorial';

-- 3. contract_clauses_template
CREATE TABLE IF NOT EXISTS public.contract_clauses_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  section text NOT NULL,
  clause_text text NOT NULL,
  is_immutable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contract_clauses_template TO anon, authenticated;
GRANT ALL ON public.contract_clauses_template TO service_role;

ALTER TABLE public.contract_clauses_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clauses readable by all" ON public.contract_clauses_template
  FOR SELECT TO anon, authenticated USING (true);

-- Seed 49 cláusulas (Turis Tecnologia) — texto resumido pétreo
INSERT INTO public.contract_clauses_template (number, section, clause_text) VALUES
(1,'Objeto','O presente contrato tem por objeto a intermediação pela AGÊNCIA da prestação de serviços turísticos descritos no pacote contratado pelo CLIENTE.'),
(2,'Objeto','A AGÊNCIA atua como intermediária entre o CLIENTE e os fornecedores de serviços (companhias aéreas, hotéis, operadoras, seguradoras, locadoras e demais prestadores).'),
(3,'Preço e Pagamento','O valor total do pacote é o constante no resumo financeiro, podendo ser pago à vista (Pix) com desconto ou parcelado em cartão/boleto conforme condições aceitas.'),
(4,'Preço e Pagamento','O não pagamento de qualquer parcela na data de vencimento acarretará multa de 2%, juros de mora de 1% ao mês e correção monetária pelo IPCA.'),
(5,'Preço e Pagamento','A inadimplência superior a 5 dias dá à AGÊNCIA o direito de cancelar a viagem, retendo os valores já pagos a título de despesas operacionais.'),
(6,'Preço e Pagamento','Reajustes de tarifas aéreas, taxas de embarque, combustível e câmbio até a data da emissão dos bilhetes são de responsabilidade do CLIENTE.'),
(7,'Documentação','É de exclusiva responsabilidade do CLIENTE providenciar e portar documentos válidos (RG, passaporte, vistos, certificados de vacinação) exigidos pelo destino.'),
(8,'Documentação','A AGÊNCIA não se responsabiliza por embarques negados por documentação irregular, vencida ou ausente.'),
(9,'Documentação','Menores de idade desacompanhados ou acompanhados de um dos pais devem portar autorização judicial conforme legislação vigente.'),
(10,'Bagagem','A bagagem é de inteira responsabilidade do CLIENTE e das companhias transportadoras; a AGÊNCIA não responde por extravio, dano ou atraso.'),
(11,'Bagagem','Regras de franquia e bagagem extra seguem políticas da companhia aérea contratada, descritas no bilhete emitido.'),
(12,'Voos e Transportes','Horários, rotas e equipamentos são de responsabilidade exclusiva das companhias aéreas e podem sofrer alterações sem aviso prévio.'),
(13,'Voos e Transportes','Em caso de cancelamento ou atraso de voo, aplica-se a Resolução ANAC 400/2016; a AGÊNCIA prestará apoio mas não responde solidariamente.'),
(14,'Voos e Transportes','O CLIENTE deve apresentar-se no aeroporto com antecedência mínima de 3h (internacional) ou 2h (doméstico).'),
(15,'Hospedagem','Categoria, regime e tipo de acomodação são os descritos no pacote; mudanças por superlotação ou força maior podem ocorrer, mantendo-se padrão equivalente.'),
(16,'Hospedagem','Horários de check-in e check-out seguem política de cada hotel, geralmente 15h e 12h respectivamente.'),
(17,'Hospedagem','Consumos extras (frigobar, lavanderia, telefonia, room service) são pagos diretamente pelo CLIENTE ao hotel.'),
(18,'Passeios e Excursões','Passeios opcionais não inclusos no pacote são contratados separadamente e ficam sujeitos a disponibilidade e condições climáticas.'),
(19,'Passeios e Excursões','A AGÊNCIA pode substituir passeios por outros equivalentes em caso de impossibilidade de realização do original.'),
(20,'Cancelamento pelo Cliente','O cancelamento pelo CLIENTE deve ser formalizado por escrito e sujeita-se às multas dos fornecedores, conforme Decreto-Lei 2.181/97 e CDC.'),
(21,'Cancelamento pelo Cliente','Multas mínimas de cancelamento: 30+ dias = 10%, 15-29 dias = 25%, 7-14 dias = 50%, menos de 7 dias = 100%, sobre o valor do pacote.'),
(22,'Cancelamento pelo Cliente','Bilhetes aéreos emitidos seguem regras tarifárias da companhia, podendo ser não-reembolsáveis.'),
(23,'Cancelamento pela Agência','A AGÊNCIA pode cancelar a viagem por força maior, caso fortuito ou inviabilidade operacional, restituindo valores pagos sem indenização adicional.'),
(24,'Alterações','Pedidos de alteração de datas, nomes ou roteiros estão sujeitos a aceitação dos fornecedores e cobrança de taxas administrativas.'),
(25,'Alterações','Correção de nome em bilhetes aéreos após emissão pode implicar reemissão integral às custas do CLIENTE.'),
(26,'Seguro Viagem','É altamente recomendada a contratação de seguro viagem; sua ausência exime a AGÊNCIA de qualquer responsabilidade por sinistros.'),
(27,'Seguro Viagem','Para destinos do Tratado de Schengen, o seguro viagem é obrigatório com cobertura mínima de 30.000 euros.'),
(28,'Saúde','Recomenda-se consulta médica prévia e verificação de exigências sanitárias (vacinas, atestados) específicas do destino.'),
(29,'Saúde','Doenças preexistentes devem ser informadas no momento da contratação do seguro; omissão pode invalidar coberturas.'),
(30,'Reclamações','Reclamações durante a viagem devem ser feitas imediatamente ao fornecedor e à AGÊNCIA via canais oficiais para permitir solução em tempo hábil.'),
(31,'Reclamações','Reclamações posteriores devem ser formalizadas em até 30 dias do retorno, sob pena de decadência do direito.'),
(32,'Foro','Fica eleito o foro da Comarca da sede da AGÊNCIA para dirimir quaisquer questões oriundas deste contrato, com renúncia a qualquer outro.'),
(33,'Foro','As partes preferencialmente buscarão solução amigável ou mediação antes de qualquer ação judicial.'),
(34,'LGPD','Os dados pessoais do CLIENTE serão tratados conforme a Lei 13.709/2018 (LGPD), exclusivamente para fins de execução contratual e obrigações legais.'),
(35,'LGPD','O CLIENTE consente com o compartilhamento de seus dados com fornecedores, autoridades migratórias e seguradoras necessárias à viagem.'),
(36,'LGPD','O CLIENTE pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento pelos canais oficiais da AGÊNCIA.'),
(37,'Assinatura Eletrônica','Este contrato é assinado eletronicamente nos termos da MP 2.200-2/2001 e Lei 14.063/2020, com validade jurídica plena.'),
(38,'Assinatura Eletrônica','A assinatura é registrada com hash SHA-256, IP, geolocalização, selfie e timestamp, garantindo autenticidade e integridade.'),
(39,'Assinatura Eletrônica','Após assinado, o contrato torna-se imutável; qualquer alteração exige novo aditivo assinado por ambas as partes.'),
(40,'Comissão e Receita','A AGÊNCIA poderá receber comissões dos fornecedores; tais valores integram a remuneração pela intermediação e não constituem custo adicional ao CLIENTE.'),
(41,'Promoções','Promoções, descontos e bonificações têm condições próprias descritas no momento da oferta e prevalecem sobre as gerais.'),
(42,'Vouchers','Vouchers e bilhetes serão entregues digitalmente ao e-mail/WhatsApp do CLIENTE com antecedência mínima de 7 dias do embarque.'),
(43,'Vouchers','É responsabilidade do CLIENTE conferir vouchers e apresentar reclamações em até 48h do recebimento.'),
(44,'Comportamento','O CLIENTE compromete-se a respeitar leis e costumes do destino, sob pena de exclusão dos serviços sem direito a reembolso.'),
(45,'Comportamento','A AGÊNCIA não se responsabiliza por prejuízos decorrentes de atos ilícitos ou descumprimento de normas pelo CLIENTE.'),
(46,'Direitos do Consumidor','Aplicam-se ao presente contrato as disposições do Código de Defesa do Consumidor (Lei 8.078/90) no que for cabível.'),
(47,'Disposições Gerais','A tolerância de qualquer das partes quanto a descumprimento contratual não implica novação, renúncia ou alteração das demais cláusulas.'),
(48,'Disposições Gerais','Qualquer notificação entre as partes será válida quando enviada por e-mail aos endereços cadastrados, com confirmação de leitura.'),
(49,'Aceite','Ao assinar eletronicamente, o CLIENTE declara ter lido, compreendido e aceitado integralmente todas as cláusulas deste contrato.')
ON CONFLICT DO NOTHING;

-- 4. RPC: copy template into a new contract
CREATE OR REPLACE FUNCTION public.contract_template_clauses()
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'number', number, 'section', section, 'clause_text', clause_text, 'is_immutable', is_immutable
  ) ORDER BY number), '[]'::jsonb)
  FROM public.contract_clauses_template;
$$;

-- 5. Public verify endpoint (RPC)
CREATE OR REPLACE FUNCTION public.verify_contract(_serial text)
RETURNS TABLE (
  parties_masked text,
  signed_at timestamptz,
  content_hash text,
  signed_hash text,
  issuer text,
  status text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce((c.client_data->>'name')::text, 'Cliente') AS parties_masked,
    c.signed_at,
    c.content_hash,
    c.signed_hash,
    'Turis Assinaturas' AS issuer,
    c.status
  FROM public.contracts c
  WHERE c.certificate->>'serial' = _serial
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_contract(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_template_clauses() TO authenticated;
