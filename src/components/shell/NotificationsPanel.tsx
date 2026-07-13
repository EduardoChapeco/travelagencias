import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Check, X, Circle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { fmtDate } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string;
  icon: string;
  title: string;
  message: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["notifications"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter the ones for this user OR null (agency wide)
      return (data ?? [])
        .filter((n) => !n.user_id || n.user_id === user.id)
        .map((n) => ({
          ...n,
          is_read: n.read_at !== null,
        })) as any as Notif[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!agency?.id) return;

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `agency_id=eq.${agency?.id}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-count"] });
          toast("Nova notificação", { description: payload.new.title });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("agency_id", agency!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      toast.success("Todas marcadas como lidas");
    },
  });

  const unreadCount = q.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div
      ref={ref}
      className="absolute right-4 top-14 z-50 flex w-80 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface "
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-alt/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-brand px-2 ds-meta font-bold text-brand-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllRead.mutate()}
              title="Marcar todas como lidas"
              className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex max-h-[400px] flex-col overflow-y-auto p-2 no-scrollbar">
        {q.isLoading && (
          <div className="p-4 text-center text-xs text-muted-foreground">Carregando…</div>
        )}
        {q.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-xs">Você não tem notificações</p>
          </div>
        )}
        {q.data?.map((n) => {
          const isUnread = !n.is_read;
          const Icon =
            n.icon === "alert" ? AlertTriangle : n.icon === "success" ? CheckCircle : Info;
          const iconColor =
            n.icon === "alert"
              ? "text-warning"
              : n.icon === "success"
                ? "text-success"
                : "text-primary";

          return (
            <div
              key={n.id}
              className={`relative mb-1 flex gap-3 rounded-2xl p-3 transition-colors ${isUnread ? "bg-surface-alt/50 hover:bg-surface-alt" : "hover:bg-surface-alt/30 opacity-70"}`}
            >
              <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-xs font-semibold ${isUnread ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {n.title}
                  </h4>
                  <span className="shrink-0 ds-meta text-muted-foreground">
                    {fmtDate(n.created_at)}
                  </span>
                </div>
                {n.message && (
                  <p className="mt-1 ds-meta leading-relaxed text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                )}

                {n.link_url && (
                  <Link
                    to={n.link_url}
                    className="mt-2 inline-flex ds-meta font-medium text-brand hover:underline"
                    onClick={() => {
                      if (isUnread) markRead.mutate(n.id);
                      onClose();
                    }}
                  >
                    Visualizar detalhes
                  </Link>
                )}
              </div>
              {isUnread && (
                <Button
                  onClick={() => markRead.mutate(n.id)}
                  className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100"
                  title="Marcar como lida"
                >
                  <Circle className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NotificationBadge({ minimal = false }: { minimal?: boolean }) {
  const { agency } = useAgency();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["notifications-count"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id")
        .eq("agency_id", agency?.id as any)
        .is("read_at", null);
      if (error) throw error;
      
      const filtered = (data ?? []).filter((n) => !n.user_id || n.user_id === user.id);
      return filtered.length;
    },
  });

  return (
    <div className="relative flex items-center">
      <Button
        onClick={() => setOpen(!open)}
        className={
          minimal
            ? "relative flex h-5 w-5 items-center justify-center text-os-muted hover:text-os transition-colors cursor-pointer"
            : `relative flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs font-medium cursor-pointer ${
                open
                  ? "bg-surface-alt text-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              }`
        }
      >
        <Bell className="h-3.5 w-3.5" />
        {q.data ? (
          <span className={
            minimal
              ? "absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-danger text-[7px] font-bold text-white"
              : "absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white"
          }>
            {q.data > 9 ? "9+" : q.data}
          </span>
        ) : null}
      </Button>

      {open && <NotificationsPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
