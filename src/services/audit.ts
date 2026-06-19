import { supabase } from "@/integrations/supabase/client";

export async function logTripAudit(params: {
  agencyId: string;
  tripId: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      agency_id: params.agencyId,
      actor_id: user?.id || null,
      actor_type: user ? "user" : "system",
      action: params.action,
      entity_id: params.tripId,
      entity_type: "trip",
      metadata: {
        details: params.details,
        ...(params.metadata || {}),
      },
    });
  } catch (err) {
    console.error("Failed to log audit activity:", err);
  }
}
