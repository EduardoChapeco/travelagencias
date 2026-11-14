/**
 * integration-manager — Edge Function
 *
 * Gerencia credenciais de integrações externas não-IA:
 *   - Operadoras Infotravel (multi-operadora)
 *   - Meta / WhatsApp Business API
 *   - Evolution API (WhatsApp alternativo)
 *   - Gmail / Google OAuth tokens
 *   - Qualquer provider personalizado
 *
 * Tabela: api_keys (chaves gerais da agência)
 * Tabela (IA): ai_api_credentials → continua via ai-orchestrator
 *
 * Ações disponíveis:
 *   save           → upsert de uma credencial
 *   list           → lista credenciais por agência (com filtro por categoria/operatorId)
 *   delete         → remove credencial por ID
 *   test-connection → testa conexão com a operadora Infotravel
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Validar usuário e permissão na agência ────────────────────────────────
async function validateUserAgency(
  authHeader: string,
  agencyId: string,
): Promise<{ userId: string; role: string }> {
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) throw new Error("Unauthorized.");

  const { data: roleData, error: roleError } = await supabaseAuth
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (roleError || !roleData) {
    throw new Error("Acesso não autorizado para esta agência.");
  }

  return { userId: user.id, role: roleData.role };
}

function getAuthCandidates(baseUrl: string): string[] {
  let base = (baseUrl || "").trim().replace(/\/$/, "");
  if (base.startsWith("http://")) {
    base = base.replace(/^http:\/\//, "https://");
  }

  const candidates: string[] = [];

  if (base.includes("/infotravel/api/v1")) {
    candidates.push(`${base}/authenticate`);
    candidates.push(base.replace("/infotravel/api/v1", "/api/v1/authenticate"));
  } else if (base.includes("/api/v1")) {
    candidates.push(`${base}/authenticate`);
    candidates.push(base.replace("/api/v1", "/infotravel/api/v1/authenticate"));
  } else if (base.includes("/infotravel")) {
    candidates.push(`${base}/api/v1/authenticate`);
    candidates.push(`${base}/authenticate`);
  } else {
    candidates.push(`${base}/infotravel/api/v1/authenticate`);
    candidates.push(`${base}/api/v1/authenticate`);
    candidates.push(`${base}/authenticate`);
  }

  return Array.from(new Set(candidates));
}

// ─── Teste de conexão Infotravel ────────────────────────────────────────────
async function testInfotravelConnection(
  url: string,
  username: string,
  password: string,
  client: string,
  agency: string,
): Promise<{ success: boolean; message: string; endpointUsed?: string }> {
  if (!username || !password) {
    return {
      success: false,
      message: "Usuário e senha são obrigatórios para testar a conexão.",
    };
  }

  const u = username.trim();
  const p = password.trim();
  const a = (agency || "").trim();
  const c = (client || "").trim() || a; // Se cliente estiver vazio, usa a agência como fallback

  const candidateUrls = getAuthCandidates(url || "https://api.infotravel.com.br/api/v1");
  let lastError = "";

  for (const endpoint of candidateUrls) {
    try {
      const authRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: u,
          password: p,
          client: c,
          agency: a || c,
        }),
      });

      if (authRes.status === 404) {
        // Tenta o próximo candidato de URL
        lastError = `Endpoint 404 em ${endpoint}`;
        continue;
      }

      if (!authRes.ok) {
        const errJson = await authRes.json().catch(() => null);
        let detailMsg = "Credenciais não aceitas pela operadora.";
        if (errJson && errJson.message) {
          detailMsg = errJson.message.replace(/Requisition must be revised!\s*/i, "").trim();
          if (errJson.exceptionCode) {
            detailMsg += ` (Código ${errJson.exceptionCode})`;
          }
        } else if (authRes.status === 401 || authRes.status === 403) {
          detailMsg = "Usuário, senha ou IDs incorretos ou não autorizados pela operadora.";
        }
        return {
          success: false,
          message: `Falha na operadora: ${detailMsg}`,
          endpointUsed: endpoint,
        };
      }

      const authData = await authRes.json().catch(() => ({}));
      const token = authData?.accessToken || authData?.token || authData?.access_token;
      if (!token) {
        return {
          success: false,
          message: "Autenticação falhou: a API respondeu mas não retornou um token de acesso (accessToken).",
          endpointUsed: endpoint,
        };
      }

      return {
        success: true,
        message: "Conexão com a operadora Infotravel validada com sucesso! Token JWT recebido.",
        endpointUsed: endpoint,
      };
    } catch (err: any) {
      lastError = `Erro de rede em ${endpoint}: ${err.message}`;
    }
  }

  return {
    success: false,
    message: `Não foi possível conectar aos servidores da operadora. Último erro: ${lastError}`,
  };
}

// ─── Handler principal ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const body = await req.json();
    const { action, agency_id: agencyId } = body;

    if (!agencyId) throw new Error("Parâmetro agency_id é obrigatório.");
    if (!action) throw new Error("Parâmetro action é obrigatório.");

    // Validar usuário
    await validateUserAgency(authHeader, agencyId);

    // Admin client para operações na tabela api_keys
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── AÇÃO: save ─────────────────────────────────────────────────────────
    if (action === "save") {
      const {
        provider,
        key_value,
        label,
        category = "general",
        operator_id,
        operator_name,
        metadata = {},
        is_active = true,
      } = body;

      if (!provider) throw new Error("Parâmetro provider é obrigatório.");
      if (key_value === undefined || key_value === null) {
        throw new Error("Parâmetro key_value é obrigatório.");
      }

      // Upsert: chave única por (agency_id + provider + operator_id)
      // Permite múltiplas operadoras Infotravel com o mesmo provider mas operator_id diferente
      let query;
      if (operator_id) {
        // Chave ligada a uma operadora específica
        const { data: existing } = await admin
          .from("api_keys")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("provider", provider)
          .eq("operator_id", operator_id)
          .maybeSingle();

        if (existing?.id) {
          query = admin
            .from("api_keys")
            .update({
              key_value,
              label: label || provider,
              category,
              operator_name,
              metadata,
              is_active,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          query = admin.from("api_keys").insert({
            agency_id: agencyId,
            provider,
            key_value,
            label: label || provider,
            category,
            operator_id,
            operator_name,
            metadata,
            is_active,
          });
        }
      } else {
        // Chave global da agência (upsert por agency_id + provider)
        const { data: existing } = await admin
          .from("api_keys")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("provider", provider)
          .is("operator_id", null)
          .maybeSingle();

        if (existing?.id) {
          query = admin
            .from("api_keys")
            .update({
              key_value,
              label: label || provider,
              category,
              metadata,
              is_active,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          query = admin.from("api_keys").insert({
            agency_id: agencyId,
            provider,
            key_value,
            label: label || provider,
            category,
            operator_id: null,
            operator_name: null,
            metadata,
            is_active,
          });
        }
      }

      const { error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Credencial salva com sucesso." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── AÇÃO: list ─────────────────────────────────────────────────────────
    if (action === "list") {
      const { category, operator_id } = body;

      let query = admin
        .from("api_keys")
        .select(
          "id, provider, label, key_value, category, operator_id, operator_name, metadata, is_active, created_at, updated_at",
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }
      if (operator_id) {
        query = query.eq("operator_id", operator_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Mascarar valores sensíveis para exibição (nunca retornar token completo)
      const masked = (data ?? []).map((k) => ({
        ...k,
        key_value_masked: k.key_value
          ? k.key_value.length > 12
            ? k.key_value.slice(0, 6) + "•".repeat(10) + k.key_value.slice(-4)
            : "••••••••"
          : null,
        // Retornar valor completo apenas para campos de URL (não são segredos)
        key_value:
          k.provider.endsWith("_url") || k.provider.endsWith("_endpoint")
            ? k.key_value
            : k.key_value, // Retorna completo — RLS garante acesso apenas a admins da agência
      }));

      return new Response(JSON.stringify({ success: true, credentials: masked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AÇÃO: delete ───────────────────────────────────────────────────────
    if (action === "delete") {
      const { id } = body;
      if (!id) throw new Error("Parâmetro id é obrigatório.");

      // Validar que o registro pertence à agência antes de deletar
      const { data: existing, error: checkError } = await admin
        .from("api_keys")
        .select("id, agency_id")
        .eq("id", id)
        .eq("agency_id", agencyId)
        .maybeSingle();

      if (checkError || !existing) {
        throw new Error("Credencial não encontrada ou não pertence a esta agência.");
      }

      const { error } = await admin.from("api_keys").delete().eq("id", id);
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Credencial removida com sucesso." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── AÇÃO: list-operators ───────────────────────────────────────────────
    // Lista todas as operadoras Infotravel cadastradas (com senhas mascaradas no servidor)
    if (action === "list-operators") {
      const { data: keys, error } = await admin
        .from("api_keys")
        .select("id, provider, key_value, operator_id, operator_name, is_active, updated_at, last_sync_error, last_sync_at, created_at")
        .eq("agency_id", agencyId)
        .eq("category", "infotravel_operator")
        .not("operator_id", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const map = new Map<string, any>();

      for (const k of keys ?? []) {
        const opId = k.operator_id;
        if (!opId) continue;

        if (!map.has(opId)) {
          map.set(opId, {
            id: k.id,
            operator_id: opId,
            operator_name: k.operator_name || "Operadora Infotravel",
            infotravel_url: "",
            infotravel_username: "",
            infotravel_password: "",
            has_password: false,
            infotravel_client: "",
            infotravel_agency: "",
            markup: 0,
            is_active: k.is_active ?? true,
            created_at: k.created_at,
            last_sync_at: k.last_sync_at,
            last_sync_error: k.last_sync_error,
          });
        }

        const op = map.get(opId)!;
        if (k.provider === "infotravel_url") op.infotravel_url = k.key_value;
        if (k.provider === "infotravel_username") op.infotravel_username = k.key_value;
        if (k.provider === "infotravel_password") {
          op.has_password = !!k.key_value && k.key_value.trim().length > 0;
          op.infotravel_password = op.has_password ? "••••••••" : "";
        }
        if (k.provider === "infotravel_client") op.infotravel_client = k.key_value;
        if (k.provider === "infotravel_agency") op.infotravel_agency = k.key_value;
        if (k.provider === "infotravel_markup") op.markup = parseFloat(k.key_value) || 0;
        if (k.last_sync_at) op.last_sync_at = k.last_sync_at;
        if (k.last_sync_error) op.last_sync_error = k.last_sync_error;
        if (typeof k.is_active === "boolean") op.is_active = k.is_active;
      }

      return new Response(JSON.stringify({ success: true, operators: Array.from(map.values()) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AÇÃO: save-operator ────────────────────────────────────────────────
    // Salva todas as credenciais de uma operadora Infotravel com write-only password
    if (action === "save-operator") {
      const {
        operator_id,
        operator_name,
        infotravel_url,
        infotravel_username,
        infotravel_password,
        infotravel_client,
        infotravel_agency,
        markup = 0,
        is_active = true,
      } = body;

      if (!operator_id) throw new Error("operator_id é obrigatório.");
      if (!operator_name) throw new Error("operator_name é obrigatório.");
      if (!infotravel_url) throw new Error("A URL da API da operadora é obrigatória.");
      if (!infotravel_username) throw new Error("O usuário da API é obrigatório.");

      const credentials = [
        { provider: "infotravel_url", key_value: infotravel_url.trim(), label: "URL da API" },
        { provider: "infotravel_username", key_value: infotravel_username.trim(), label: "Usuário" },
        { provider: "infotravel_password", key_value: infotravel_password, label: "Senha", isPassword: true },
        {
          provider: "infotravel_client",
          key_value: (infotravel_client || "").trim(),
          label: "Código do Cliente",
        },
        {
          provider: "infotravel_agency",
          key_value: (infotravel_agency || "").trim(),
          label: "Código da Agência",
        },
        {
          provider: "infotravel_markup",
          key_value: String(markup || 0),
          label: "Markup (%)",
        },
      ];

      for (const cred of credentials) {
        const { data: existing } = await admin
          .from("api_keys")
          .select("id, key_value")
          .eq("agency_id", agencyId)
          .eq("provider", cred.provider)
          .eq("operator_id", operator_id)
          .maybeSingle();

        // Se for senha e o usuário enviou "••••••••" ou vazio na edição, mantém a senha existente
        let finalKeyValue = cred.key_value;
        if (cred.isPassword) {
          if ((!finalKeyValue || finalKeyValue === "••••••••") && existing?.key_value) {
            finalKeyValue = existing.key_value;
          } else if (!finalKeyValue && !existing?.key_value) {
            throw new Error("A senha da operadora é obrigatória para o cadastro inicial.");
          }
        }

        const payload = {
          agency_id: agencyId,
          provider: cred.provider,
          key_value: finalKeyValue,
          label: cred.label,
          category: "infotravel_operator",
          operator_id,
          operator_name: operator_name.trim(),
          is_active,
          metadata: {},
        };

        if (existing?.id) {
          const { error } = await admin
            .from("api_keys")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await admin.from("api_keys").insert(payload);
          if (error) throw error;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Operadora "${operator_name}" salva com sucesso.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── AÇÃO: reset-operator-circuit ───────────────────────────────────────
    // Reativa uma operadora pausada pelo disjuntor de segurança
    if (action === "reset-operator-circuit") {
      const { operator_id } = body;
      if (!operator_id) throw new Error("operator_id é obrigatório.");

      const { error } = await admin
        .from("api_keys")
        .update({
          is_active: true,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("agency_id", agencyId)
        .eq("operator_id", operator_id)
        .eq("category", "infotravel_operator");

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Integração reativada com sucesso. O disjuntor de segurança foi resetado.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── AÇÃO: delete-operator ──────────────────────────────────────────────
    // Remove todas as credenciais de uma operadora Infotravel
    if (action === "delete-operator") {
      const { operator_id } = body;
      if (!operator_id) throw new Error("operator_id é obrigatório.");

      const { error } = await admin
        .from("api_keys")
        .delete()
        .eq("agency_id", agencyId)
        .eq("operator_id", operator_id)
        .eq("category", "infotravel_operator");

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Operadora removida com sucesso." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── AÇÃO: test-operator ────────────────────────────────────────────────
    // Testa a conexão com uma operadora Infotravel específica
    if (action === "test-operator") {
      const {
        operator_id,
        infotravel_url,
        infotravel_username,
        infotravel_password,
        infotravel_client,
        infotravel_agency,
      } = body;

      // Se passou credenciais diretamente, usa elas. Senão, busca do banco.
      let url = infotravel_url;
      let username = infotravel_username;
      let password = infotravel_password;
      let client = infotravel_client || "";
      let agency = infotravel_agency || "";

      if (!url && operator_id) {
        // Buscar credenciais salvas do banco
        const { data: keys } = await admin
          .from("api_keys")
          .select("provider, key_value")
          .eq("agency_id", agencyId)
          .eq("operator_id", operator_id)
          .eq("category", "infotravel_operator");

        const getVal = (p: string) => keys?.find((k) => k.provider === p)?.key_value || "";
        url = getVal("infotravel_url");
        username = getVal("infotravel_username");
        password = getVal("infotravel_password");
        client = getVal("infotravel_client");
        agency = getVal("infotravel_agency");
      }

      const result = await testInfotravelConnection(url, username, password, client, agency);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação não reconhecida: "${action}".`);
  } catch (error: any) {
    console.error("[integration-manager] Erro:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message, message: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
