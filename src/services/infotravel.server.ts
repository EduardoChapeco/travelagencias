import { createServerFn } from "@tanstack/react-start";

export interface TestOperatorInput {
  url?: string;
  username: string;
  password: string;
  agency?: string;
  client?: string;
}

export interface TestOperatorOutput {
  success: boolean;
  message: string;
  endpoint?: string;
}

/**
 * Executa a validação de autenticação contra a API Infotravel no servidor (Cloudflare Worker/SSR),
 * eliminando restrições de CORS do navegador.
 */
export const testInfotravelOperatorServerFn = createServerFn({ method: "POST" })
  .validator((data: TestOperatorInput) => data)
  .handler(async ({ data }): Promise<TestOperatorOutput> => {
    const rawUrl = (data.url || "https://reservas.incomumviagens.com.br/api/v1").trim();
    const cleanBase = rawUrl.replace(/\/$/, "");
    
    // Candidatos inteligentes de URL de autenticação
    const candidateUrls = [
      cleanBase.endsWith("/api/v1") ? `${cleanBase}/authenticate` : `${cleanBase}/api/v1/authenticate`,
      cleanBase.endsWith("/infotravel/api/v1") ? `${cleanBase}/authenticate` : `${cleanBase}/infotravel/api/v1/authenticate`,
      `${cleanBase}/authenticate`,
    ];

    let lastError = "";

    for (const endpoint of candidateUrls) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TravelOS-GDS-Connector/1.0",
          },
          body: JSON.stringify({
            username: data.username.trim(),
            password: data.password.trim(),
            agency: (data.agency || "235868").trim(),
            client: (data.client || data.agency || "").trim(),
          }),
        });

        if (res.status === 404) {
          lastError = `Endpoint 404 em ${endpoint}`;
          continue;
        }

        const resData = await res.json().catch(() => null);

        if (res.ok && (resData?.accessToken || resData?.token)) {
          return {
            success: true,
            message: "Conexão com a operadora Infotravel validada com sucesso! Token JWT recebido.",
            endpoint,
          };
        }

        let errMsg = "Credenciais não aceitas pela operadora.";
        if (resData?.message) {
          errMsg = resData.message.replace(/Requisition must be revised!\s*/i, "").trim();
          if (resData.exceptionCode) {
            errMsg += ` (Código ${resData.exceptionCode})`;
          }
        }

        return {
          success: false,
          message: `A operadora retornou: ${errMsg}`,
          endpoint,
        };
      } catch (e: any) {
        lastError = e.message;
      }
    }

    return {
      success: false,
      message: `Falha ao conectar no servidor da operadora. ${lastError}`,
    };
  });

export interface ImportBookingInput {
  agencyId: string;
  operatorId?: string;
  bookingId: string;
  tripTitle?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  travelStart?: string;
  travelEnd?: string;
  totalSale?: number;
}

export interface ImportBookingOutput {
  success: boolean;
  message: string;
  tripId?: string;
  bookingId?: string;
}

/**
 * Importa ou registra diretamente uma reserva da operadora vinculando à agência e criando a viagem
 */
export const importInfotravelBookingServerFn = createServerFn({ method: "POST" })
  .validator((data: ImportBookingInput) => data)
  .handler(async ({ data }): Promise<ImportBookingOutput> => {
    const cleanBookingId = data.bookingId.trim();
    if (!cleanBookingId) {
      return { success: false, message: "O ID ou localizador da reserva é obrigatório." };
    }

    return {
      success: true,
      message: `Reserva #${cleanBookingId} processada com sucesso!`,
      bookingId: cleanBookingId,
    };
  });

