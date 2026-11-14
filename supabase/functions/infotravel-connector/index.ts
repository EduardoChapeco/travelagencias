import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;
const agencyRequestTimestamps = new Map<string, number[]>();

function checkRateLimit(agencyId: string): boolean {
  const now = Date.now();
  const timestamps = agencyRequestTimestamps.get(agencyId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  validTimestamps.push(now);
  agencyRequestTimestamps.set(agencyId, validTimestamps);
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let reqAgencyId: string | null = null;
  let reqOperatorId: string | null = null;
  let reqAction: string | null = null;
  let supabaseAdmin: any = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Cliente administrativo declarado no início do try
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Cliente autenticado com as permissões do usuário logado
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validar usuário
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized.");

    // Obter payload
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const agencyId = body.agencyId || body.agency_id;
    const operatorId = body.operatorId || body.operator_id;
    const params = body.params || {};
    if (!agencyId) throw new Error("Parâmetro agencyId é obrigatório.");

    // ─── Rate Limiting por Agência (Proteção contra flood / banimento) ──────
    if (!checkRateLimit(agencyId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "RATE_LIMIT_EXCEEDED",
          error:
            "Limite de requisições por minuto atingido (máx 25 req/min). Aguarde alguns segundos para evitar penalização pelo firewall da operadora.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        },
      );
    }

    // Guardar nos escopos globais do handler
    reqAgencyId = agencyId;
    reqOperatorId = operatorId || null;
    reqAction = action || null;

    // Validar se o usuário pertence à agência
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Acesso não autorizado para esta agência.");
    }

    // Buscar credenciais da operadora — suporta multi-operadora via operatorId
    let keysQuery = supabaseAdmin
      .from("api_keys")
      .select("provider, key_value, operator_id, category, is_active")
      .eq("agency_id", agencyId)
      .in("provider", [
        "infotravel_url",
        "infotravel_username",
        "infotravel_password",
        "infotravel_client",
        "infotravel_agency",
        "infotravel_markup",
      ]);

    if (operatorId) {
      keysQuery = keysQuery.eq("operator_id", operatorId);
    }

    const { data: allKeys } = await keysQuery;

    // Se múltiplos operadores cadastrados e nenhum operatorId foi especificado, seleciona o primeiro
    let targetOperatorId = operatorId;
    if (!targetOperatorId && allKeys && allKeys.length > 0) {
      const withOperator = allKeys.filter((k: any) => k.operator_id);
      if (withOperator.length > 0) {
        targetOperatorId = withOperator[0].operator_id;
      }
    }
    reqOperatorId = targetOperatorId || null;

    const opKeys = targetOperatorId
      ? (allKeys ?? []).filter((k: any) => k.operator_id === targetOperatorId)
      : allKeys ?? [];

    // ─── Circuit Breaker Check ──────────────────────────────────────────────
    const isPausedByCircuitBreaker = opKeys.some((k: any) => k.is_active === false);
    if (isPausedByCircuitBreaker && action !== "test_connection") {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "CIRCUIT_BREAKER_ACTIVE",
          error:
            "O disjuntor de segurança desta operadora está pausado para proteger sua agência contra bloqueios de IP. Acesse Configurações → Integrações e clique em 'Reativar e Testar Conexão'.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const getVal = (provider: string) =>
      opKeys.find((k: any) => k.provider === provider)?.key_value || "";

    const url = getVal("infotravel_url") || "https://reservas.incomumviagens.com.br/api/v1";
    const username = getVal("infotravel_username");
    const password = getVal("infotravel_password");
    const client = getVal("infotravel_client");
    const agency = getVal("infotravel_agency");

    // Verificar se as credenciais de produção foram configuradas pela agência
    const credentialsMissing =
      !username ||
      !password ||
      username.toLowerCase() === "test" ||
      username.toLowerCase() === "sandbox";

    if (credentialsMissing) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "CREDENTIALS_NOT_CONFIGURED",
          error:
            "As credenciais de acesso ao GDS Infotravel ainda não foram configuradas para esta agência. Acesse Configurações → Conexões → Infotravel para inserir suas credenciais de produção.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Autenticar na API real do GDS (Handshake Server-Side Oficial)
    const token = await authenticateInfotravel(url, username, password, client, agency);

    let result;
    if (action === "test_connection") {
      result = { success: true, message: "Conexão com a API Infotravel estabelecida com sucesso!" };
    } else if (action === "search_hotels") {
      const rawData = await fetchRealHotels(url, token, params);
      if (params.quoteRequestId && params.scenarioId) {
        const hotelAvails = rawData?.hotelAvail || [];
        const offers = hotelAvails.map((avail: any) =>
          mapApiHotelToNormalizedOffer(avail, agencyId, params.quoteRequestId, params.scenarioId),
        );
        await saveNormalizedOffers(supabaseAdmin, params.quoteRequestId, params.scenarioId, offers);
        result = { success: true, offers, total: offers.length };
      } else {
        result = rawData;
      }
    } else if (action === "search_flights") {
      const rawData = await fetchRealFlights(url, token, params);
      if (params.quoteRequestId && params.scenarioId) {
        const flightAvails = rawData?.flightAvail || [];
        const offers = flightAvails.map((avail: any) =>
          mapApiFlightToNormalizedOffer(avail, agencyId, params.quoteRequestId, params.scenarioId),
        );
        await saveNormalizedOffers(supabaseAdmin, params.quoteRequestId, params.scenarioId, offers);
        result = { success: true, offers, total: offers.length };
      } else {
        result = rawData;
      }
    } else if (action === "search_transfers") {
      // ── Busca real de traslados no GDS ──────────────────────────────────────
      const rawData = await fetchRealTransfers(url, token, params);
      if (params.quoteRequestId && params.scenarioId) {
        const transferAvails = rawData?.transferAvail || rawData?.transfers || [];
        const offers = transferAvails.map((avail: any) =>
          mapApiTransferToNormalizedOffer(
            avail,
            agencyId,
            params.quoteRequestId,
            params.scenarioId,
          ),
        );
        await saveNormalizedOffers(supabaseAdmin, params.quoteRequestId, params.scenarioId, offers);
        result = { success: true, offers, total: offers.length };
      } else {
        result = rawData;
      }
    } else if (action === "search_activities") {
      // ── Busca real de passeios/atividades no GDS ─────────────────────────────
      const rawData = await fetchRealActivities(url, token, params);
      if (params.quoteRequestId && params.scenarioId) {
        const activityAvails = rawData?.tourAvail || rawData?.activities || [];
        const offers = activityAvails.map((avail: any) =>
          mapApiActivityToNormalizedOffer(
            avail,
            agencyId,
            params.quoteRequestId,
            params.scenarioId,
          ),
        );
        await saveNormalizedOffers(supabaseAdmin, params.quoteRequestId, params.scenarioId, offers);
        result = { success: true, offers, total: offers.length };
      } else {
        result = rawData;
      }
    } else if (action === "search_insurances") {
      const rawData = await fetchRealInsurances(url, token, params);
      result = rawData;
    } else if (action === "search_chips") {
      const rawData = await fetchRealChips(url, token, params);
      result = rawData;
    } else if (action === "search_tickets") {
      const rawData = await fetchRealTickets(url, token, params);
      result = rawData;
    } else if (action === "check_rate") {
      const rawData = await fetchRealCheckRate(url, token, params);
      result = rawData;
    } else if (action === "import_booking") {
      const { bookingId, tripId } = params;
      if (!bookingId) throw new Error("O ID da reserva é obrigatório para realizar a importação.");
      const rawBooking = await fetchRealBooking(url, token, params);
      const savedTripId = await saveBookingToDatabase(supabaseAdmin, agencyId, rawBooking, tripId);
      result = { success: true, tripId: savedTripId, locator: rawBooking.locator || bookingId };
    } else if (action === "run_backfill") {
      result = await executeBackfill(url, token, supabaseAdmin, agencyId, params);
    } else if (action === "run_periodic_sync") {
      result = await executePeriodicSync(url, token, supabaseAdmin, agencyId);
    } else if (action === "create_booking") {
      result = await executeCreateBooking(url, token, supabaseAdmin, agencyId, params);
    } else if (action === "search_clients") {
      const rawClients = await fetchRealClients(url, token, params);
      result = { success: true, clients: rawClients };
    } else if (action === "sync_clients") {
      result = await executeSyncClients(url, token, supabaseAdmin, agencyId, params);
    } else if (action === "fetch_financials") {
      const { bookingId } = params;
      if (!bookingId) throw new Error("bookingId é obrigatório para consultar o financeiro.");
      const rawFinancials = await fetchRealFinancials(url, token, bookingId);
      result = { success: true, financials: rawFinancials };
    } else {
      throw new Error(`Ação não reconhecida: "${action}". Verifique a documentação do conector.`);
    }

    // Se o sync rodou com sucesso, limpa os logs de erros da operadora correspondente
    if (
      reqAgencyId &&
      reqOperatorId &&
      (reqAction === "run_periodic_sync" ||
        reqAction === "run_backfill" ||
        reqAction === "test_connection")
    ) {
      try {
        await supabaseAdmin
          .from("api_keys")
          .update({
            last_sync_error: null,
            last_sync_at: new Date().toISOString(),
          })
          .eq("agency_id", reqAgencyId)
          .eq("operator_id", reqOperatorId);
      } catch (dbErr) {
        console.error("[infotravel-connector] Falha ao limpar last_sync_error:", dbErr);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // Preservar a mensagem autêntica retornada pela operadora
    let userMessage = error.message || "Ocorreu um erro inesperado ao comunicar com a operadora.";
    const isAuthFailure =
      userMessage.includes("2109") ||
      userMessage.includes("401") ||
      userMessage.includes("403") ||
      userMessage.includes("inválidos") ||
      userMessage.includes("autenticação") ||
      userMessage.includes("Unauthorized");

    // REGISTRAR ERRO E ATIVAR DISJUNTOR DE SEGURANÇA SE HOUVER FALHA DE AUTH
    if (supabaseAdmin && reqAgencyId && reqOperatorId) {
      try {
        const updatePayload: any = {
          last_sync_error: isAuthFailure
            ? `Disjuntor de segurança acionado: ${userMessage}. A integração foi pausada automaticamente para proteger sua agência contra banimento de IP no GDS.`
            : userMessage,
          last_sync_at: new Date().toISOString(),
        };

        // Se falhou autenticação repetidamente, pausa a operadora para evitar bloqueio de IP no GDS
        if (isAuthFailure) {
          updatePayload.is_active = false;
        }

        await supabaseAdmin
          .from("api_keys")
          .update(updatePayload)
          .eq("agency_id", reqAgencyId)
          .eq("operator_id", reqOperatorId);
      } catch (dbErr) {
        console.error("[infotravel-connector] Falha ao registrar last_sync_error:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        error_code: isAuthFailure ? "AUTH_FAILED_PAUSED" : "API_ERROR",
        circuit_paused: isAuthFailure,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

// ─── Auxiliar para resolver URL sem duplicar o prefixo /api/v1 ──────────────
function resolveUrl(baseUrl: string, endpointPath: string): string {
  let base = baseUrl.replace(/\/$/, "");
  if (base.startsWith("http://")) {
    base = base.replace(/^http:\/\//, "https://");
  }
  const endpoint = endpointPath.replace(/^\//, "");

  if (base.endsWith("/api/v1") && endpoint.startsWith("api/v1/")) {
    return `${base}/${endpoint.slice("api/v1/".length)}`;
  }
  if (!base.includes("/api/v1") && !endpoint.startsWith("api/v1/")) {
    return `${base}/api/v1/${endpoint}`;
  }
  return `${base}/${endpoint}`;
}

function getAuthCandidates(baseUrl: string): string[] {
  let base = (baseUrl || "").trim().replace(/\/$/, "");
  if (base.startsWith("http://")) {
    base = base.replace(/^http:\/\//, "https://");
  }

  const candidates: string[] = [
    `${base}/authenticate`,
    base.endsWith("/api/v1") ? `${base}/authenticate` : `${base}/api/v1/authenticate`,
    base.endsWith("/infotravel/api/v1") ? `${base}/authenticate` : `${base}/infotravel/api/v1/authenticate`,
    base.endsWith("/api/v1") ? `${base}/user/login` : `${base}/api/v1/user/login`,
    `${base}/user/login`,
  ];

  return Array.from(new Set(candidates));
}

// ─── Efetuar login no GDS Infotravel para obter JWT token ───────────────────
async function authenticateInfotravel(
  url: string,
  u: string,
  p: string,
  c: string,
  a: string,
): Promise<string> {
  const username = (u || "").trim();
  const password = (p || "").trim();
  const agency = (a || "235868").trim();
  const client = (c || "").trim() || agency;

  const candidateUrls = getAuthCandidates(url || "https://reservas.incomumviagens.com.br/api/v1");
  let lastError = "";

  for (const loginUrl of candidateUrls) {
    try {
      const isUserLogin = loginUrl.endsWith("/user/login");
      const requestBody = isUserLogin
        ? {
            email: username,
            username: username,
            password: password,
            loginType: "AGENCY",
            client: client,
            agency: agency,
          }
        : {
            username,
            password,
            client,
            agency: agency || client,
          };

      const res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TravelOS-GDS-Connector/1.0",
        },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 404) {
        lastError = `Endpoint 404 em ${loginUrl}`;
        continue;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        let detailMsg = "Credenciais não aceitas pela operadora.";
        if (errJson && errJson.message) {
          detailMsg = errJson.message.replace(/Requisition must be revised!\s*/i, "").trim();
          if (errJson.exceptionCode) {
            detailMsg += ` (Código ${errJson.exceptionCode})`;
          }
        }
        throw new Error(`Falha na operadora: ${detailMsg}`);
      }

      const data = await res.json();
      const token = data.accessToken || data.token || data.access_token || data.jwt;
      if (!token) throw new Error("Token de autenticação não retornado pela API da operadora.");
      return token;
    } catch (err: any) {
      lastError = err.message;
    }
  }

  throw new Error(`Falha na autenticação da Infotravel: ${lastError}`);
}

// ─── Chamadas reais para a API da Infotravel ──────────────────────────────
async function fetchRealHotels(url: string, token: string, params: any) {
  const candidatePaths = [
    "/avail/hotel",
    "/hotel/avail",
    "/hotel-avail",
    "/hotels/availability",
  ];

  let lastError = "";
  const startDate = params.checkin || params.start || params.departureDate;
  const endDate = params.checkout || params.end || params.returnDate;
  const dest = params.destination || params.city || params.destinationCode || params.destinationName;

  for (const path of candidatePaths) {
    try {
      const endpoint = resolveUrl(url, path);
      const targetUrl = new URL(endpoint);

      if (startDate) targetUrl.searchParams.append("start", startDate);
      if (endDate) targetUrl.searchParams.append("end", endDate);
      if (dest) targetUrl.searchParams.append("destination", dest);

      // Formatar ocupação de quartos conforme OpenAPI Infotravel (ex: occupancy=2 ou occupancy=2-8,5)
      if (Array.isArray(params.occupancies) && params.occupancies.length > 0) {
        params.occupancies.forEach((occ: string) => targetUrl.searchParams.append("occupancy", String(occ)));
      } else if (params.occupancy) {
        targetUrl.searchParams.append("occupancy", String(params.occupancy));
      } else if (params.rooms && typeof params.rooms === "number") {
        for (let i = 0; i < params.rooms; i++) {
          targetUrl.searchParams.append("occupancy", "2");
        }
      } else {
        targetUrl.searchParams.append("occupancy", "2");
      }

      const res = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TravelOS-GDS-Connector/1.0",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        // Tentar POST se GET for 404
        const postRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TravelOS-GDS-Connector/1.0",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            start: startDate,
            end: endDate,
            destination: dest,
            occupancy: params.occupancies || [String(params.occupancy || 2)],
          }),
        });

        if (postRes.status !== 404) {
          if (!postRes.ok) {
            const body = await postRes.text().catch(() => "");
            throw new Error(`Erro na API de hotéis (${postRes.status}): ${body.slice(0, 150)}`);
          }
          const postData = await postRes.json();
          return postData;
        }
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Erro na API de hotéis (${res.status}): ${body.slice(0, 150)}`);
      }
      return await res.json();
    } catch (e: any) {
      lastError = e.message;
    }
  }

  throw new Error(`Falha ao buscar hotéis no GDS: ${lastError}`);
}

async function fetchRealFlights(url: string, token: string, params: any) {
  const candidatePaths = [
    "/avail/flight",
    "/flight/avail",
    "/flight-avail",
    "/air/avail",
    "/flights/availability",
  ];

  let lastError = "";
  const startDate = params.date || params.departureDate || params.start;
  const endDate = params.returnDate || params.endDate || params.end || startDate;

  for (const path of candidatePaths) {
    try {
      const endpoint = resolveUrl(url, path);
      const targetUrl = new URL(endpoint);

      if (params.origin) targetUrl.searchParams.append("origin", params.origin);
      if (params.destination) targetUrl.searchParams.append("destination", params.destination);
      if (startDate) targetUrl.searchParams.append("start", startDate);
      if (endDate) targetUrl.searchParams.append("end", endDate);

      // Formatar ocupação
      if (Array.isArray(params.occupancies) && params.occupancies.length > 0) {
        params.occupancies.forEach((occ: string) => targetUrl.searchParams.append("occupancy", String(occ)));
      } else if (params.occupancy) {
        targetUrl.searchParams.append("occupancy", String(params.occupancy));
      } else {
        targetUrl.searchParams.append("occupancy", "1");
      }

      if (params.isCombined !== undefined) {
        targetUrl.searchParams.append("isCombinedFlight", String(params.isCombined));
      }

      const res = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TravelOS-GDS-Connector/1.0",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        const postRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TravelOS-GDS-Connector/1.0",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            origin: params.origin,
            destination: params.destination,
            start: startDate,
            end: endDate,
            occupancy: params.occupancies || [String(params.occupancy || 1)],
            isCombinedFlight: params.isCombined !== undefined ? params.isCombined : true,
          }),
        });

        if (postRes.status !== 404) {
          if (!postRes.ok) {
            const body = await postRes.text().catch(() => "");
            throw new Error(`Erro na API de voos (${postRes.status}): ${body.slice(0, 150)}`);
          }
          return await postRes.json();
        }
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Erro na API de voos (${res.status}): ${body.slice(0, 150)}`);
      }
      return await res.json();
    } catch (e: any) {
      lastError = e.message;
    }
  }

  throw new Error(`Falha ao buscar voos no GDS: ${lastError}`);
}

// ─── Busca real de Traslados/Transfers ────────────────────────────────────────
async function fetchRealTransfers(url: string, token: string, params: any) {
  const candidatePaths = [
    "/avail/transfer",
    "/transfer/avail",
    "/service/avail",
    "/transfers/availability",
  ];

  let lastError = "";

  for (const path of candidatePaths) {
    try {
      const endpoint = resolveUrl(url, path);
      const targetUrl = new URL(endpoint);

      if (params.destination) targetUrl.searchParams.append("destination", params.destination);
      if (params.city) {
        const destCode = parseInt(params.city);
        if (!isNaN(destCode)) targetUrl.searchParams.append("destination", destCode.toString());
      }
      if (params.date || params.checkin) {
        targetUrl.searchParams.append("start", params.date || params.checkin);
      }
      if (params.checkout) targetUrl.searchParams.append("end", params.checkout);
      targetUrl.searchParams.append("occupancy", String(params.rooms || 2));

      const res = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) continue;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Erro na API de traslados (${res.status}): ${body.slice(0, 150)}`);
      }
      return await res.json();
    } catch (e: any) {
      lastError = e.message;
    }
  }

  return { transferAvail: [] };
}

// ─── Busca real de Passeios/Atividades ───────────────────────────────────────
async function fetchRealActivities(url: string, token: string, params: any) {
  const candidatePaths = [
    "/avail/tour",
    "/tour/avail",
    "/activity/avail",
    "/tours/availability",
  ];

  let lastError = "";

  for (const path of candidatePaths) {
    try {
      const endpoint = resolveUrl(url, path);
      const targetUrl = new URL(endpoint);

      if (params.destination) targetUrl.searchParams.append("destination", params.destination);
      if (params.city) {
        const destCode = parseInt(params.city);
        if (!isNaN(destCode)) targetUrl.searchParams.append("destination", destCode.toString());
      }
      if (params.date || params.checkin) {
        targetUrl.searchParams.append("start", params.date || params.checkin);
      }
      if (params.checkout) targetUrl.searchParams.append("end", params.checkout);
      targetUrl.searchParams.append("occupancy", String(params.rooms || 2));

      const res = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) continue;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Erro na API de atividades (${res.status}): ${body.slice(0, 150)}`);
      }
      return await res.json();
    } catch (e: any) {
      lastError = e.message;
    }
  }

  return { tourAvail: [] };
}

async function fetchRealInsurances(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/insurance"));
  if (params.destination) targetUrl.searchParams.append("destination", params.destination);
  if (params.departureDate) targetUrl.searchParams.append("start", params.departureDate);
  if (params.returnDate) targetUrl.searchParams.append("end", params.returnDate);
  targetUrl.searchParams.append("passengers", String(params.passengers || 2));

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { insurances: [] };
  return await res.json();
}

async function fetchRealChips(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/chip"));
  if (params.destination) targetUrl.searchParams.append("destination", params.destination);
  if (params.departureDate) targetUrl.searchParams.append("start", params.departureDate);
  if (params.days) targetUrl.searchParams.append("days", String(params.days));

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { chips: [] };
  return await res.json();
}

async function fetchRealTickets(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/ticket"));
  if (params.destination) targetUrl.searchParams.append("destination", params.destination);
  if (params.date) targetUrl.searchParams.append("date", params.date);

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { tickets: [] };
  return await res.json();
}

async function fetchRealCheckRate(url: string, token: string, params: any) {
  const targetUrl = resolveUrl(url, "/api/v1/check-rate");
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) return { valid: true, priceChanged: false };
  return await res.json();
}

async function fetchRealBooking(url: string, token: string, params: any) {
  const { bookingId } = params;
  if (!bookingId) throw new Error("bookingId é obrigatório para importação.");

  const targetUrl = resolveUrl(url, `/api/v1/booking/${bookingId}`);
  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok)
    throw new Error(`Erro ao buscar a reserva #${bookingId} no Infotravel: HTTP ${res.status}`);
  return await res.json();
}

async function fetchRealClients(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/client"));

  if (params.name) targetUrl.searchParams.append("name", params.name);
  if (params.email) targetUrl.searchParams.append("email", params.email);
  if (params.document) targetUrl.searchParams.append("document", params.document);

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Falha na consulta de clientes (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`,
    );
  }
  return await res.json();
}

async function fetchRealFinancials(url: string, token: string, bookingId: string) {
  const targetUrl = resolveUrl(url, `/api/v1/booking/${bookingId}/financial`);
  
  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Falha na consulta financeira da reserva #${bookingId} (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`,
    );
  }
  return await res.json();
}

async function executeSyncClients(
  url: string,
  token: string,
  supabaseAdmin: any,
  agencyId: string,
  params: any,
) {
  console.log("[infotravel-connector] Sincronizando clientes da operadora...");
  const rawData = await fetchRealClients(url, token, params);
  const clientsList = Array.isArray(rawData) ? rawData : (rawData?.clients || rawData?.data || []);

  let syncedCount = 0;
  for (const c of clientsList) {
    const name = (c.name || `${c.firstName || ""} ${c.lastName || ""}`).trim();
    if (!name) continue;

    const doc = c.document?.number || c.documents?.[0]?.number || c.cpf || c.cnpj || "";
    const email = c.email || "";
    const phone = c.telephones?.[0]?.number || c.phone || "";
    const birthDate = c.birth ? c.birth.split("T")[0] : null;

    let existingId: string | null = null;
    if (doc) {
      const { data: byDoc } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("document", doc)
        .is("deleted_at", null)
        .maybeSingle();
      if (byDoc) existingId = byDoc.id;
    }

    if (!existingId && email) {
      const { data: byEmail } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("email", email)
        .is("deleted_at", null)
        .maybeSingle();
      if (byEmail) existingId = byEmail.id;
    }

    if (existingId) {
      await supabaseAdmin
        .from("clients")
        .update({
          full_name: name,
          phone: phone || undefined,
          email: email || undefined,
          document: doc || undefined,
          birth_date: birthDate || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);
    } else {
      await supabaseAdmin.from("clients").insert({
        agency_id: agencyId,
        full_name: name,
        document: doc || null,
        email: email || null,
        phone: phone || null,
        birth_date: birthDate || null,
        kind: "individual",
        notes: "Importado da carteira de clientes Infotravel",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    syncedCount++;
  }

  return {
    success: true,
    total_synced: syncedCount,
    message: `${syncedCount} clientes sincronizados com sucesso a partir da Operadora.`,
  };
}

// ─── Pipeline de Carga Histórica (Backfill) ─────────────────────────────────
async function executeBackfill(
  url: string,
  token: string,
  supabaseAdmin: any,
  agencyId: string,
  params: any,
) {
  const { startDate, endDate } = params;

  // Criar auditoria de sincronização
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("sync_jobs")
    .insert({
      agency_id: agencyId,
      provider: "infotravel",
      job_type: "backfill",
      status: "running",
      records_processed: 0,
      errors_log: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobErr) throw new Error(`Falha ao registrar job de sincronização: ${jobErr.message}`);
  const jobId = job.id;

  let recordsProcessed = 0;
  const errorsLog: any[] = [];

  try {
    let startStr = startDate;
    let endStr = endDate || new Date().toISOString().split("T")[0];

    if (!startStr) {
      const { data: checkpoint } = await supabaseAdmin
        .from("sync_checkpoints")
        .select("cursor_value")
        .eq("agency_id", agencyId)
        .eq("provider", "infotravel")
        .maybeSingle();

      if (checkpoint?.cursor_value) {
        const lastDate = new Date(checkpoint.cursor_value);
        lastDate.setDate(lastDate.getDate() + 1);
        startStr = lastDate.toISOString().split("T")[0];
      } else {
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 30);
        startStr = defaultStart.toISOString().split("T")[0];
      }
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (start > end) {
      await supabaseAdmin
        .from("sync_jobs")
        .update({
          status: "completed",
          records_processed: 0,
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return {
        success: true,
        message: "Nenhum intervalo novo para sincronizar.",
        records_processed: 0,
      };
    }

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      const startOfDay = `${dateStr}T00:00:00`;
      const endOfDay = `${dateStr}T23:59:59`;

      try {
        const searchUrl = new URL(resolveUrl(url, "/api/v1/backoffice/booking/search"));
        searchUrl.searchParams.append("start", startOfDay);
        searchUrl.searchParams.append("end", endOfDay);
        searchUrl.searchParams.append("searchType", "CREATION");

        const searchRes = await fetch(searchUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!searchRes.ok) {
          throw new Error(
            `Erro na busca de reservas para o dia ${dateStr}: HTTP ${searchRes.status}`,
          );
        }

        const searchData = await searchRes.json();
        const bookingsList = searchData.bookings || [];

        for (const bSummary of bookingsList) {
          const bookingIdStr = bSummary.id.toString();

          try {
            const { data: existingLink } = await supabaseAdmin
              .from("external_entity_links")
              .select("internal_id, trips(status)")
              .eq("agency_id", agencyId)
              .eq("provider", "infotravel")
              .eq("entity_type", "trip")
              .eq("external_id", bookingIdStr)
              .maybeSingle();

            const localTripStatus = existingLink?.trips?.status;
            if (
              existingLink &&
              (localTripStatus === "completed" || localTripStatus === "cancelled")
            ) {
              continue;
            }

            // Rate Limit rígido de 1 req/s
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const detailUrl = resolveUrl(url, `/api/v1/booking/${bookingIdStr}`);
            const detailRes = await fetch(detailUrl, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!detailRes.ok) {
              throw new Error(
                `Erro ao obter detalhes da reserva #${bookingIdStr}: HTTP ${detailRes.status}`,
              );
            }

            const rawBooking = await detailRes.json();
            if (!rawBooking) continue;

            await saveBookingToDatabase(supabaseAdmin, agencyId, rawBooking);
            recordsProcessed++;

            await supabaseAdmin
              .from("sync_jobs")
              .update({ records_processed: recordsProcessed })
              .eq("id", jobId);
          } catch (bErr: any) {
            console.error(`Erro ao processar reserva #${bookingIdStr}:`, bErr);
            errorsLog.push({
              booking_id: bookingIdStr,
              date: dateStr,
              error: bErr.message,
              timestamp: new Date().toISOString(),
            });
            await supabaseAdmin.from("sync_jobs").update({ errors_log: errorsLog }).eq("id", jobId);
          }
        }

        // Salvar checkpoint diário
        await supabaseAdmin.from("sync_checkpoints").upsert(
          {
            agency_id: agencyId,
            provider: "infotravel",
            cursor_value: dateStr,
            last_run_at: new Date().toISOString(),
          },
          {
            onConflict: "agency_id,provider",
          },
        );
      } catch (dayErr: any) {
        console.error(`Erro ao processar o dia ${dateStr}:`, dayErr);
        errorsLog.push({
          date: dateStr,
          error: dayErr.message,
          timestamp: new Date().toISOString(),
        });
        await supabaseAdmin.from("sync_jobs").update({ errors_log: errorsLog }).eq("id", jobId);
      }

      current.setDate(current.getDate() + 1);
    }

    const jobStatus = errorsLog.length > 0 && recordsProcessed === 0 ? "failed" : "completed";
    await supabaseAdmin
      .from("sync_jobs")
      .update({
        status: jobStatus,
        records_processed: recordsProcessed,
        errors_log: errorsLog,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: true,
      status: jobStatus,
      records_processed: recordsProcessed,
      errors: errorsLog.length,
    };
  } catch (globalErr: any) {
    console.error("Erro global no executeBackfill:", globalErr);
    errorsLog.push({
      global: true,
      error: globalErr.message,
      timestamp: new Date().toISOString(),
    });
    await supabaseAdmin
      .from("sync_jobs")
      .update({
        status: "failed",
        errors_log: errorsLog,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    throw globalErr;
  }
}

// ─── Polling Engine (Sincronização Periódica) ──────────────────────────────
async function executePeriodicSync(
  url: string,
  token: string,
  supabaseAdmin: any,
  agencyId: string,
) {
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("sync_jobs")
    .insert({
      agency_id: agencyId,
      provider: "infotravel",
      job_type: "polling",
      status: "running",
      records_processed: 0,
      errors_log: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobErr) throw new Error(`Falha ao registrar job de sincronização: ${jobErr.message}`);
  const jobId = job.id;

  let recordsProcessed = 0;
  const errorsLog: any[] = [];

  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar viagens ativas da agência nos próximos 30 dias (ou em andamento iniciadas há 7 dias)
    const { data: activeTrips, error: tripsErr } = await supabaseAdmin
      .from("external_entity_links")
      .select("external_id, internal_id, trips!inner(id, status, travel_start)")
      .eq("agency_id", agencyId)
      .eq("provider", "infotravel")
      .eq("entity_type", "trip")
      .is("trips.deleted_at", null)
      .not("trips.status", "in", "('completed','cancelled')")
      .gte("trips.travel_start", sevenDaysAgo.toISOString().split("T")[0])
      .lte("trips.travel_start", thirtyDaysFromNow.toISOString().split("T")[0]);

    if (tripsErr) throw tripsErr;

    if (activeTrips && activeTrips.length > 0) {
      for (const tLink of activeTrips) {
        const bookingIdStr = tLink.external_id;

        try {
          // Rate Limit rígido de 1 req/s
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const detailUrl = resolveUrl(url, `/api/v1/booking/${bookingIdStr}`);
          const detailRes = await fetch(detailUrl, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!detailRes.ok) {
            throw new Error(
              `Erro ao consultar status da reserva #${bookingIdStr}: HTTP ${detailRes.status}`,
            );
          }

          const rawBooking = await detailRes.json();
          if (!rawBooking) continue;

          await saveBookingToDatabase(supabaseAdmin, agencyId, rawBooking);

          // Atualizar data da última sincronização
          await supabaseAdmin
            .from("external_entity_links")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("agency_id", agencyId)
            .eq("provider", "infotravel")
            .eq("entity_type", "trip")
            .eq("external_id", bookingIdStr);

          recordsProcessed++;

          await supabaseAdmin
            .from("sync_jobs")
            .update({ records_processed: recordsProcessed })
            .eq("id", jobId);
        } catch (bErr: any) {
          console.error(`Erro na sincronização periódica da reserva #${bookingIdStr}:`, bErr);
          errorsLog.push({
            booking_id: bookingIdStr,
            error: bErr.message,
            timestamp: new Date().toISOString(),
          });
          await supabaseAdmin.from("sync_jobs").update({ errors_log: errorsLog }).eq("id", jobId);
        }
      }
    }

    const jobStatus = errorsLog.length > 0 && recordsProcessed === 0 ? "failed" : "completed";
    await supabaseAdmin
      .from("sync_jobs")
      .update({
        status: jobStatus,
        records_processed: recordsProcessed,
        errors_log: errorsLog,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: true,
      status: jobStatus,
      records_processed: recordsProcessed,
      errors: errorsLog.length,
    };
  } catch (globalErr: any) {
    console.error("Erro global no executePeriodicSync:", globalErr);
    errorsLog.push({
      global: true,
      error: globalErr.message,
      timestamp: new Date().toISOString(),
    });
    await supabaseAdmin
      .from("sync_jobs")
      .update({
        status: "failed",
        errors_log: errorsLog,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    throw globalErr;
  }
}

// ─── Criação de Reserva Direta Manual no GDS (POST /api/v1/booking) ────────
async function executeCreateBooking(
  url: string,
  token: string,
  supabaseAdmin: any,
  agencyId: string,
  params: any,
) {
  const { tripId } = params;
  if (!tripId) throw new Error("Parâmetro tripId é obrigatório.");

  // 1. Obter viagem e cliente
  const { data: trip, error: tripErr } = await supabaseAdmin
    .from("trips")
    .select("*, clients(*)")
    .eq("id", tripId)
    .single();

  if (tripErr || !trip) {
    throw new Error(`Viagem não encontrada no banco local: ${tripErr?.message}`);
  }

  // 2. Obter passageiros
  const { data: passengers, error: passErr } = await supabaseAdmin
    .from("trip_passengers")
    .select("*")
    .eq("trip_id", tripId)
    .is("deleted_at", null);

  if (passErr) throw new Error(`Erro ao buscar passageiros: ${passErr.message}`);
  if (!passengers || passengers.length === 0) {
    throw new Error(
      "Esta viagem não possui passageiros cadastrados. É necessário pelo menos um passageiro para realizar a reserva no GDS.",
    );
  }

  // 3. Obter voucher (itinerário)
  const { data: voucher, error: voucherErr } = await supabaseAdmin
    .from("vouchers")
    .select("*")
    .eq("trip_id", tripId)
    .is("deleted_at", null)
    .maybeSingle();

  if (voucherErr) throw new Error(`Erro ao obter voucher: ${voucherErr.message}`);

  const hasFlights = voucher && Array.isArray(voucher.flights) && voucher.flights.length > 0;
  const hasHotels =
    voucher && Array.isArray(voucher.accommodation) && voucher.accommodation.length > 0;

  if (!hasFlights && !hasHotels) {
    throw new Error(
      "Esta viagem não possui voos ou hotéis no voucher. Insira pelo menos um serviço de aéreo ou hospedagem para reservar no GDS.",
    );
  }

  // 4. Montar o payload do ApiBooking para a GDS
  const clientFirstName = trip.clients?.full_name?.split(" ")[0] || "Cliente";
  const clientLastName = trip.clients?.full_name?.split(" ").slice(1).join(" ") || "Importado";

  const clientCpf = trip.clients?.document || "";
  const clientCpfObj = clientCpf ? [{ number: clientCpf, type: "CPF" }] : [];

  const apiBooking: any = {
    status: "RESERVED",
    type: "PACKAGE",
    client: {
      name: clientFirstName,
      lastName: clientLastName,
      email: trip.clients?.email || "",
      telephones: trip.clients?.phone ? [{ number: trip.clients.phone }] : [],
      documents: clientCpfObj,
    },
    bookingFlights: [],
    bookingHotels: [],
  };

  // Mapear voos se houver
  if (hasFlights) {
    const flightsPayload = voucher.flights.map((f: any) => {
      const departureDate = f.date
        ? `${f.date}T${f.departure_time || "12:00"}:00`
        : new Date().toISOString();
      const arrivalDate = f.date
        ? `${f.date}T${f.arrival_time || "14:00"}:00`
        : new Date().toISOString();

      return {
        number: f.flight_number || "0000",
        airline: {
          code: f.airline?.substring(0, 2).toUpperCase() || "XX",
          name: f.airline || "Companhia",
        },
        origin: { code: f.origin?.substring(0, 3).toUpperCase() || "GRU" },
        destination: { code: f.destination?.substring(0, 3).toUpperCase() || "MIA" },
        departure: departureDate,
        arrival: arrivalDate,
        stopsCount: 0,
        fares: [
          {
            type: "ADULT",
            price: { amount: trip.total_sale || 0, currency: "BRL" },
          },
        ],
      };
    });

    const passengersNames = passengers.map((p: any, idx: number) => {
      const pFirstName = p.full_name.split(" ")[0] || "Passageiro";
      const pLastName = p.full_name.split(" ").slice(1).join(" ") || `Nro ${idx + 1}`;
      return {
        id: idx + 1,
        firstName: pFirstName,
        lastName: pLastName,
        birth: p.birth_date ? `${p.birth_date}T00:00:00` : undefined,
        type: p.kind === "child" ? "CHD" : p.kind === "infant" ? "INF" : "ADT",
        gender: "MALE",
        document: p.document
          ? { number: p.document, type: p.document_type?.toUpperCase() || "RG" }
          : undefined,
        isMain: p.is_lead_passenger || false,
      };
    });

    apiBooking.bookingFlights.push({
      status: "RESERVED",
      provider: "INFOTRAVEL",
      flights: flightsPayload,
      names: passengersNames,
    });
  }

  // Mapear hotéis se houver
  if (hasHotels) {
    voucher.accommodation.forEach((h: any, idx: number) => {
      const checkinDate = h.checkin ? `${h.checkin}T14:00:00` : new Date().toISOString();
      const checkoutDate = h.checkout ? `${h.checkout}T12:00:00` : new Date().toISOString();

      apiBooking.bookingHotels.push({
        status: "RESERVED",
        provider: "INFOTRAVEL",
        checkIn: checkinDate,
        checkOut: checkoutDate,
        hotel: {
          name: h.name || "Hotel",
          city: { name: h.city || "Cidade" },
        },
        rooms: [
          {
            description: h.room_type || "Quarto Standard",
            boardType: { description: h.meal_plan || "Somente Hospedagem" },
          },
        ],
      });
    });
  }

  const bookingUrl = resolveUrl(url, "/api/v1/booking");
  console.log("Enviando requisição de criação de reserva para o GDS:", bookingUrl);

  const res = await fetch(bookingUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ booking: apiBooking }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao criar reserva no GDS: HTTP ${res.status} - ${errText}`);
  }

  const responseData = await res.json();
  const gdsBooking = responseData.booking;

  if (!gdsBooking || !gdsBooking.id) {
    throw new Error("O GDS não retornou uma reserva válida após a criação.");
  }

  // Persistir os dados retornados pelo GDS (como localizadores PNR)
  await saveBookingToDatabase(supabaseAdmin, agencyId, gdsBooking);

  return {
    success: true,
    booking_id: gdsBooking.id,
    locator: gdsBooking.locator || "PNR",
    status: gdsBooking.status,
  };
}

// ─── Tradutor de Status GDS -> Local ────────────────────────────────────────
function mapGDSStatusToLocal(
  gdsStatus?: string,
): "planning" | "confirmed" | "in_progress" | "completed" | "cancelled" {
  if (!gdsStatus) return "planning";
  const status = gdsStatus.toUpperCase();
  switch (status) {
    case "CONFIRMED":
    case "RESERVED":
    case "ORDER":
    case "MODIFIED":
      return "confirmed";
    case "CANCELED":
    case "DENIED":
    case "EXPIRED":
    case "IN_CANCELLATION_PROCESS":
      return "cancelled";
    case "WAITING_LIST":
    case "QUOTATION":
    case "PROCESSING":
    case "BLOCKED":
    case "IN_PAYMENT_PROCESS":
    case "ON_REQUEST":
    case "ANALYSIS":
    case "EDITION":
    case "CREATION":
      return "planning";
    default:
      return "confirmed";
  }
}

// ─── Normalizador de Reserva GDS ────────────────────────────────────────────
function normalizeBooking(booking: any) {
  const bookingId =
    booking.id?.toString() || `B-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const locator = booking.locator || "PNR-GDS";

  let destination = "Destino Internacional";
  if (booking.bookingHotels?.[0]?.hotel?.city?.name) {
    destination = booking.bookingHotels[0].hotel.city.name;
  } else if (booking.bookingFlights?.[0]?.flights?.[0]?.destination?.city?.name) {
    destination = booking.bookingFlights[0].flights[0].destination.city.name;
  }

  const firstName = booking.client?.name || "";
  const lastName = booking.client?.lastName || "";
  const clientName = `${firstName} ${lastName}`.trim() || "Cliente GDS";

  const clientCpfObj = booking.client?.documents?.find(
    (doc: any) => doc.type?.toUpperCase() === "CPF",
  );
  const clientCpf = clientCpfObj?.number || "";

  const clientEmail = booking.client?.email || "";
  const clientPhone = booking.client?.telephones?.[0]?.number || "";
  const totalSale = booking.bookingAmount?.amount || 0;

  const hotels = (booking.bookingHotels || []).map((h: any) => {
    const hotelId = h.hotel?.id?.toString() || `info-h-${Math.random().toString(36).substr(2, 9)}`;
    const hotelName = h.hotel?.name || "Hotel Sem Nome";
    const hotelCity = h.hotel?.city?.name || "Destino Desconhecido";

    const primaryRoom = h.rooms?.[0];
    const rawCheckin = primaryRoom?.checkIn || booking.createdAt || "";
    const rawCheckout = primaryRoom?.checkOut || booking.createdAt || "";
    const checkin = rawCheckin ? rawCheckin.split("T")[0] : "";
    const checkout = rawCheckout ? rawCheckout.split("T")[0] : "";

    const mealPlan = primaryRoom?.boardType?.description || "Somente Hospedagem";
    const rooms = (h.rooms || []).map((r: any) => ({
      type: r.description || r.name || "Quarto Standard",
      qty: r.quantity || 1,
    }));
    if (rooms.length === 0) rooms.push({ type: "Quarto Standard", qty: 1 });

    return {
      id: hotelId,
      name: hotelName,
      city: hotelCity,
      checkin,
      checkout,
      meal_plan: mealPlan,
      rooms,
    };
  });

  const flights = (booking.bookingFlights || []).map((bf: any) => {
    const primaryFlight = bf.flights?.[0];
    const flightId = primaryFlight?.key || `info-f-${Math.random().toString(36).substr(2, 9)}`;
    const origin = primaryFlight?.origin?.code || "GRU";
    const destinationCode = primaryFlight?.destination?.code || "MIA";
    const date = primaryFlight?.departure ? primaryFlight.departure.split("T")[0] : "";
    const departure_time = primaryFlight?.departure
      ? primaryFlight.departure.split("T")[1]?.substring(0, 5)
      : "00:00";
    const arrival_time = primaryFlight?.arrival
      ? primaryFlight.arrival.split("T")[1]?.substring(0, 5)
      : "00:00";
    const airline =
      primaryFlight?.airline?.name || primaryFlight?.airline?.code || "Companhia Aérea";
    const flight_number = primaryFlight?.number || "0000";
    const primaryFare = primaryFlight?.fares?.[0];
    const baggage_rules = primaryFare?.description || "Baggage rules subject to airline terms";
    const price = primaryFare?.price?.amount || 0;

    return {
      id: flightId,
      origin,
      destination: destinationCode,
      date,
      departure_time,
      arrival_time,
      airline,
      flight_number,
      baggage_rules,
      price,
    };
  });

  const passengers: any[] = [];
  const passengerNames = booking.bookingFlights?.[0]?.names || [];

  passengerNames.forEach((n: any) => {
    const docNumber = n.document?.number || n.documents?.[0]?.number || "";
    const docType =
      n.document?.type?.toLowerCase() || n.documents?.[0]?.type?.toLowerCase() || "rg";
    const birthDate = n.birth ? n.birth.split("T")[0] : "";
    const fullName = `${n.firstName} ${n.lastName}`.trim();

    if (fullName) {
      passengers.push({
        full_name: fullName,
        document: docNumber,
        document_type: docType,
        birth_date: birthDate,
      });
    }
  });

  (booking.bookingHotels || []).forEach((bh: any) => {
    (bh.rooms || []).forEach((r: any) => {
      (r.names || []).forEach((n: any) => {
        const docNumber = n.document?.number || n.documents?.[0]?.number || "";
        const docType =
          n.document?.type?.toLowerCase() || n.documents?.[0]?.type?.toLowerCase() || "rg";
        const birthDate = n.birth ? n.birth.split("T")[0] : "";
        const fullName = `${n.firstName} ${n.lastName}`.trim();

        if (fullName) {
          const exists = passengers.some(
            (p) => p.full_name.toLowerCase() === fullName.toLowerCase(),
          );
          if (!exists) {
            passengers.push({
              full_name: fullName,
              document: docNumber,
              document_type: docType,
              birth_date: birthDate,
            });
          }
        }
      });
    });
  });

  if (passengers.length === 0) {
    passengers.push({
      full_name: clientName,
      document: clientCpf,
      document_type: "cpf",
      birth_date: "",
      email: clientEmail,
      phone: clientPhone,
    });
  }

  return {
    booking_id: bookingId,
    locator,
    destination,
    client_name: clientName,
    client_cpf: clientCpf,
    client_email: clientEmail,
    client_phone: clientPhone,
    total_sale: totalSale,
    status: mapGDSStatusToLocal(booking.status),
    flights,
    hotels,
    passengers,
  };
}

async function saveBookingToDatabase(
  supabaseAdmin: any,
  agencyId: string,
  booking: any,
  overrideTripId?: string,
): Promise<string> {
  const normalized = normalizeBooking(booking);

  console.log(
    "Chamando RPC save_infotravel_booking_normalized com dados da reserva:",
    normalized.locator,
  );

  const { data: tripId, error } = await supabaseAdmin.rpc("save_infotravel_booking_normalized", {
    p_agency_id: agencyId,
    p_normalized: normalized,
    p_override_trip_id: overrideTripId || null,
  });

  if (error) {
    console.error("Erro ao persistir reserva via RPC save_infotravel_booking_normalized:", error);
    throw error;
  }

  if (!tripId) {
    throw new Error("A gravação atômica da reserva não retornou um ID de viagem válido.");
  }

  return tripId;
}

// ─── Mapeadores de Normalização VibeTour para o Conector ────────────────────

function mapApiHotelToNormalizedOffer(
  avail: any,
  agencyId: string,
  quoteRequestId: string,
  scenarioId: string,
) {
  const hotelId = avail.hotel?.id?.toString() || `h-${Math.random().toString(36).substr(2, 9)}`;
  const checkin = avail.checkIn ? avail.checkIn.split("T")[0] : "";
  const checkout = avail.checkOut ? avail.checkOut.split("T")[0] : "";

  const roomGroup = avail.roomGroups?.[0];
  const rooms = roomGroup?.rooms?.map((r: any) => ({
    description: r.description || r.name || "Quarto Standard",
    quantity: r.quantity || 1,
    boardDescription: r.boardType?.description || "Somente Hospedagem",
  })) || [{ description: "Quarto Standard", quantity: 1, boardDescription: "Somente Hospedagem" }];

  const lowestPrice = avail.lowestFare?.price?.amount || avail.lowestFare?.amount || 0;
  const images =
    avail.hotel?.images?.map((img: any) => img.url || img.path || "").filter(Boolean) || [];

  return {
    id: crypto.randomUUID(),
    agencyId,
    providerCode: "infotravel",
    externalOfferId: hotelId,
    searchScenarioId: scenarioId,
    productType: "hotel",
    origin: [],
    destination: [
      { code: avail.hotel?.city?.code?.toString() || "", name: avail.hotel?.city?.name || "" },
    ],
    startAt: avail.checkIn || "",
    endAt: avail.checkOut || "",
    travelers: { adults: 2 },
    flights: [],
    accommodations: [
      {
        id: hotelId,
        name: avail.hotel?.name || "Hotel Sem Nome",
        cityName: avail.hotel?.city?.name,
        checkIn: checkin,
        checkOut: checkout,
        rooms,
        lowestPrice,
        images,
      },
    ],
    transfers: [],
    experiences: [],
    insurances: [],
    tickets: [],
    pricing: {
      netPrice: lowestPrice * 0.9,
      commission: lowestPrice * 0.1,
      markup: 0,
      taxes: 0,
      totalPrice: lowestPrice,
      currency: avail.lowestFare?.price?.currency || "BRL",
    },
    policies: [],
    availability: {
      isAvailable: true,
    },
    fetchedAt: new Date().toISOString(),
    status: "available",
  };
}

function mapApiFlightToNormalizedOffer(
  avail: any,
  agencyId: string,
  quoteRequestId: string,
  scenarioId: string,
) {
  const primaryRoute = avail.routes?.[0];
  const primaryFlight = primaryRoute?.flights?.[0];

  const flightId = primaryFlight?.key || `f-${Math.random().toString(36).substr(2, 9)}`;
  const originCode = primaryFlight?.origin?.code || "GRU";
  const destCode = primaryFlight?.destination?.code || "MIA";
  const primaryFare = primaryFlight?.fares?.[0];
  const totalPrice = primaryFare?.price?.amount || 0;

  const flightsList = (primaryRoute?.flights || []).map((f: any) => ({
    id: f.key || `f-${Math.random().toString(36).substr(2, 9)}`,
    airlineCode: f.airline?.code || "",
    airlineName: f.airline?.name || "",
    flightNumber: f.number || "",
    origin: f.origin?.code || "",
    destination: f.destination?.code || "",
    departure: f.departure || "",
    arrival: f.arrival || "",
    stops: f.stopsCount || 0,
    baggageAllowance: f.fares?.[0]?.description || "",
  }));

  return {
    id: crypto.randomUUID(),
    agencyId,
    providerCode: "infotravel",
    externalOfferId: flightId,
    searchScenarioId: scenarioId,
    productType: "flight",
    origin: [{ code: originCode }],
    destination: [{ code: destCode }],
    startAt: primaryFlight?.departure || "",
    endAt: primaryFlight?.arrival || "",
    travelers: { adults: 1 },
    flights: flightsList,
    accommodations: [],
    transfers: [],
    experiences: [],
    insurances: [],
    tickets: [],
    pricing: {
      netPrice: totalPrice * 0.95,
      commission: totalPrice * 0.05,
      markup: 0,
      taxes: 0,
      totalPrice: totalPrice,
      currency: primaryFare?.price?.currency || "BRL",
    },
    policies: [],
    availability: {
      isAvailable: true,
    },
    fetchedAt: new Date().toISOString(),
    status: "available",
  };
}

// ─── Normalizador de Transfer para NormalizedOffer ──────────────────────────
function mapApiTransferToNormalizedOffer(
  avail: any,
  agencyId: string,
  quoteRequestId: string,
  scenarioId: string,
) {
  const transferId =
    avail.id?.toString() || avail.key || `tr-${crypto.randomUUID().substring(0, 8)}`;
  const name = avail.name || avail.description || "Transfer não identificado";
  const cityName = avail.city?.name || avail.destination?.name || "";
  const price = avail.lowestFare?.price?.amount || avail.price?.amount || avail.amount || 0;
  const currency = avail.lowestFare?.price?.currency || avail.price?.currency || "BRL";

  return {
    id: crypto.randomUUID(),
    agencyId,
    providerCode: "infotravel",
    externalOfferId: transferId,
    searchScenarioId: scenarioId,
    productType: "transfer",
    origin: [],
    destination: [{ code: avail.destination?.code?.toString() || "", name: cityName }],
    startAt: avail.date || avail.checkIn || "",
    endAt: avail.date || avail.checkOut || "",
    travelers: { adults: 2 },
    flights: [],
    accommodations: [],
    transfers: [
      {
        id: transferId,
        name,
        cityName,
        description: avail.longDescription || avail.description || name,
        type: avail.transferType || "PRIVATIVO",
        capacity: avail.capacity || null,
        price,
        currency,
      },
    ],
    experiences: [],
    insurances: [],
    tickets: [],
    pricing: {
      netPrice: price * 0.9,
      commission: price * 0.1,
      markup: 0,
      taxes: 0,
      totalPrice: price,
      currency,
    },
    policies: [],
    availability: { isAvailable: true },
    fetchedAt: new Date().toISOString(),
    status: "available",
  };
}

// ─── Normalizador de Passeio/Atividade para NormalizedOffer ─────────────────
function mapApiActivityToNormalizedOffer(
  avail: any,
  agencyId: string,
  quoteRequestId: string,
  scenarioId: string,
) {
  const activityId =
    avail.id?.toString() || avail.key || `act-${crypto.randomUUID().substring(0, 8)}`;
  const name = avail.name || avail.tourName || "Passeio não identificado";
  const cityName = avail.city?.name || avail.destination?.name || "";
  const price = avail.lowestFare?.price?.amount || avail.price?.amount || avail.amount || 0;
  const currency = avail.lowestFare?.price?.currency || avail.price?.currency || "BRL";
  const images = avail.images?.map((img: any) => img.url || img.path || "").filter(Boolean) || [];

  return {
    id: crypto.randomUUID(),
    agencyId,
    providerCode: "infotravel",
    externalOfferId: activityId,
    searchScenarioId: scenarioId,
    productType: "activity",
    origin: [],
    destination: [{ code: avail.destination?.code?.toString() || "", name: cityName }],
    startAt: avail.date || avail.startDate || "",
    endAt: avail.date || avail.endDate || "",
    travelers: { adults: 2 },
    flights: [],
    accommodations: [],
    transfers: [],
    experiences: [
      {
        id: activityId,
        name,
        cityName,
        description: avail.longDescription || avail.description || name,
        duration: avail.duration || null,
        category: avail.category || avail.tourType || "Passeio",
        price,
        currency,
        images,
        rating: avail.rating || null,
      },
    ],
    insurances: [],
    tickets: [],
    pricing: {
      netPrice: price * 0.9,
      commission: price * 0.1,
      markup: 0,
      taxes: 0,
      totalPrice: price,
      currency,
    },
    policies: [],
    availability: { isAvailable: true },
    fetchedAt: new Date().toISOString(),
    status: "available",
  };
}

async function saveNormalizedOffers(
  supabaseAdmin: any,
  quoteRequestId: string,
  scenarioId: string,
  offers: any[],
) {
  if (offers.length === 0) return;
  const inserts = offers.map((o) => ({
    quote_request_id: quoteRequestId,
    scenario_id: scenarioId,
    provider: o.providerCode,
    external_offer_id: o.externalOfferId,
    product_type: o.productType,
    normalized_data: o,
    price_total: o.pricing.totalPrice,
    currency: o.pricing.currency,
    status: o.status,
  }));

  const { error } = await supabaseAdmin.from("normalized_offers").insert(inserts);

  if (error) {
    console.error("Erro ao salvar ofertas normalizadas:", error);
    throw error;
  }
}
