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
