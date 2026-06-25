/**
 * Utility to build dynamic airline check-in links based on airline code, PNR,
 * passenger last name, and origin IATA code.
 */

export function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "";
  return parts[parts.length - 1];
}

export function getAirlineCheckinUrl(
  airline: string,
  pnr: string,
  passengerLastName: string,
  originIata: string,
): string {
  const code = airline.toLowerCase().trim();
  const cleanedPnr = pnr.trim().toUpperCase();
  const cleanedLastName = passengerLastName.trim();
  const cleanedOrigin = originIata.trim().toUpperCase();

  // LATAM (LA, JJ, TAM)
  if (code.includes("latam") || code.includes("tam") || code === "la" || code === "jj") {
    return `https://www.latamairlines.com/br/pt/check-in?orderId=${encodeURIComponent(cleanedPnr)}&lastName=${encodeURIComponent(cleanedLastName)}`;
  }

  // GOL (G3)
  if (code.includes("gol") || code === "g3") {
    return `https://b2c.voegol.com.br/check-in/dados-voo?recordLocator=${encodeURIComponent(cleanedPnr)}&departureAirport=${encodeURIComponent(cleanedOrigin)}`;
  }

  // Azul (AD)
  if (code.includes("azul") || code === "ad") {
    return `https://checkin.voeazul.com.br/?pnr=${encodeURIComponent(cleanedPnr)}&origin=${encodeURIComponent(cleanedOrigin)}`;
  }

  // Generic Google search fallback for other airlines
  return `https://www.google.com/search?q=checkin+${encodeURIComponent(airline)}+${encodeURIComponent(cleanedPnr)}`;
}
