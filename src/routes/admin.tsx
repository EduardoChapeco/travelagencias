import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/shell/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  /**
   * P1.5: Server-side (and client-side) guard for the admin area.
   * Checks both authentication AND super_admin role BEFORE rendering any admin component.
   * Even if AdminShell's client-side check is bypassed, this beforeLoad runs first.
   */
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Not authenticated — redirect to login
    if (!user) {
      throw redirect({ to: "/auth/login", search: { redirect: "/admin" } });
    }

    // Authenticated but not super_admin — redirect to home
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!role) {
      // Not a super admin — boot to agency area or home
      throw redirect({ to: "/" });
    }
  },
  component: AdminShell,
});
