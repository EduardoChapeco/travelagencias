-- Migration: Remover a cláusula OF do trigger trg_proposals_recalculate_totals
-- Objetivo: Garantir que qualquer atualização (inclusive a dummy da RPC recalculate_proposal_totals) execute a trigger de recálculo dos totais.

DROP TRIGGER IF EXISTS trg_proposals_recalculate_totals ON public.proposals;

CREATE TRIGGER trg_proposals_recalculate_totals
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_proposal_totals();
