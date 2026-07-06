import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StickyNote, type NoteData } from "./StickyNote";
import { 
  Users, PlaneTakeoff, TrendingUp, Bus, Globe, Wallet, Calendar,
  Sparkles, Settings, Plus, LayoutGrid, Edit3, CheckCircle, 
  Map, Compass, MessageSquare
} from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

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

  // 2. Fetch Notes Query
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["desktop-notes", agency?.id, userId],
    enabled: !!agency?.id && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desktop_notes")
        .select("id, content, color, x_pos, y_pos, w_pos, h_pos")
        .eq("agency_id", agency!.id)
        .eq("profile_id", userId!);
      
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
        })
        .select("id, content, color, x_pos, y_pos, w_pos, h_pos")
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
            isEditable={isEditable}
            onUpdate={handleUpdateNoteLocal}
            onDelete={handleDeleteNoteLocal}
            containerRef={containerRef}
            renderContent={renderNoteContent}
            onFocusChange={onNoteFocusChange}
          />
        ))
      )}

      {/* ── Central Island Floating Menu Pill (macOS style) ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/45 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-white text-xs font-semibold select-none">
          {/* Dashboard Hub Shortcuts */}
          <Link
            to={`/agency/${slug}/crm` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Clientes & CRM"
          >
            <Users className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to={`/agency/${slug}/quotes` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Central de Cotações"
          >
            <Compass className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to={`/agency/${slug}/trips` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Viagens & Embarques"
          >
            <Bus className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to={`/agency/${slug}/financial` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Financeiro"
          >
            <Wallet className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to={`/agency/${slug}/calendar` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Agenda & Compromissos"
          >
            <Calendar className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to={`/agency/${slug}/inbox` as any}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Mensagens & Chat"
          >
            <MessageSquare className="w-[18px] h-[18px]" />
          </Link>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          {/* Add note button (only if editable) */}
          {isEditable && (
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-brand/20 hover:bg-brand/35 text-brand-light border border-brand/25 transition-all cursor-pointer disabled:opacity-50"
              title="Adicionar Nota"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* Toggle Edit Mode */}
          <button
            onClick={() => setIsEditable(!isEditable)}
            className="flex items-center gap-2 h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            title={isEditable ? "Salvar Organização" : "Editar Lembretes"}
          >
            {isEditable ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-wider">Pronto</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 opacity-75" />
                <span className="text-[11px] font-black uppercase tracking-wider">Organizar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
