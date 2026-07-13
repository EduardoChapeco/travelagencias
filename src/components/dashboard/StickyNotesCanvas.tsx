import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StickyNote, type NoteData } from "./StickyNote";
import { cn } from "@/lib/utils";
import { 
  Users, PlaneTakeoff, TrendingUp, Bus, Globe, Wallet, Calendar,
  Sparkles, Settings, Plus, LayoutGrid, Edit3, CheckCircle, 
  Map, Compass, MessageSquare
} from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { fetchTeamMembers } from "@/services/settings";
import { Button } from "@/components/ui/button";


interface StickyNotesCanvasProps {
  renderNoteContent?: (content: string) => React.ReactNode;
  onNoteFocusChange?: (focused: boolean) => void;
}

export function StickyNotesCanvas({ renderNoteContent, onNoteFocusChange }: StickyNotesCanvasProps) {
  const { agency } = useAgency();
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isEditable, setIsEditable] = useState(false);
  const [localNotes, setLocalNotes] = useState<NoteData[]>([]);

  // 1. Fetch active user
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // 2. Fetch Team Members List for sharing
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", agency?.id],
    enabled: !!agency?.id,
    queryFn: async () => {
      const members = await fetchTeamMembers(agency!.id);
      return members.map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profile?.full_name || m.user_id,
      }));
    }
  });

  // 3. Fetch Notes Query (Join with profiles)
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["desktop-notes", agency?.id, userId],
    enabled: !!agency?.id && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desktop_notes")
        .select(`
          id, content, color, x_pos, y_pos, w_pos, h_pos, visibility, assigned_profile_id, profile_id,
          profiles:profiles!profile_id (full_name)
        `)
        .eq("agency_id", agency!.id);
      
      if (error) throw error;
      return (data as NoteData[]) || [];
    }
  });

  // Sync server notes to local state when query completes or updates
  useEffect(() => {
    if (notes) {
      setLocalNotes(notes);
    }
  }, [notes]);

  // 3. Mutações Supabase
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!agency?.id || !userId) return;

      // Spawn near center with slight random offsets
      const randomX = Math.floor(Math.random() * 80) + 120;
      const randomY = Math.floor(Math.random() * 80) + 100;

      const { data, error } = await supabase
        .from("desktop_notes")
        .insert({
          agency_id: agency.id,
          profile_id: userId,
          content: "",
          color: "yellow",
          x_pos: randomX,
          y_pos: randomY,
          w_pos: 220,
          h_pos: 220,
          visibility: "private",
          assigned_profile_id: null,
        })
        .select(`
          id, content, color, x_pos, y_pos, w_pos, h_pos, visibility, assigned_profile_id, profile_id,
          profiles:profiles!profile_id (full_name)
        `)
        .single();

      if (error) throw error;
      return data as NoteData;
    },
    onSuccess: (newNote) => {
      if (newNote) {
        setLocalNotes((prev) => [...prev, newNote]);
        qc.invalidateQueries({ queryKey: ["desktop-notes", agency?.id, userId] });
        toast.success("Novo lembrete criado!");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar lembrete.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NoteData> }) => {
      const { error } = await supabase
        .from("desktop_notes")
        .update({
          content: updates.content,
          color: updates.color,
          x_pos: updates.x_pos,
          y_pos: updates.y_pos,
          w_pos: updates.w_pos,
          h_pos: updates.h_pos,
          visibility: updates.visibility,
          assigned_profile_id: updates.assigned_profile_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desktop-notes", agency?.id, userId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar alterações.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("desktop_notes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      setLocalNotes((prev) => prev.filter((n) => n.id !== id));
      qc.invalidateQueries({ queryKey: ["desktop-notes", agency?.id, userId] });
      toast.success("Lembrete excluído!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir lembrete.");
    }
  });

  // Local handlers
  const handleUpdateNoteLocal = (id: string, updates: Partial<NoteData>) => {
    // Optimistic local state update
    setLocalNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
    // Persist to DB
    updateMutation.mutate({ id, updates });
  };

  const handleDeleteNoteLocal = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-[500px] select-none"
      style={{ overflow: "hidden" }}
    >
      {/* ── Background Workspace Canvas Area ── */}
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
          Carregando lembretes...
        </div>
      ) : (
        localNotes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            isEditable={isEditable && note.profile_id === userId}
            userId={userId}
            onUpdate={handleUpdateNoteLocal}
            onDelete={handleDeleteNoteLocal}
            containerRef={containerRef}
            renderContent={renderNoteContent}
            onFocusChange={onNoteFocusChange}
            teamMembers={teamMembers}
          />
        ))
      )}

      {/* ── Controle de Lembretes do Dashboard (Top-Right) ─────────────────── */}
      <div className="absolute top-6 right-6 flex items-center gap-2.5 z-20 pointer-events-auto">
        {/* Adicionar nota (apenas no modo editar) */}
        {isEditable && (
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/8 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50 ds-meta font-black uppercase tracking-wider"
            title="Adicionar Nota"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Nota</span>
          </Button>
        )}

        {/* Toggle modo organizar */}
        <Button
          onClick={() => setIsEditable(!isEditable)}
          className={cn(
            "flex items-center gap-1.5 h-9 px-4 rounded-full transition-all cursor-pointer ds-meta font-black uppercase tracking-wider",
            isEditable
              ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/25"
              : "bg-white/8 hover:bg-white/15 text-white/70 hover:text-white"
          )}
          title={isEditable ? "Concluir Organização" : "Organizar Lembretes"}
        >
          {isEditable ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Organizar Lembretes</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
