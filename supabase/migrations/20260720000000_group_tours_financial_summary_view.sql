-- ============================================================
-- Migration: Group Tours Financial Summary View (Phase 3)
-- Replaces client-side loop calculations with database aggregation.
-- ============================================================

CREATE OR REPLACE VIEW public.group_tours_financial_summary WITH (security_invoker = true) AS
SELECT
  gt.id,
  gt.agency_id,
  gt.title,
  gt.destination,
  gt.departure_date,
  gt.return_date,
  gt.base_price,
  gt.ads_budget,
  gt.target_poupanca_balance,
  gt.total_seats,
  gt.status,
  gt.slug,
  COALESCE(e.pax_count, 0)::int AS pax_count,
  COALESCE(r.revenue, 0)::numeric(14,2) AS revenue,
  (
    COALESCE(c_fixed.fixed_cost, 0) + COALESCE(gt.ads_budget, 0) +
    (COALESCE(c_var.var_cost, 0) * COALESCE(e.pax_count, 0))
  )::numeric(14,2) AS total_cost,
  (
    COALESCE(r.revenue, 0) -
    (COALESCE(c_fixed.fixed_cost, 0) + COALESCE(gt.ads_budget, 0) + (COALESCE(c_var.var_cost, 0) * COALESCE(e.pax_count, 0)))
  )::numeric(14,2) AS net_profit,
  CASE
    WHEN (COALESCE(c_fixed.fixed_cost, 0) + COALESCE(gt.ads_budget, 0) + (COALESCE(c_var.var_cost, 0) * COALESCE(e.pax_count, 0))) > 0
    THEN (
      (
        COALESCE(r.revenue, 0) -
        (COALESCE(c_fixed.fixed_cost, 0) + COALESCE(gt.ads_budget, 0) + (COALESCE(c_var.var_cost, 0) * COALESCE(e.pax_count, 0)))
      ) / (COALESCE(c_fixed.fixed_cost, 0) + COALESCE(gt.ads_budget, 0) + (COALESCE(c_var.var_cost, 0) * COALESCE(e.pax_count, 0))) * 100
    )::numeric(14,2)
    ELSE 0::numeric(14,2)
  END AS roi
FROM public.group_tours gt
LEFT JOIN (
  SELECT group_tour_id, count(*)::int AS pax_count
  FROM public.group_tour_enrollments
  WHERE status = 'confirmed'
  GROUP BY group_tour_id
) e ON e.group_tour_id = gt.id
LEFT JOIN (
  SELECT t.group_tour_id, sum(fr.amount)::numeric AS revenue
  FROM public.financial_records fr
  JOIN public.trips t ON t.id = fr.trip_id
  WHERE fr.type = 'income' AND fr.status = 'paid' AND t.group_tour_id IS NOT NULL
  GROUP BY t.group_tour_id
) r ON r.group_tour_id = gt.id
LEFT JOIN (
  SELECT group_tour_id, sum(amount)::numeric AS fixed_cost
  FROM public.group_tour_costs
  WHERE type = 'fixed'
  GROUP BY group_tour_id
) c_fixed ON c_fixed.group_tour_id = gt.id
LEFT JOIN (
  SELECT group_tour_id, sum(amount)::numeric AS var_cost
  FROM public.group_tour_costs
  WHERE type = 'variable'
  GROUP BY group_tour_id
) c_var ON c_var.group_tour_id = gt.id;
