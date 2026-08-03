-- =========================================================================================
-- Microfase 4: Autoridade Server-Side para Orçamentos (Proposals)
-- Fecha a brecha onde a trigger de recálculo só disparava se as colunas JSON fossem 
-- enviadas. Agora, os totais do orçamento são absolutamente imutáveis pelo cliente.
-- =========================================================================================

-- Remover a trigger vulnerável que possuía "UPDATE OF..."
DROP TRIGGER IF EXISTS trg_proposals_recalculate_totals ON public.proposals;

-- Recriar a trigger para disparar em QUALQUER update (garante que injeções diretas 
-- em subtotal/total sejam sempre sobrescritas pelo cálculo canônico do servidor)
CREATE TRIGGER trg_proposals_recalculate_totals
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_proposal_totals();
