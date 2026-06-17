import { supabase } from "@/integrations/supabase/client";
import { type Hotel, type Flight } from "@/services/proposals";

export async function infotravelSearchHotels(
  agencyId: string,
  params: { city: string; checkin: string; checkout: string; rooms?: number }
): Promise<Hotel[]> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "search_hotels",
      agencyId,
      params,
    },
  });
  if (error) throw new Error(error.message || "Erro ao buscar hotéis no Infotravel");
  return data?.hotels || [];
}

export async function infotravelSearchFlights(
  agencyId: string,
  params: { origin: string; destination: string; date: string }
): Promise<Flight[]> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "search_flights",
      agencyId,
      params,
    },
  });
  if (error) throw new Error(error.message || "Erro ao buscar voos no Infotravel");
  return data?.flights || [];
}

export async function infotravelImportBooking(
  agencyId: string,
  bookingId: string
): Promise<any> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "import_booking",
      agencyId,
      params: { bookingId },
    },
  });
  if (error) throw new Error(error.message || "Erro ao importar reserva do Infotravel");
  return data;
}

export async function infotravelTestConnection(agencyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("infotravel-connector", {
      body: {
        action: "test_connection",
        agencyId,
      },
    });
    if (error) return false;
    return data?.success === true;
  } catch {
    return false;
  }
}
