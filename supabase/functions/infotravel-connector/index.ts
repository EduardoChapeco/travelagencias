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
    } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized.");

    // Obter payload
    const { action, agencyId, params = {} } = await req.json();
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

    const { data: keys } = await supabaseAdmin
      .from("api_keys")
      .select("provider, key_value")
      .eq("agency_id", agencyId)
      .in("provider", [
        "infotravel_url",
        "infotravel_username",
        "infotravel_password",
        "infotravel_client",
        "infotravel_agency",
      ]);

    const getVal = (provider: string) =>
      keys?.find((k) => k.provider === provider)?.key_value || "";

    const url = getVal("infotravel_url") || "http://api.infotravel.com.br/api/v1";
    const username = getVal("infotravel_username");
    const password = getVal("infotravel_password");
    const client = getVal("infotravel_client");
    const agency = getVal("infotravel_agency");

    // Verificar se as credenciais existem ou se estamos no modo simulação
    const isMock =
      !username ||
      !password ||
      username.toLowerCase() === "test" ||
      username.toLowerCase() === "sandbox";

    if (isMock) {
      const responseData = simulateInfotravelResponse(action, params);
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se houver credenciais reais, efetuar a chamada HTTP real
    const token = await authenticateInfotravel(url, username, password, client, agency);

    let result;
    if (action === "test_connection") {
      result = { success: true, message: "Conexão com a API Infotravel estabelecida!" };
    } else if (action === "search_hotels") {
      result = await fetchRealHotels(url, token, params);
    } else if (action === "search_flights") {
      result = await fetchRealFlights(url, token, params);
    } else if (action === "import_booking") {
      result = await fetchRealBooking(url, token, params);
    } else {
      throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no infotravel-connector:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// ─── Efetuar login no GDS Infotravel para obter JWT token ───────────────────
async function authenticateInfotravel(
  url: string,
  u: string,
  p: string,
  c: string,
  a: string,
): Promise<string> {
  const loginUrl = `${url.replace(/\/$/, "")}/auth/login`;
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
    if (!data.token) throw new Error("Token de autenticação não retornado pela API.");
    return data.token;
  } catch (err: any) {
    throw new Error(`Falha na autenticação da Infotravel: ${err.message}`);
  }
}

// ─── Chamadas reais para a API da Infotravel ──────────────────────────────
async function fetchRealHotels(url: string, token: string, params: any) {
  const res = await fetch(`${url}/search/hotel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Erro na busca de hotéis da Infotravel.");
  return await res.json();
}

async function fetchRealFlights(url: string, token: string, params: any) {
  const res = await fetch(`${url}/search/flight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Erro na busca de voos da Infotravel.");
  return await res.json();
}

async function fetchRealBooking(url: string, token: string, params: any) {
  const { bookingId } = params;
  if (!bookingId) throw new Error("bookingId é obrigatório para importação.");

  const res = await fetch(`${url}/booking/${bookingId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Erro ao buscar a reserva #${bookingId} no Infotravel.`);
  return await res.json();
}

// ─── Simulador de respostas do Infotravel (Modo Sandbox/Demonstração) ────────
function simulateInfotravelResponse(action: string, params: any) {
  if (action === "test_connection") {
    return { success: true, message: "Conectado ao simulador de Sandbox da Infotravel!" };
  }

  if (action === "search_hotels") {
    const city = params.city || "Nova York";
    const checkin = params.checkin || "2026-07-01";
    const checkout = params.checkout || "2026-07-08";

    // Simulação inteligente de hotéis com imagens profissionais e regimes
    return {
      hotels: [
        {
          id: "info-h-1",
          name: `Grand Palace Resort ${city}`,
          city: city,
          checkin: checkin,
          checkout: checkout,
          meal_plan: "Café da Manhã",
          rooms: [{ type: "Suíte Luxo Vista Mar", qty: 1 }],
          images: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          ],
          price: 1850.0,
        },
        {
          id: "info-h-2",
          name: `Editorial Boutique Hotel ${city}`,
          city: city,
          checkin: checkin,
          checkout: checkout,
          meal_plan: "Somente Hospedagem",
          rooms: [{ type: "Quarto Standard Double", qty: 1 }],
          images: [
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
          ],
          price: 920.0,
        },
        {
          id: "info-h-3",
          name: `All Inclusive Premium Haven`,
          city: city,
          checkin: checkin,
          checkout: checkout,
          meal_plan: "All Inclusive",
          rooms: [{ type: "Bangalô Família", qty: 1 }],
          images: [
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
          ],
          price: 3400.0,
        },
      ],
    };
  }

  if (action === "search_flights") {
    const origin = params.origin || "GRU";
    const destination = params.destination || "MIA";
    const date = params.date || "2026-07-01";

    return {
      flights: [
        {
          id: "info-f-1",
          origin,
          destination,
          date,
          departure_time: "10:30",
          arrival_time: "18:45",
          airline: "Latam Airlines",
          flight_number: "LA-8190",
          stops: 0,
          baggage_rules: "Inclui 1 mala de mão de 10kg + 1 mala despachada de 23kg",
          price: 2450.0,
        },
        {
          id: "info-f-2",
          origin,
          destination,
          date,
          departure_time: "22:15",
          arrival_time: "06:30",
          airline: "American Airlines",
          flight_number: "AA-906",
          stops: 1,
          baggage_rules: "Apenas item pessoal + mala de mão de 10kg",
          price: 1980.0,
        },
      ],
    };
  }

  if (action === "import_booking") {
    const bookingId = params.bookingId || "B-998877";
    return {
      booking_id: bookingId,
      locator: "PNR-INF123",
      destination: "Lisboa, Portugal",
      client_name: "Eduardo Silveira",
      client_cpf: "123.456.789-00",
      client_email: "eduardo@chapeco.com",
      client_phone: "+55 49 99999-8888",
      total_sale: 8900.0,
      flights: [
        {
          origin: "GRU",
          destination: "LIS",
          date: "2026-09-15",
          departure_time: "18:20",
          arrival_time: "08:15",
          airline: "TAP Air Portugal",
          flight_number: "TP-82",
          stops: 0,
          baggage_rules: "Bagagem de mão + 1 mala despachada 23kg",
          price: 4500.0,
        },
      ],
      hotels: [
        {
          name: "Altis Avenida Hotel Lisboa",
          city: "Lisboa",
          checkin: "2026-09-16",
          checkout: "2026-09-23",
          meal_plan: "Café da Manhã",
          rooms: [{ type: "Deluxe Vista Avenida", qty: 1 }],
          images: [
            "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80",
          ],
          price: 4400.0,
        },
      ],
      passengers: [
        {
          full_name: "Eduardo Silveira",
          document: "MG-12.345.678",
          document_type: "rg",
          birth_date: "1990-05-12",
          email: "eduardo@chapeco.com",
          phone: "+55 49 99999-8888",
        },
      ],
    };
  }

  throw new Error(`Ação desconhecida para o simulador: ${action}`);
}
