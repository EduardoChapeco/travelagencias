const DEFAULT_CURRENCY = "BRL";

export function formatCurrency(value: number, currency?: string | null): string {
  const normalizedCurrency = currency?.trim().toUpperCase() || DEFAULT_CURRENCY;

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(value || 0);
  } catch (error) {
    console.error("Format error with currency:", currency, error);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).format(value || 0);
  }
}

export function formatDate(value?: string | null): string {
  return value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

/** Compatibility aliases while legacy consumers migrate to semantic names. */
export const money = formatCurrency;
export const fmtDate = formatDate;
