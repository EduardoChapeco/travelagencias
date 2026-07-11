export function calculateMarkup(basePrice: number, markupPercentage: number): number {
  if (typeof basePrice !== "number" || typeof markupPercentage !== "number") {
    return basePrice;
  }
  return Math.round(basePrice * (1 + markupPercentage / 100));
}

export function getAgencyMarkup(agency: any, provider: "infotravel" | "default" = "infotravel"): number {
  if (!agency) return 0;
  if (provider === "infotravel") {
    return Number(agency?.integrations_config?.infotravel_markup) || 0;
  }
  return 0;
}

export function getAgentPct(rule: any, monthlyBilling: number): number {
  if (!rule) {
    if (monthlyBilling >= 100000) return 7;
    if (monthlyBilling >= 50000) return 5;
    return 3;
  }
  if (rule.commission_type === "fixed") {
    return rule.fixed_pct || 0;
  }
  let pct = 3;
  const ranges = rule.scale_ranges || [];
  for (const range of ranges) {
    if (monthlyBilling >= (range.min || 0) && (range.max === null || monthlyBilling <= range.max)) {
      pct = range.pct || 0;
    }
  }
  return pct;
}
