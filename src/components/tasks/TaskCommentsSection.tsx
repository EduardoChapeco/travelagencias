import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const db = supabase as any;

interface TaskCommentsSectionProps {
  taskId: string;
  agencyId: string;
}

export function TaskCommentsSection({ taskId, agencyId }: TaskCommentsSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Load comments from DB
  useEffect(() => {
    if (!taskId) return;
    setCommentsLoading(true);
    db.from("task_comments")
      .select("*, profile:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)")
      .eq("task_id", taskId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .then(({ data, error }: any) => {
        if (!error && data) {
          setComments(data);
        }
        setCommentsLoading(false);
      });
  }, [taskId]);

  const postComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await db
        .from("task_comments")
        .insert({
          task_id: taskId,
          agency_id: agencyId,
          user_id: user.id,
          content: newComment.trim(),
          is_edited: false,
          is_deleted: false,
        })
        .select("*, profile:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)")
        .single();

      if (error) throw error;
      setComments((prev) => [...prev, data]);
      setNewComment("");
    } catch (err: any) {
      toast.error("Erro ao comentar: " + err.message);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> Comentários
        {comments.length > 0 && (
          <span className="ml-1 font-mono text-[9px] bg-surface-alt border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground">
            {comments.length}
          </span>
        )}
      </label>

      {commentsLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando comentários...
        </div>
      )}

      {!commentsLoading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic py-1">Nenhum comentário ainda.</p>
      )}

      <div className="space-y-3">
        {comments.map((c) => {
          const name = c.profile?.full_name || "Usuário";
          const initials = name.charAt(0).toUpperCase();
          return (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-black uppercase shrink-0 mt-0.5">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-foreground">{name}</span>
                  <span className="text-[9px] text-muted-foreground/60">
                    {format(new Date(c.created_at), "dd/MM 'às' HH:mm")}
                  </span>
                </div>
                <div className="text-xs text-foreground/80 leading-relaxed bg-[var(--surface-alt)]/40 border border-border/30 rounded-[var(--radius-card)] px-3 py-2">
                  {typeof c.content === "string" ? c.content : JSON.stringify(c.content)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment input form */}
      <form onSubmit={postComment} className="flex items-end gap-2 pt-1">
        <Textarea
          placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[56px] resize-none text-xs border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-[var(--radius-card)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              postComment();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newComment.trim() || postingComment}
          className="h-9 px-3 shrink-0"
        >
          {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        </Button>
      </form>
    </div>
  );
}
