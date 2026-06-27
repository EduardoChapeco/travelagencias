import { supabase } from "@/integrations/supabase/client";

// ==============================================================================
// TYPES — Aligned with schema:
//  decision_rules: { id, agency_id, code, scope, status, current_version_id, created_at }
//  decision_rule_versions: { id, rule_id, version, expression, effect, source, confidence,
//                            approved_by, valid_from, valid_until, created_at }
//  rule_candidates: { id, agency_id, pattern, proposed_rule, confidence, sample_size,
//                     simulated_impact, status, reviewed_by, created_at }
// ==============================================================================

/**
 * Retorna todas as regras de uma agência com a versão atual populada.
 * Usa duas queries para evitar dependência de nome exato de FK no PostgREST.
 */
export async function fetchAgencyRules(agencyId: string) {
  const { data: rules, error: rulesErr } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (rulesErr) throw rulesErr;
  if (!rules?.length) return [];

  const versionIds = rules
    .map((r) => r.current_version_id)
    .filter((id): id is string => !!id);

  if (!versionIds.length) return rules.map((r) => ({ ...r, current_version: null }));

  const { data: versions, error: versionsErr } = await supabase
    .from("decision_rule_versions")
    .select("id, rule_id, version, expression, effect, source, confidence, valid_from, approved_by, created_at")
    .in("id", versionIds);

  if (versionsErr) throw versionsErr;

  const versionsMap = new Map((versions ?? []).map((v) => [v.id, v]));

  return rules.map((r) => ({
    ...r,
    current_version: r.current_version_id
      ? (versionsMap.get(r.current_version_id) ?? null)
      : null,
  }));
}

/**
 * Retorna os candidatos a regra pendentes de revisão de uma agência.
 */
export async function fetchRuleCandidates(agencyId: string) {
  const { data, error } = await supabase
    .from("rule_candidates")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Aprova um candidato a regra sugerido pela IA.
 * 1. Cria entry em decision_rules
 * 2. Cria entry em decision_rule_versions
 * 3. Atualiza current_version_id em decision_rules
 * 4. Marca o candidato como approved
 */
export async function approveRuleCandidate(candidateId: string, supervisorId: string): Promise<string> {
  const { data: candidate, error: fetchErr } = await supabase
    .from("rule_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!candidate) throw new Error("Candidato a regra não encontrado");

  const proposed = candidate.proposed_rule as any;
  if (!proposed?.expression || !proposed?.effect) {
    throw new Error("Candidato com payload inválido (precisa de expression e effect)");
  }

  // Gerar código legível e estável
  const cleanPattern = candidate.pattern
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);
  const ruleCode = `LEARNED_${cleanPattern}_${candidateId.substring(0, 4)}`;

  // Inserir a regra
  const { data: newRule, error: ruleErr } = await supabase
    .from("decision_rules")
    .insert({
      agency_id: candidate.agency_id,
      code: ruleCode,
      scope: "agency",
      status: "active",
    })
    .select("id")
    .single();

  if (ruleErr) throw ruleErr;

  // Inserir a versão
  const { data: newVersion, error: versionErr } = await supabase
    .from("decision_rule_versions")
    .insert({
      rule_id: newRule.id,
      version: 1,
      expression: proposed.expression,
      effect: proposed.effect,
      source: "learned",
      confidence: Number(candidate.confidence) || 1.0,
      approved_by: supervisorId,
    })
    .select("id")
    .single();

  if (versionErr) {
    // Rollback da regra
    await supabase.from("decision_rules").delete().eq("id", newRule.id);
    throw versionErr;
  }

  // Atualizar current_version_id
  const { error: updateRuleErr } = await supabase
    .from("decision_rules")
    .update({ current_version_id: newVersion.id })
    .eq("id", newRule.id);

  if (updateRuleErr) throw updateRuleErr;

  // Marcar candidato como aprovado
  const { error: updateCandErr } = await supabase
    .from("rule_candidates")
    .update({ status: "approved", reviewed_by: supervisorId })
    .eq("id", candidateId);

  if (updateCandErr) throw updateCandErr;

  return newRule.id;
}

/**
 * Rejeita um candidato a regra sugerido pela IA.
 */
export async function rejectRuleCandidate(candidateId: string, supervisorId: string): Promise<void> {
  const { error } = await supabase
    .from("rule_candidates")
    .update({ status: "rejected", reviewed_by: supervisorId })
    .eq("id", candidateId);

  if (error) throw error;
}

/**
 * Alterna status de uma regra existente (active ↔ paused).
 */
export async function toggleRuleStatus(ruleId: string, status: "active" | "paused"): Promise<void> {
  const { error } = await supabase
    .from("decision_rules")
    .update({ status })
    .eq("id", ruleId);

  if (error) throw error;
}

/**
 * Exclui uma regra e todas as suas versões.
 */
export async function deleteRule(ruleId: string): Promise<void> {
  // Versões são deletadas por cascata (FK rule_id → decision_rule_versions)
  const { error } = await supabase
    .from("decision_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw error;
}
