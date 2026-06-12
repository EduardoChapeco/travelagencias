import { type Proposal, type Flight, type Hotel, type Transfer, type Tour, type ItineraryDay } from "@/services/proposals";
import { calculateQuoteTotals, type QuoteTotals } from "./pricing";

export type BaseViewModel = {
  p: Proposal;
  agency: {
    name: string;
    logo_url?: string;
    brand_color: string;
    brand_color_fg: string;
    brand_color_light: string;
  };
  client: {
    name: string;
    email: string;
  };
  totals: QuoteTotals;
  totalPax: number;
  hasFlights: boolean;
  hasHotels: boolean;
  hasTransfers: boolean;
  hasTours: boolean;
  hasItinerary: boolean;
  hasIncludes: boolean;
  hasExcludes: boolean;
};

export function buildBaseViewModel(p: Proposal, agencyData: any): BaseViewModel {
  const totals = calculateQuoteTotals(p);
  const totalPax = (p.pax_adults || 0) + (p.pax_children || 0) + (p.pax_infants || 0) + (p.pax_seniors || 0);

  return {
    p,
    agency: {
      name: agencyData?.name || "Agência",
      logo_url: agencyData?.logo_url,
      brand_color: agencyData?.brand_color || "#3b82f6",
      brand_color_fg: agencyData?.brand_color_fg || "#ffffff",
      brand_color_light: agencyData?.brand_color_light || "#eff6ff",
    },
    client: {
      name: (p as any).client_name || "",
      email: (p as any).client_email || "",
    },
    totals,
    totalPax,
    hasFlights: (p.flights?.length || 0) > 0,
    hasHotels: (p.hotels?.length || 0) > 0,
    hasTransfers: (p.transfers?.length || 0) > 0,
    hasTours: (p.tours?.length || 0) > 0,
    hasItinerary: (p.itinerary?.length || 0) > 0,
    hasIncludes: (p.includes?.length || 0) > 0,
    hasExcludes: (p.excludes?.length || 0) > 0,
  };
}
