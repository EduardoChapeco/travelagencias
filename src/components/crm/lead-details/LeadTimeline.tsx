import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/hooks/use-confirm";
import {
  addLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  type Activity,
} from "@/services/crm";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import {
  StickyNote,
  Phone,
  MessageSquare,
  Mail,
  CalendarClock,
  CheckCircle2,
  ArrowRightLeft,
  Pencil,
  Trash,
} from "lucide-react";

export const ACTIVITY_TYPES = [
  { v: "note", label: "Nota", icon: StickyNote },
  { v: "call", label: "Ligação", icon: Phone },
  { v: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { v: "email", label: "Email", icon: Mail },
  { v: "meeting", label: "Reunião", icon: CalendarClock },
  { v: "task", label: "Tarefa", icon: CheckCircle2 },
] as const;

function iconFor(type: string) {
  if (type === "stage_change") return ArrowRightLeft;
  return ACTIVITY_TYPES.find((t) => t.v === type)?.icon ?? StickyNote;
}

function colorFor(type: string) {
  switch (type) {
    case "stage_change":
      return "text-brand";
    case "whatsapp":
      return "text-emerald-500";
    case "call":
      return "text-blue-500";
    case "email":
      return "text-amber-500";
    case "meeting":
      return "text-purple-500";
    case "task":
      return "text-rose-500";
    default:
      return "text-muted-foreground";
  }
}

export function NewActivity({
  leadId,
  agencyId,
  onCreated,
}: {
  leadId: string;
  agencyId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<string>("note");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await addLeadActivity({
        leadId,
        agencyId,
        type,
        content: content.trim(),
      });
      setContent("");
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[var(--radius-card)] border border-border bg-surface p-1 flex items-start focus-within:ring-1 focus-within:ring-border transition-shadow"
    >
      <Select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-32 border-0 bg-transparent text-xs focus:ring-0 text-muted-foreground"
      >
        {ACTIVITY_TYPES.map((t) => (
          <option key={t.v} value={t.v}>
            {t.label}
          </option>
        ))}
      </Select>
      <div className="flex-1 border-l border-border/50">
        <Textarea
          rows={1}
          placeholder="Registrar um comentário, ligação ou e-mail..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border-0 bg-transparent focus:ring-0 resize-none py-2 min-h-[38px] text-xs"
        />
      </div>
      <Button
        type="submit"
        disabled={busy || !content.trim()}
        className="m-1 rounded-2xl bg-brand text-brand-foreground px-3.5 py-1.5 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        Postar
      </Button>
    </form>
  );
}

export function Timeline({
  activities,
  onChanged,
}: {
  activities: Activity[];
  onChanged: () => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6 bg-surface-alt/10 rounded-[var(--radius-card)] border border-border/50 border-dashed">
        Sem histórico ou atividades registradas.
      </div>
    );
  }
  return (
    <div className="relative pl-4 border-l border-border/60 space-y-4">
      {activities.map((a) => (
        <ActivityItem key={a.id} activity={a} onChanged={onChanged} />
      ))}
    </div>
  );
}

function ActivityItem({ activity, onChanged }: { activity: Activity; onChanged: () => void }) {
  const Icon = iconFor(activity.type);
  const colorClass = colorFor(activity.type);
  const [edit, setEdit] = useState(false);
  const [content, setContent] = useState(activity.content ?? "");
  const [me, setMe] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const mine = me && activity.author_id === me;

  const save = useMutation({
    mutationFn: async () => {
      await updateLeadActivity(activity.id, content.trim() || null);
    },
    onSuccess: () => {
      toast.success("Nota atualizada.");
      setEdit(false);
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await deleteLeadActivity(activity.id);
    },
    onSuccess: () => {
      toast.success("Registro removido.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  return (
    <div className="relative pl-6 group">
      <div className="absolute -left-[25px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border">
        <Icon className={`h-3 w-3 ${colorClass}`} />
      </div>

      <div className="flex flex-col gap-1 bg-surface-alt/15 hover:bg-surface-alt/25 border border-border/30 rounded-[var(--radius-card)] p-3.5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {ACTIVITY_TYPES.find((t) => t.v === activity.type)?.label ??
              (activity.type === "stage_change" ? "Mudança de Estágio" : activity.type)}
            <span className="mx-2 opacity-50">•</span>
            {new Date(activity.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {mine && !edit && activity.type !== "stage_change" && (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => setEdit(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title="Editar"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => {
                  confirm({
                    title: "Deletar Registro",
                    description: "Apagar permanentemente este registro?",
                    variant: "destructive",
                    onConfirm: () => remove.mutate(),
                  });
                }}
                className="text-muted-foreground hover:text-danger transition-colors p-0.5"
                title="Deletar"
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <ConfirmDialog />

        {edit ? (
          <div className="mt-2 space-y-2.5">
            <Textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-2xl border-border text-xs"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                onClick={() => {
                  setEdit(false);
                  setContent(activity.content ?? "");
                }}
                className="rounded-2xl px-3 py-1 text-xs font-semibold hover:bg-surface-alt transition-colors"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="rounded-2xl bg-brand text-brand-foreground px-3 py-1 text-xs font-bold transition-opacity hover:opacity-90"
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={`text-xs text-foreground/90 leading-relaxed ${activity.type === "stage_change" ? "font-semibold text-brand" : ""}`}
          >
            {activity.content}
          </p>
        )}
      </div>
    </div>
  );
}
