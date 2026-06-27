import { supabase } from "@/integrations/supabase/client";

// ==============================================================================
// INTERFACE TYPES — Aligned 100% with promotion_watch_profiles and promotion_candidates
// ==============================================================================

export interface WatchProfileCriteria {
  origin?: string;
  destination?: string;
  maxPrice?: number;
  minHotelRating?: number;
  productType?: "flight" | "hotel" | "package";
}

export interface WatchProfileInput {
  name: string;
  schedule?: "daily" | "hourly" | "realtime";
  criteria: WatchProfileCriteria;
  limits?: Record<string, unknown>;
}

// ==============================================================================
// WATCH PROFILES CRUD
// ==============================================================================

/**
 * Cria um novo perfil de monitoramento de tarifas promocionais.
 * Schema real: { agency_id, name, schedule (required), criteria, limits, status }
 */
export async function createWatchProfile(agencyId: string, input: WatchProfileInput) {
  const { data, error } = await supabase
    .from("promotion_watch_profiles")
    .insert({
      agency_id: agencyId,
      name: input.name,
      schedule: input.schedule || "daily",       // campo obrigatório no schema real
      criteria: (input.criteria ?? {}) as any,
      limits: (input.limits ?? {}) as any,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca todos os perfis de monitoramento de promoções da agência.
 */
export async function fetchWatchProfiles(agencyId: string) {
  const { data, error } = await supabase
    .from("promotion_watch_profiles")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Altera o status (ativo/pausado) de um perfil de monitoramento.
 */
export async function toggleWatchProfileStatus(profileId: string, status: "active" | "paused") {
  const { error } = await supabase
    .from("promotion_watch_profiles")
    .update({ status })
    .eq("id", profileId);

  if (error) throw error;
}

/**
 * Remove um perfil de monitoramento.
 */
export async function deleteWatchProfile(profileId: string) {
  const { error } = await supabase
    .from("promotion_watch_profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw error;
}

// ==============================================================================
// PROMOTION CANDIDATES — Schema: { watch_profile_id, package_candidate_id, score, reason, status }
// NOTE: Não possui agency_id diretamente — filtramos via join com promotion_watch_profiles
// ==============================================================================

/**
 * Busca todas as oportunidades promocionais identificadas para uma agência.
 */
export async function fetchPromotionCandidates(agencyId: string) {
  const { data, error } = await supabase
    .from("promotion_candidates")
    .select(`
      *,
      watch_profile:promotion_watch_profiles!inner(
        id, name, agency_id, criteria, status
      ),
      package_candidate:package_candidates(
        id, name, total_price, currency, score, status
      )
    `)
    .eq("promotion_watch_profiles.agency_id", agencyId)
    .order("detected_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Atualiza o status de uma promoção identificada (aprovada / arquivada).
 */
export async function updatePromotionStatus(promotionId: string, status: "approved" | "dismissed") {
  const { error } = await supabase
    .from("promotion_candidates")
    .update({ status })
    .eq("id", promotionId);

  if (error) throw error;
}

// ==============================================================================
// MOTOR REATIVO DE PROMOÇÕES
// Executado após cada criação de pacotes candidatos a partir de busca GDS real.
// Cruza as ofertas reais obtidas com os critérios dos perfis de monitoramento ativos.
// ==============================================================================

/**
 * Verifica se os novos pacotes candidatos correspondem a algum perfil de monitoramento ativo.
 * Registra oportunidades reais em promotion_candidates quando há correspondência.
 *
 * @param agencyId - ID da agência para buscar os perfis ativos
 * @param quoteRequestId - ID da cotação em progresso (usado para rastreabilidade)
 * @param candidateIds - IDs dos novos package_candidates a avaliar
 */
export async function checkPackagesForPromotions(
  agencyId: string,
  _quoteRequestId: string,
  candidateIds: string[]
): Promise<void> {
  try {
    if (!candidateIds.length) return;

    // 1. Buscar perfis ativos desta agência
    const activeProfiles = await fetchWatchProfiles(agencyId);
    const activeWatchers = activeProfiles.filter((p) => p.status === "active");
    if (!activeWatchers.length) return;

    // 2. Buscar detalhes dos pacotes e componentes
    const { data: candidates } = await supabase
      .from("package_candidates")
      .select(`
        id,
        name,
        total_price,
        components:package_candidate_components(
          offer_id
        )
      `)
      .in("id", candidateIds);

    if (!candidates?.length) return;

    // 3. Buscar ofertas normalizadas associadas
    const offerIds = candidates.flatMap((c) => c.components?.map((comp: any) => comp.offer_id) ?? []);
    const offersMap = new Map<string, any>();
    
    if (offerIds.length > 0) {
      const { data: offers } = await supabase
        .from("normalized_offers")
        .select("id, product_type, price_total, normalized_data")
        .in("id", offerIds);
      
      offers?.forEach((o) => offersMap.set(o.id, o));
    }

    // 4. Para cada candidato, cruzar com cada perfil de monitoramento
    for (const cand of candidates) {
      const candPrice = Number(cand.total_price) || 0;
      const candOffers = (cand.components ?? [])
        .map((comp: any) => offersMap.get(comp.offer_id))
        .filter(Boolean);

      for (const watcher of activeWatchers) {
        const crit = watcher.criteria as WatchProfileCriteria;
        if (!crit) continue;

        // Verificar critério de preço máximo
        if (crit.maxPrice !== undefined && candPrice > Number(crit.maxPrice)) continue;

        // Verificar destino
        if (crit.destination) {
          const watcherDest = crit.destination.toLowerCase().trim();
          const hasMatchingDest = candOffers.some((o: any) => {
            const nd = o.normalized_data as any;
            const flightMatch = nd?.flights?.some((f: any) =>
              f.destination?.toLowerCase().includes(watcherDest)
            ) ?? false;
            const hotelMatch = nd?.cityName?.toLowerCase().includes(watcherDest) ?? false;
            return flightMatch || hotelMatch;
          });
          if (!hasMatchingDest) continue;
        }

        // Verificar origem do voo
        if (crit.origin) {
          const watcherOrigin = crit.origin.toLowerCase().trim();
          const hasMatchingOrigin = candOffers.some((o: any) => {
            const nd = o.normalized_data as any;
            return nd?.flights?.some((f: any) =>
              f.origin?.toLowerCase().includes(watcherOrigin)
            ) ?? false;
          });
          if (!hasMatchingOrigin) continue;
        }

        // Verificar rating mínimo de hotel
        if (crit.minHotelRating !== undefined) {
          const hasBelowRating = candOffers.some((o: any) => {
            if (o.product_type === "hotel") {
              const stars = Number((o.normalized_data as any)?.stars ?? 0);
              return stars < Number(crit.minHotelRating);
            }
            return false;
          });
          if (hasBelowRating) continue;
        }

        // Checar duplicidade antes de inserir
        const { data: existing } = await supabase
          .from("promotion_candidates")
          .select("id")
          .eq("watch_profile_id", watcher.id)
          .eq("package_candidate_id", cand.id)
          .maybeSingle();

        if (existing) continue;

        // Calcular score promocional relativo ao teto de preço
        let rawScore = 100;
        if (crit.maxPrice && Number(crit.maxPrice) > 0 && candPrice > 0) {
          rawScore = ((Number(crit.maxPrice) - candPrice) / Number(crit.maxPrice)) * 100;
        }
        const finalScore = Math.max(10, Math.min(100, Math.round(rawScore)));
        const reason =
          `Tarifa de R$ ${candPrice.toLocaleString("pt-BR")} identificada abaixo do` +
          ` limite monitorado de R$ ${Number(crit.maxPrice || 0).toLocaleString("pt-BR")}` +
          (crit.destination ? ` para ${crit.destination}` : "");

        await supabase.from("promotion_candidates").insert({
          watch_profile_id: watcher.id,
          package_candidate_id: cand.id,
          score: finalScore,
          reason,
          status: "new",
        });
      }
    }
  } catch (err) {
    console.error("[PromotionEngine] Erro no motor reativo:", err);
  }
}
