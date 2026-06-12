import { type Proposal } from "@/services/proposals";

export type QuoteTotals = {
  subtotal: number;
  total: number;
  descontoPixPercentual: number;
  totalPix: number;
  parcelasCartao: number;
  valorParcelaCartao: number;
  parcelasBoleto: number;
  valorParcelaBoleto: number;
  passageirosTotal: number;
  valorPorPessoa: number;
  breakdown: {
    voos: number;
    hoteis: number;
    transfers: number;
    passeios: number;
    extrasObrigatorios: number;
    extrasOpcionais: number;
  };
};

export function calculateQuoteTotals(state: Partial<Proposal>): QuoteTotals {
  // Safe extraction of arrays
  const flights = state.flights || [];
  const hotels = state.hotels || [];
  const transfers = state.transfers || [];
  const tours = state.tours || [];
  
  // Custom payments logic (extras) - handling later if added, for now let's sum known arrays
  const customPayments = state.custom_payments || [];

  // Calculate Breakdowns
  const voos = flights.reduce((acc, f) => acc + (Number(f.price) || 0), 0);
  const hoteis = hotels.reduce((acc, h) => acc + (Number(h.price) || 0), 0);
  const transfersTotal = transfers.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  const passeios = tours.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  
  // Custom Payments (extras)
  // Assuming extra items have a 'price' and 'is_optional' flag. 
  // If no optional flag exists yet, we assume all are mandatory.
  let extrasObrigatorios = 0;
  let extrasOpcionais = 0;

  for (const cp of customPayments) {
    const val = Number(cp.price) || 0;
    if (cp.is_optional) {
      extrasOpcionais += val;
    } else {
      extrasObrigatorios += val;
    }
  }

  // The base Subtotal only includes mandatory items
  const subtotal = voos + hoteis + transfersTotal + passeios + extrasObrigatorios;

  // Pix Discount
  const descontoPixPercentual = Number(state.pix_discount_percent) || 0;
  const pixDiscountAmount = (subtotal * descontoPixPercentual) / 100;
  const totalPix = Math.max(0, subtotal - pixDiscountAmount); // Total PIX

  // Final Total (The total on screen without PIX discount, usually equal to subtotal unless flat discounts apply)
  // In our previous model, 'total' was 'subtotal - flat discount'.
  const flatDiscount = Number(state.discount) || 0;
  const total = Math.max(0, subtotal - flatDiscount);

  // Installments
  const parcelasCartao = Math.max(1, Number(state.installments_card) || 1);
  const valorParcelaCartao = total / parcelasCartao;

  const parcelasBoleto = Math.max(1, Number(state.installments_boleto) || 1);
  const valorParcelaBoleto = total / parcelasBoleto;

  // Passengers
  const paxAdults = Number(state.pax_adults) || 0;
  const paxSeniors = Number(state.pax_seniors) || 0;
  const paxChildren = Number(state.pax_children) || 0;
  const paxInfants = Number(state.pax_infants) || 0;
  const passageirosTotal = paxAdults + paxSeniors + paxChildren + paxInfants;

  // Value per person (paying). Usually infants don't pay full, but for general average:
  const payingPax = paxAdults + paxSeniors + paxChildren;
  const valorPorPessoa = payingPax > 0 ? total / payingPax : total;

  return {
    subtotal,
    total,
    descontoPixPercentual,
    totalPix,
    parcelasCartao,
    valorParcelaCartao,
    parcelasBoleto,
    valorParcelaBoleto,
    passageirosTotal,
    valorPorPessoa,
    breakdown: {
      voos,
      hoteis,
      transfers: transfersTotal,
      passeios,
      extrasObrigatorios,
      extrasOpcionais,
    },
  };
}
