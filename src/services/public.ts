import { supabase } from "@/integrations/supabase/client";

export async function fetchPublicAgencyLayout(slug: string) {
  const { data: agency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: slug })
    .maybeSingle();
  if (!agency) return { agency: null, pages: [] };

  const { data: pages } = await supabase
    .from("portal_pages")
    .select("slug, title")
    .eq("agency_id", agency.id)
    .eq("is_published", true)
    .order("created_at");

  return { agency, pages: pages || [] };
}

export async function fetchPublicAgencyHome(slug: string) {
  const { data: agency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: slug })
    .maybeSingle();
  if (!agency) return { agency: null, company: null, tours: [], posts: [], homePage: null };

  const [company, tours, posts, homePage] = await Promise.all([
    supabase.from("company_profiles").select("*").eq("agency_id", agency.id).maybeSingle(),
    supabase
      .from("group_tours")
      .select("id, slug, title, destination, cover_image_url, base_price, departure_date")
      .eq("agency_id", agency.id)
      .eq("is_public", true)
      .in("status", ["open", "confirmed"])
      .order("departure_date")
      .limit(6),
    supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image_url, published_at")
      .eq("agency_id", agency.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    (supabase as any)
      .from("portal_pages")
      .select("blocks:published_blocks, seo:published_seo")
      .eq("agency_id", agency.id)
      .eq("slug", "home")
      .eq("is_published", true)
      .maybeSingle(),
  ]);

  return {
    agency,
    company: company.data,
    tours: tours.data || [],
    posts: posts.data || [],
    homePage: homePage.data,
  };
}

// ─── Agency (basic, for contact page) ───────────────────────────────────────
export async function fetchPublicAgencyBasic(slug: string) {
  const { data, error } = await (supabase as any)
    .from("agencies")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPublicAgencyPolicies() {
  const { data } = await (supabase as any)
    .from("policy_documents")
    .select("id, kind, version")
    .eq("is_published", true);
  return data || [];
}

// ─── Submit public lead (contact form) ───────────────────────────────────────
export async function submitPublicLead(payload: {
  agency_slug: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  destination?: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  pax_count: number;
  estimated_value: number;
  source: string;
  notes?: string | null;
}) {
  const { error } = await (supabase as any).rpc("submit_public_lead", {
    _agency_slug: payload.agency_slug,
    _name: payload.name,
    _email: payload.email ?? null,
    _phone: payload.phone ?? null,
    _destination: payload.destination ?? null,
    _travel_start: payload.travel_start ?? null,
    _travel_end: payload.travel_end ?? null,
    _pax_count: payload.pax_count,
    _estimated_value: payload.estimated_value,
    _source: payload.source,
    _notes: payload.notes ?? null,
  });
  if (error) throw error;
}

// ─── Dynamic CMS page ────────────────────────────────────────────────────────
export async function fetchPublicDynamicPage(agencySlug: string, pageSlug: string) {
  const { data: agency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: agencySlug })
    .maybeSingle();
  if (!agency) return { agency: null, page: null };

  const { data: page } = await (supabase as any)
    .from("portal_pages")
    .select("title:published_title, blocks:published_blocks, seo:published_seo")
    .eq("agency_id", agency.id)
    .eq("slug", pageSlug)
    .eq("is_published", true)
    .maybeSingle();

  return { agency, page };
}

export async function fetchPublicDynamicPageSeo(agencySlug: string, pageSlug: string) {
  try {
    const { data: agency } = await (supabase as any)
      .rpc("get_public_agency_by_slug", { _slug: agencySlug })
      .maybeSingle();
    if (!agency) return null;

    const { data: page } = await (supabase as any)
      .from("portal_pages")
      .select("seo:published_seo")
      .eq("agency_id", agency.id)
      .eq("slug", pageSlug)
      .eq("is_published", true)
      .maybeSingle();

    return (page?.seo as { meta_title?: string; meta_description?: string } | null) ?? null;
  } catch (error) {
    return { error };
  }
}

// ─── Forms ──────────────────────────────────────────────────────────────────
export async function fetchPublicLeadForm(agencySlug: string, formId: string) {
  const { data: rawAgency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: agencySlug })
    .maybeSingle();
  const agency = rawAgency as any;
  if (!agency) return null;
  const { data: rawForm } = await (supabase as any)
    .from("lead_forms")
    .select("*")
    .eq("id", formId)
    .eq("agency_id", agency.id)
    .eq("is_active", true)
    .maybeSingle();
  return rawForm ? { agency, form: rawForm } : null;
}

export async function submitPublicLeadForm(
  agencyId: string,
  formId: string,
  targetStageId: string,
  formSlug: string,
  values: any,
  submissionsCount: number,
) {
  const { data: leadData, error: leadErr } = await (supabase as any)
    .from("leads")
    .insert({
      agency_id: agencyId,
      name: values.name ?? "",
      email: values.email ?? "",
      phone: values.phone ?? "",
      destination: values.destination ?? null,
      source: `form:${formSlug}`,
      notes: Object.entries(values)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
      stage_id: targetStageId,
    })
    .select("id");

  if (!leadErr && leadData) {
    await (supabase as any)
      .from("lead_forms")
      .update({ submissions_count: submissionsCount + 1 })
      .eq("id", formId);
    return { error: null, leadId: leadData[0].id };
  }
  return { error: leadErr, leadId: null };
}

// ─── Tours ──────────────────────────────────────────────────────────────────
export async function fetchPublicTour(agencySlug: string, tourId: string) {
  const { data: rawAgency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: agencySlug })
    .maybeSingle();
  const agency = rawAgency as any;
  if (!agency) return null;

  const { data: tourData } = await (supabase as any)
    .from("group_tours")
    .select("*")
    .eq("id", tourId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  const tour = tourData as any;
  if (!tour) return { agency, tour: null, days: [], layout: null, assignedSeats: [] };

  const days = Array.isArray(tour.itinerary) ? tour.itinerary : [];
  let layout: any = null;
  let assignedSeats: string[] = [];

  if (tour.bus_layout_id) {
    const { data: l } = await (supabase as any)
      .from("bus_layouts")
      .select("*")
      .eq("id", tour.bus_layout_id)
      .maybeSingle();
    if (l) layout = l;
    const { data: assigned } = await (supabase as any)
      .from("group_tour_enrollments")
      .select("seat_number")
      .eq("group_tour_id", tourId)
      .not("seat_number", "is", null);
    assignedSeats = (assigned || [])
      .map((a: any) => a.seat_number)
      .filter((s: any): s is string => !!s);
  }

  return { agency, tour, days, layout, assignedSeats };
}

export async function enrollPublicTour(
  agencyId: string,
  tourId: string,
  values: {
    passenger_name: string;
    passenger_cpf?: string;
    email?: string;
    phone?: string;
    notes?: string;
  },
  selectedSeats: string[],
  unitPrice: number,
  pax: number,
  destination: string,
) {
  // 1. Enrollments
  const rows = (selectedSeats.length > 0 ? selectedSeats : [null]).map((seat) => ({
    agency_id: agencyId,
    group_tour_id: tourId,
    passenger_name: values.passenger_name,
    passenger_cpf: values.passenger_cpf || null,
    seat_number: seat,
    total_paid: 0,
    status: "pending",
    notes: values.notes || null,
  }));
  const { error: bErr } = await (supabase as any).from("group_tour_enrollments").insert(rows);

  // 2. CRM lead
  const { data: stages } = await (supabase as any)
    .from("lead_stages")
    .select("id")
    .eq("agency_id", agencyId)
    .order("position")
    .limit(1);
  if (stages && stages.length > 0) {
    await (supabase as any).from("leads").insert({
      agency_id: agencyId,
      stage_id: stages[0].id,
      name: values.passenger_name,
      email: values.email || null,
      phone: values.phone || null,
      destination: `Interesse: ${destination}`,
      estimated_value: unitPrice * pax,
    });
  }

  // 3. Counter
  const { data: cur } = await (supabase as any)
    .from("group_tours")
    .select("reserved_seats")
    .eq("id", tourId)
    .maybeSingle();
  if (cur) {
    await (supabase as any)
      .from("group_tours")
      .update({ reserved_seats: (cur.reserved_seats || 0) + pax })
      .eq("id", tourId);
  }

  return { error: bErr };
}

// ─── Knowledge Base ──────────────────────────────────────────────────────────
export async function fetchPublicAgencyForKb(slug: string) {
  const { data } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: slug })
    .maybeSingle();
  return data as {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color: string | null;
    brand_color_fg: string | null;
  } | null;
}

export async function fetchKbArticles(agencyId: string, search?: string) {
  if (search?.trim()) {
    const { data } = await (supabase as any).rpc("search_knowledge_articles", {
      p_agency_id: agencyId,
      p_query: search,
      p_is_internal: false,
    });
    return (data || []) as any[];
  }
  const { data } = await (supabase as any)
    .from("knowledge_articles")
    .select("id, title, slug, category, views")
    .eq("agency_id", agencyId)
    .eq("is_internal", false)
    .order("views", { ascending: false });
  return (data || []) as any[];
}

export async function fetchKbArticle(agencySlug: string, articleSlug: string) {
  const { data: agency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: agencySlug })
    .maybeSingle();
  if (!agency) return null;

  const { data: article } = await (supabase as any)
    .from("knowledge_articles")
    .select("*")
    .eq("agency_id", agency.id)
    .eq("slug", articleSlug)
    .eq("is_internal", false)
    .maybeSingle();

  if (article) {
    // fire-and-forget
    (supabase as any).rpc("increment_ka_views", { p_article_id: article.id }).then();
  }

  return { agency, article };
}

export async function voteKbArticle(articleId: string, isUpvote: boolean) {
  const { error } = await (supabase as any).rpc("vote_knowledge_article", {
    p_article_id: articleId,
    p_is_upvote: isUpvote,
  });
  if (error) throw error;
}

// ─── Blog Post ───────────────────────────────────────────────────────────────
export async function fetchPublicBlogPost(agencySlug: string, postSlug: string) {
  const { data: agency } = await (supabase as any)
    .rpc("get_public_agency_by_slug", { _slug: agencySlug })
    .maybeSingle();
  if (!agency) return { agency: null, post: null, related: [] };

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("agency_id", agency.id)
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (post) {
    (supabase as any).rpc("increment_post_views", { p_post_id: post.id }).then();
  }

  let related: any[] = [];
  if (post && (post as any).tags?.length > 0) {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, cover_image_url, published_at, views, excerpt")
      .eq("agency_id", agency.id)
      .eq("status", "published")
      .neq("id", (post as any).id)
      .overlaps("tags", (post as any).tags)
      .limit(3);
    related = data || [];
  }

  return { agency, post, related };
}

export async function submitBlogLead(
  agencyId: string,
  name: string,
  contact: string,
  origin: string,
) {
  const { error } = await (supabase as any).rpc("submit_public_lead", {
    p_agency_id: agencyId,
    p_name: name,
    p_contact: contact,
    p_origin: origin,
  });
  if (error) throw error;
}

// ─── Contract Verification ───────────────────────────────────────────────────
export async function verifyContract(serial: string) {
  const { data, error } = await supabase.rpc("verify_contract", { _serial: serial });
  if (error) throw new Error(error.message);
  return (data as any[])?.[0] ?? null;
}

// ─── Corporate Approval ──────────────────────────────────────────────────────
export async function fetchCorporateApprovalRequest(token: string) {
  const { data, error } = await (supabase as any)
    .from("corporate_approval_requests")
    .select("*, trip:trips(code, destination, travel_start, travel_end, total_sale, currency)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitCorporateApproval(token: string, approved: boolean, notes?: string) {
  const { error } = await (supabase as any).rpc("process_corporate_approval", {
    _token: token,
    _approved: approved,
    _notes: notes ?? null,
  });
  if (error) throw error;
}

// ─── Corporate RFP (direct table flow) ───────────────────────────────────────
export async function fetchCorporateRfp(token: string) {
  const { data, error } = await (supabase as any)
    .from("corporate_rfps")
    .select("*, agency:agencies(slug, name), client:clients(full_name)")
    .eq("approval_token", token)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function updateCorporateRfpStatus(
  token: string,
  status: string,
  reason?: string,
  approvedBy?: string,
) {
  const { error } = await (supabase as any)
    .from("corporate_rfps")
    .update({
      status,
      rejection_reason: reason || null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: approvedBy ?? null,
    })
    .eq("approval_token", token);
  if (error) throw error;
}
