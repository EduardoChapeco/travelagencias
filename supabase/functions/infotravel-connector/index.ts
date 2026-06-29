import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
    const { action, agencyId, operatorId, params = {} } = await req.json();
    if (!agencyId) throw new Error("Parâmetro agencyId é obrigatório.");

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

    // Cliente administrativo para obter as credenciais salvas em api_keys de forma segura
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Buscar credenciais da operadora — suporta multi-operadora via operatorId
    // Se operatorId foi passado, busca a operadora específica; senão, usa a primeira ativa
    let keysQuery = supabaseAdmin
      .from("api_keys")
      .select("provider, key_value, operator_id")
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
    } else {
      // Compatibilidade retroativa: busca por category OU operator_id nulo (formato legado)
      keysQuery = keysQuery.or(
        "category.eq.infotravel_operator,operator_id.is.null",
      );
    }

    const { data: allKeys } = await keysQuery;

    // Se múltiplos operadores, seleciona o primeiro ativo quando nenhum operatorId foi especificado
    let keys = allKeys ?? [];
    if (!operatorId && keys.length > 0) {
      // Prefere registros com operator_id definido (novo formato) sobre os legados (null)
      const withOperator = keys.filter((k) => k.operator_id);
      if (withOperator.length > 0) {
        const firstOpId = withOperator[0].operator_id;
        keys = withOperator.filter((k) => k.operator_id === firstOpId);
      }
    }

    const getVal = (provider: string) =>
      keys?.find((k) => k.provider === provider)?.key_value || "";

    const url = getVal("infotravel_url") || "http://api.infotravel.com.br/api/v1";
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
      // Retorno estruturado (não uma exceção) — o frontend interpreta este código
      // para exibir o estado "API não configurada" sem exibir erros técnicos ao operador.
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "CREDENTIALS_NOT_CONFIGURED",
          error: "As credenciais de acesso ao GDS Infotravel ainda não foram configuradas para esta agência. Acesse Configurações → Conexões → Infotravel para inserir suas credenciais de produção.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // 200 intencional: o frontend deve ler o error_code, não o status HTTP
        },
      );
    }

    // Autenticar na API real do GDS
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
          mapApiTransferToNormalizedOffer(avail, agencyId, params.quoteRequestId, params.scenarioId),
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
          mapApiActivityToNormalizedOffer(avail, agencyId, params.quoteRequestId, params.scenarioId),
        );
        await saveNormalizedOffers(supabaseAdmin, params.quoteRequestId, params.scenarioId, offers);
        result = { success: true, offers, total: offers.length };
      } else {
        result = rawData;
      }
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
    } else {
      throw new Error(`Ação não reconhecida: "${action}". Verifique a documentação do conector.`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[infotravel-connector] Erro:", error);

    // Traduzir erros técnicos em mensagens comerciais inteligíveis
    let userMessage = error.message || "Ocorreu um erro inesperado ao processar sua solicitação.";

    if (userMessage.includes("401") || userMessage.includes("Unauthorized") || userMessage.includes("autenticação")) {
      userMessage = "As credenciais do Infotravel são inválidas ou expiraram. Verifique seu usuário e senha nas configurações de integração.";
    } else if (userMessage.includes("403") || userMessage.includes("Forbidden")) {
      userMessage = "Acesso negado pelo GDS. Verifique se sua conta possui as permissões de API ativadas.";
    } else if (userMessage.includes("429") || userMessage.includes("rate limit") || userMessage.includes("Too Many")) {
      userMessage = "Limite de requisições atingido no GDS. Aguarde alguns minutos e tente novamente.";
    } else if (userMessage.includes("500") || userMessage.includes("502") || userMessage.includes("503") || userMessage.includes("504")) {
      userMessage = "O servidor do GDS Infotravel está temporariamente indisponível. Tente novamente em instantes.";
    } else if (userMessage.includes("fetch") || userMessage.includes("network") || userMessage.includes("ECONNREFUSED")) {
      userMessage = "Não foi possível conectar ao servidor do GDS Infotravel. Verifique a URL de acesso nas configurações de integração.";
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        error_code: "API_ERROR",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
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

// ─── Efetuar login no GDS Infotravel para obter JWT token ───────────────────
async function authenticateInfotravel(
  url: string,
  u: string,
  p: string,
  c: string,
  a: string,
): Promise<string> {
  const loginUrl = resolveUrl(url, "/api/v1/authenticate");
  try {
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p, client: c, agency: a }),
    });

    if (!res.ok) {
      throw new Error(`Código de status HTTP ${res.status} ao autenticar.`);
    }
    const data = await res.json();
    const token = data.accessToken || data.token;
    if (!token) throw new Error("Token de autenticação não retornado pela API.");
    return token;
  } catch (err: any) {
    throw new Error(`Falha na autenticação da Infotravel: ${err.message}`);
  }
}

// ─── Chamadas reais para a API da Infotravel ──────────────────────────────
async function fetchRealHotels(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/hotel"));

  if (params.checkin) targetUrl.searchParams.append("start", params.checkin);
  if (params.checkout) targetUrl.searchParams.append("end", params.checkout);

  if (params.city) {
    const destCode = parseInt(params.city);
    if (!isNaN(destCode)) {
      targetUrl.searchParams.append("destination", destCode.toString());
    } else {
      targetUrl.searchParams.append("destination", "14");
    }
  }

  targetUrl.searchParams.append("occupancy", "2");

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha na consulta de disponibilidade de hotéis (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`);
  }
  return await res.json();
}

async function fetchRealFlights(url: string, token: string, params: any) {
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/flight"));

  if (params.origin) targetUrl.searchParams.append("origin", params.origin);
  if (params.destination) targetUrl.searchParams.append("destination", params.destination);
  if (params.date) {
    targetUrl.searchParams.append("start", params.date);
    targetUrl.searchParams.append("end", params.date);
  }
  targetUrl.searchParams.append("occupancy", "1");

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha na consulta de disponibilidade de voos (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`);
  }
  return await res.json();
}

// ─── Busca real de Traslados/Transfers ────────────────────────────────────────
async function fetchRealTransfers(url: string, token: string, params: any) {
  // Endpoint de traslados conforme documentação Infotravel OpenAPI (service/tour/avail)
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/transfer"));

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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha na consulta de traslados (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`);
  }
  return await res.json();
}

// ─── Busca real de Passeios/Atividades ───────────────────────────────────────
async function fetchRealActivities(url: string, token: string, params: any) {
  // Endpoint de passeios/tours conforme documentação Infotravel OpenAPI
  const targetUrl = new URL(resolveUrl(url, "/api/v1/avail/tour"));

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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha na consulta de passeios e atividades (HTTP ${res.status}). ${body ? `Detalhe: ${body.substring(0, 200)}` : ""}`);
  }
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
  const transferId = avail.id?.toString() || avail.key || `tr-${crypto.randomUUID().substring(0, 8)}`;
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
  const activityId = avail.id?.toString() || avail.key || `act-${crypto.randomUUID().substring(0, 8)}`;
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
