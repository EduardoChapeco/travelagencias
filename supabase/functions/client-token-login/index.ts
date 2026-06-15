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
    const { token, redirect_to } = await req.json();
    if (!token) throw new Error("Token de acesso não fornecido.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Localizar o cliente com o token e verificar expiração
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, email, user_id")
      .eq("login_token", token)
      .gt("login_token_expires_at", new Date().toISOString())
      .maybeSingle();

    if (clientErr || !client) {
      throw new Error("Link de login inválido, expirado ou já utilizado.");
    }

    if (!client.email) {
      throw new Error("Este cliente não possui e-mail cadastrado.");
    }

    // 2. Garantir que o usuário existe no auth.users
    let user_id = client.user_id;

    const {
      data: { users },
      error: listErr,
    } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    let authUser = users?.find((u) => u.email === client.email);

    if (!authUser) {
      // Criar usuário de autenticação para o cliente
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: client.email,
        email_confirm: true,
        user_metadata: { role: "client" },
      });
      if (createErr) throw createErr;
      authUser = createData.user;
    }

    // Vincular user_id se estiver nulo
    if (authUser && !client.user_id) {
      await supabaseAdmin.from("clients").update({ user_id: authUser.id }).eq("id", client.id);
      user_id = authUser.id;
    }

    // 3. Gerar link mágico de login
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: client.email,
      options: {
        redirectTo: redirect_to || `${supabaseUrl}/client`,
      },
    });

    if (linkErr) throw linkErr;

    // 4. Limpar o token para uso único
    await supabaseAdmin
      .from("clients")
      .update({ login_token: null, login_token_expires_at: null })
      .eq("id", client.id);

    // Retornar link de ação direta que autentica o usuário
    return new Response(
      JSON.stringify({
        action_link: linkData.properties.action_link,
        email: client.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Token Login Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
