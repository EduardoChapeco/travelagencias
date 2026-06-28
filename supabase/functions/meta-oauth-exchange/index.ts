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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Validar payload de entrada
    const { code, agency_id, config_id } = await req.json();
    if (!code || !agency_id) {
      throw new Error("Parâmetros inválidos: code e agency_id são obrigatórios.");
    }

    // 2. Buscar segredo do Meta App nas variáveis de ambiente
    const clientSecret = Deno.env.get("META_APP_SECRET");
    if (!clientSecret) {
      throw new Error("Configuração ausente no servidor: META_APP_SECRET não definido.");
    }

    // 3. Obter o Meta App ID configurado para a agência
    const { data: agency, error: agencyErr } = await supabase
      .from("agencies")
      .select("integrations_config")
      .eq("id", agency_id)
      .single();

    if (agencyErr || !agency) {
      throw new Error("Agência não localizada ou erro ao ler configurações.");
    }

    const config = (agency.integrations_config as any) || {};
    const appId = config.meta_app_id;
    if (!appId) {
      throw new Error("ID do Aplicativo Meta (App ID) não configurado nesta agência.");
    }

    // 4. Trocar o authorization code pelo access token de longa duração
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${clientSecret}&code=${code}&redirect_uri=`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      throw new Error(`Erro na troca de código na Meta: ${tokenData.error?.message || "Erro desconhecido"}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("Nenhum access token retornado pela Meta.");
    }

    // 5. Descobrir ativos autorizados (WABAs e números)
    // Faz a consulta das WABAs vinculadas à agência
    const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${clientSecret}`;
    const debugRes = await fetch(debugTokenUrl);
    const debugData = await debugRes.json();
    
    if (!debugRes.ok || debugData.error) {
      throw new Error("Falha ao validar token com a Meta.");
    }

    const targetWabaId = debugData.data?.profile_id || "";

    // 6. Criar ou Atualizar a Conexão Meta na tabela canônica
    const { data: connection, error: connErr } = await supabase
      .from("whatsapp_connections")
      .upsert({
        agency_id,
        connection_name: `WhatsApp Oficial (${targetWabaId || "Nova Conexão"})`,
        waba_id: targetWabaId,
        phone_number_id: "pending",
        display_phone_number: "pending",
        app_id: appId,
        status: "active",
        provider: "whatsapp",
        connection_mode: "whatsapp_cloud_api",
        scopes_authorized: debugData.data?.scopes || [],
      }, { onConflict: "id" })
      .select()
      .single();

    if (connErr) {
      throw new Error(`Erro ao persistir conexão no banco: ${connErr.message}`);
    }

    // 7. Salvar o token de acesso na tabela channels correspondente
    const { error: channelErr } = await supabase
      .from("channels")
      .upsert({
        agency_id,
        type: "whatsapp",
        display_name: `WhatsApp Oficial (${targetWabaId || "Meta"})`,
        external_id: targetWabaId || "pending",
        is_active: true,
      }, { onConflict: "id" });

    if (channelErr) {
      throw new Error(`Erro ao registrar canal: ${channelErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, connection_id: connection.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
