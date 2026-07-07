import { supabase } from "@/integrations/supabase/client";

export type Flight = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  stops: number;
  baggage_rules: string;
  price: number;
};
export type HotelRoom = { type: string; qty: number };
export type Hotel = {
  id: string;
  name: string;
  city: string;
  checkin: string;
  checkout: string;
  meal_plan: string;
  rooms: HotelRoom[];
  images: string[];
  price: number;
};
export type Transfer = {
  id: string;
  description: string;
  date: string;
  type: "private" | "shared";
  vehicle: string;
  price: number;
  notes: string;
};
export type Insurance = {
  provider?: string | null; // Ex: "Assist Card", "Allianz"
  policy?: string | null; // Número da apólice
  plan?: string | null; // Nome do plano (ex: "Premium Internacional")
  price?: number | null; // Preço de venda ao cliente
  cost?: number | null; // Custo da agência
  coverage?: string | null; // Descrição da cobertura
  start_date?: string | null;
  end_date?: string | null;
};

export type Tour = {
  id: string;
  description: string;
  date: string;
  price: number; // Preço padrão (adulto)
  price_child?: number | null; // Preço criança (se diferente)
  price_senior?: number | null; // Preço sênior (se diferente)
  image_url: string;
  notes: string;
};
export type ItineraryDay = { 
  id: string; 
  day: string; 
  title: string; 
  description: string;
  images?: string[];
  imageLayout?: string;
  meals?: string[];
  overnight?: string;
  city?: string;
};

export type Proposal = {
  id: string;
  number: number;
  title: string;
  status: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_seniors: number;
  pax_children: number;
  pax_infants: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  public_token: string;
  agency_id: string;
  flights: Flight[];
  hotels: Hotel[];
  transfers: Transfer[];
  tours: Tour[];
  itinerary: ItineraryDay[];
  includes: string[];
  excludes: string[];
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  template: string;
  cover_image_url?: string | null;
  map_image_url?: string | null;
  agent_name?: string | null;
  agent_photo_url?: string | null;
  agent_whatsapp?: string | null;
  custom_payments?: any[] | null;
  waypoints?: any[] | null;
  extra_pages?: any[] | null;
  canvas_format?: string;
  cover_prompt?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  is_public_template?: boolean;
  insurance?: Insurance | null;
};

export async function fetchProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Proposal | null;
}

export async function updateProposal(id: string, patch: Partial<Proposal>) {
  const { error } = await supabase
    .from("proposals")
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

export async function recalculateProposal(id: string) {
  const { error } = await (supabase.rpc as any)("recalculate_proposal_totals", {
    _proposal_id: id,
  });
  if (error) throw error;
}

export async function processOcrFile(file: File, proposal_id?: string, agency_id?: string) {
  const maxRetries = 2;
  const timeoutMs = 45000; // 45 seconds timeout for heavy Vision OCR files

  const executeOcrWithRetry = async (
    attempt: number = 1,
  ): Promise<{
    flights?: Flight[];
    hotels?: Hotel[];
    transfers?: Transfer[];
    tours?: Tour[];
    itinerary?: ItineraryDay[];
    includes?: string[];
    excludes?: string[];
    emergency_contacts?: any[];
    insurance?: any;
    destination?: string;
    pax?: string[];
    locator?: string;
    notes?: string;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          let filePathRef: string | undefined = undefined;
          
          try {
            const fileExt = file.name.split(".").pop();
            const tempPath = `ocr_temp/${crypto.randomUUID()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("proposals_exports_bucket")
              .upload(tempPath, file);
              
            if (!uploadError && uploadData) {
              filePathRef = `proposals_exports_bucket/${tempPath}`;
            } else {
              console.warn("Storage upload failed, falling back to base64:", uploadError);
            }
          } catch (storageErr) {
            console.warn("Storage upload exception, falling back to base64:", storageErr);
          }

          const base64 = filePathRef ? undefined : (reader.result as string).split(",")[1];
          
          const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
            body: {
              action: "completion",
              feature: "ocr_proposal",
              file_path: filePathRef,
              file_base64: base64,
              mime: file.type,
              file_name: file.name,
              proposal_id,
              agency_id,
            },
          });
          clearTimeout(timeoutId);

          if (error) {
            throw new Error(error.message || "Erro retornado pela Edge Function de OCR");
          }
          let parsedResult = data?.result ?? {};
          if (typeof parsedResult === "string") {
            try {
              const cleaned = parsedResult.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
              parsedResult = JSON.parse(cleaned);
            } catch (e) {
              console.warn("Falha no parse fallback de OCR:", e);
            }
          }
          resolve(parsedResult);
        } catch (err: any) {
          clearTimeout(timeoutId);
          const isTimeout = err.name === "AbortError";
          const errorMessage = isTimeout
            ? "O processamento do arquivo de proposta excedeu o tempo limite de 45s. Tente novamente ou use um arquivo menor."
            : err.message || "Erro desconhecido durante a leitura OCR.";

          console.warn(`[OCR Proposal Attempt ${attempt} failed]:`, errorMessage);

          if (attempt < maxRetries && !isTimeout) {
            const backoff = attempt * 2000;
            console.warn(`Retrying OCR in ${backoff}ms...`);
            setTimeout(() => {
              executeOcrWithRetry(attempt + 1).then(resolve, reject);
            }, backoff);
          } else {
            reject(new Error(errorMessage));
          }
        }
      };
      reader.onerror = () => reject(new Error("Erro físico de leitura do arquivo no browser."));
      reader.readAsDataURL(file);
    });
  };

  return executeOcrWithRetry(1);
}

export type UnsplashPhoto = {
  id: string;
  url_regular: string;
  url_full: string;
  url_thumb: string;
  photographer: string;
  photographer_url: string;
  alt: string;
};

export async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const { data, error } = await supabase.functions.invoke("search-unsplash", {
    body: { query },
  });
  if (error) throw error;
  return data?.photos || [];
}

export async function refineItineraryText(
  title: string,
  description: string,
): Promise<{ title: string; description: string }> {
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      action: "completion",
      prompt: `Melhore este trecho de roteiro de viagem. Torne mais atrativo, luxuoso e vendedor.\n\nTítulo: ${title}\nDescrição: ${description}\n\nRetorne EXATAMENTE um JSON com as chaves "title" e "description". Sem markdown.`,
      systemPrompt: "Você é um copywriter de turismo premium. Retorne apenas JSON.",
      modelPreference: "smart",
    },
  });
  if (error) throw error;
  const text = data?.result || "";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : text);
  return { title: parsed.title || title, description: parsed.description || description };
}

export interface CreateProposalPayload {
  title: string;
  destination?: string;
  client_id?: string;
  lead_id?: string;
  travel_start?: string;
  travel_end?: string;
  pax_adults: number;
  pax_seniors?: number;
  pax_children: number;
  pax_infants: number;
  currency: string;
  valid_until?: string;
  notes?: string;
  visibility?: "private" | "agency" | "public";
  group_tour_id?: string | null;
}

export async function createProposal(
  agencyId: string,
  payload: CreateProposalPayload,
  ownerId?: string | null,
): Promise<{ id: string }> {
  const insertData = {
    agency_id: agencyId,
    title: payload.title,
    destination: payload.destination || null,
    client_id: payload.client_id || null,
    lead_id: payload.lead_id || null,
    travel_start: payload.travel_start || null,
    travel_end: payload.travel_end || null,
    pax_adults: payload.pax_adults,
    pax_seniors: payload.pax_seniors ?? 0,
    pax_children: payload.pax_children,
    pax_infants: payload.pax_infants,
    currency: payload.currency || "BRL",
    valid_until: payload.valid_until || null,
    notes: payload.notes || null,
    visibility: payload.visibility || "private",
    owner_id: ownerId || null,
    is_public_template: false,
    group_tour_id: payload.group_tour_id || null,
    // Safely enforce defaults for JSONB NOT NULL fields
    flights: [],
    hotels: [],
    transfers: [],
    tours: [],
    itinerary: [],
    includes: [],
    excludes: [],
  };

  const { data, error } = await supabase
    .from("proposals")
    .insert(insertData as any)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Log activity
  await logProposalActivity(data.id, agencyId, "created", { title: payload.title });

  return data as { id: string };
}

export async function fetchProposalsList(
  agencyId: string,
  page: number,
  pageSize: number,
  options?: { search?: string; status?: string },
): Promise<{ data: any[]; count: number }> {
  let query = supabase
    .from("proposals")
    .select(
      "id, number, title, status, destination, travel_start, travel_end, total, currency, created_at, valid_until, client_id, public_token, visibility, is_public_template, client:clients(id, full_name), lead:leads!proposals_lead_id_fkey(id, name)",
      { count: "exact" },
    )
    .eq("agency_id", agencyId)
    .is("deleted_at", null);

  if (options?.search) {
    query = query.ilike("title", `%${options.search}%`);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status as any);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchClientsPick(agencyId: string, search?: string) {
  let q = supabase
    .from("clients")
    .select("id, full_name")
    .eq("agency_id", agencyId)
    .order("full_name");

  if (search) {
    q = q.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await q.limit(search ? 50 : 200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchLeadsPick(agencyId: string, search?: string) {
  let q = supabase
    .from("leads")
    .select("id, name")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (search) {
    q = q.ilike("name", `%${search}%`);
  }

  const { data, error } = await q.limit(search ? 50 : 200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function duplicateProposal(proposalId: string): Promise<{ id: string }> {
  // Fetch existing proposal
  const existing = await fetchProposal(proposalId);
  if (!existing) throw new Error("Proposta não encontrada para duplicação");

  // Create a payload without the id, public_token, created_at, etc.
  const insertData = {
    ...existing,
    title: `${existing.title} (Cópia)`,
    status: "draft",
    decided_at: null,
    viewed_at: null,
  };

  delete (insertData as any).id;
  delete (insertData as any).public_token;
  delete (insertData as any).created_at;
  delete (insertData as any).updated_at;

  const { data, error } = await supabase
    .from("proposals")
    .insert(insertData as any)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Log duplication activity
  await logProposalActivity(data.id, existing.agency_id, "created", {
    title: `${existing.title} (Cópia)`,
    duplicated_from: proposalId,
  });

  return data as { id: string };
}

export async function deleteProposal(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from("proposals")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", proposalId);

  if (error) throw new Error(error.message);
}

/**
 * Generate PDF via Supabase Edge Function (Puppeteer / high quality).
 * Returns the public URL of the generated PDF stored in proposals-exports bucket.
 */
export async function generateProposalPdfViaServer(
  proposalId: string,
  agencyId: string,
  format: string = "A4",
  landscape: boolean = false,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-proposal-pdf", {
    body: { proposal_id: proposalId, agency_id: agencyId, format, landscape },
  });
  if (error) throw new Error(error.message ?? "Erro ao gerar PDF no servidor");
  const url = data?.pdf_url || data?.url;
  if (!url) throw new Error("PDF gerado, mas URL não retornada pelo servidor");
  return url as string;
}

/**
 * Suggest includes and excludes list via AI based on proposal destination, hotels, flights, tours.
 */
export async function suggestIncludesExcludesViaAI(
  proposal: Proposal,
): Promise<{ includes: string[]; excludes: string[] }> {
  const hotelsText = proposal.hotels?.map((h) => h.name).join(", ") || "nenhum";
  const flightsText =
    proposal.flights?.map((f) => `${f.origin}/${f.destination}`).join(", ") || "nenhum";
  const transfersText = proposal.transfers?.length
    ? `${proposal.transfers.length} transfers`
    : "nenhum";
  const toursText = proposal.tours?.map((t) => t.description).join(", ") || "nenhum";

  const prompt = `Com base na seguinte proposta de viagem:
- Destino: ${proposal.destination || "Vários destinos"}
- Hotéis: ${hotelsText}
- Voos: ${flightsText}
- Transfers: ${transfersText}
- Passeios: ${toursText}

Sugira uma lista de itens que normalmente estariam incluídos nesta viagem e itens comumente excluídos.
Retorne EXATAMENTE um JSON com as chaves "includes" e "excludes", que são arrays de strings (com frases curtas, ex: "Hospedagem com café da manhã", "Seguro viagem", "Passeios opcionais"). Retorne apenas o JSON.`;

  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      action: "completion",
      prompt,
      systemPrompt: "Você é um consultor de viagens experiente e premium. Retorne apenas JSON.",
      modelPreference: "smart",
    },
  });

  if (error) throw error;
  const text = data?.result || "";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : text);
  return {
    includes: Array.isArray(parsed.includes) ? parsed.includes : [],
    excludes: Array.isArray(parsed.excludes) ? parsed.excludes : [],
  };
}

export interface ProposalHistoryEntry {
  id: string;
  proposal_id: string;
  agency_id: string;
  agent_id: string | null;
  action: string;
  details: any;
  created_at: string;
}

export async function logProposalActivity(
  proposalId: string,
  agencyId: string,
  action: string,
  details: any = {},
  agentId?: string | null,
): Promise<void> {
  const insertData: any = {
    proposal_id: proposalId,
    agency_id: agencyId,
    action,
    details: details || {},
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    insertData.agent_id = user.id;
    if (!insertData.details.agent_name) {
      insertData.details.agent_name = user.user_metadata?.full_name || user.email;
    }
  }

  const { error } = await supabase.from("proposal_history").insert(insertData);
  if (error) {
    console.error("Failed to log proposal activity:", error);
  }
}

export async function fetchProposalHistory(proposalId: string): Promise<ProposalHistoryEntry[]> {
  const { data, error } = await supabase
    .from("proposal_history")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}
