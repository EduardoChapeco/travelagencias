import { useState, useRef, useEffect } from "react";
import { Trash2, GripHorizontal, Palette, Users, Bus, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";

export type NoteData = {
  id: string;
  content: string;
  color: string;
  x_pos: number;
  y_pos: number;
  w_pos: number;
  h_pos: number;
};

interface StickyNoteProps {
  note: NoteData;
  isEditable: boolean;
  onUpdate: (id: string, updates: Partial<NoteData>) => void;
  onDelete: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  renderContent?: (content: string) => React.ReactNode;
  onFocusChange?: (focused: boolean) => void;
}

const COLORS = [
  { name: "yellow", bg: "bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 border-amber-200/50" },
  { name: "blue", bg: "bg-sky-100/90 dark:bg-sky-950/70 text-sky-950 dark:text-sky-100 border-sky-200/50" },
  { name: "green", bg: "bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-emerald-200/50" },
  { name: "pink", bg: "bg-rose-100/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-100 border-rose-200/50" },
  { name: "purple", bg: "bg-purple-100/90 dark:bg-purple-950/70 text-purple-950 dark:text-purple-100 border-purple-200/50" },
];

export function StickyNote({
  note,
  isEditable,
  onUpdate,
  onDelete,
  containerRef,
  renderContent,
  onFocusChange,
}: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: note.x_pos, y: note.y_pos });
  const [text, setText] = useState(note.content);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [atIndex, setAtIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; type: "lead" | "trip" | "contract"; label: string }>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const { agency } = useAgency();

  useEffect(() => {
    if (!showAutocomplete || !agency?.id) {
      setSearchResults([]);
      return;
    }

    const fetchMatches = async () => {
      try {
        const cleanQuery = searchQuery.trim();
        
        // Fetch Leads (CRM)
        const leadsP = supabase
          .from("leads")
          .select("id, name")
          .eq("agency_id", agency.id)
          .ilike("name", `%${cleanQuery}%`)
          .limit(4);
          
        // Fetch Trips
        const tripsP = supabase
          .from("trips")
          .select("id, title, number")
          .eq("agency_id", agency.id)
          .ilike("title", `%${cleanQuery}%`)
          .limit(4);
          
        // Fetch Contracts
        const contractsP = supabase
          .from("contracts")
          .select("id, trip_id, package_summary")
          .eq("agency_id", agency.id)
          .ilike("package_summary", `%${cleanQuery}%`)
          .limit(4);

        const [leadsRes, tripsRes, contractsRes] = await Promise.all([leadsP, tripsP, contractsP]);

        const items: Array<{ id: string; type: "lead" | "trip" | "contract"; label: string }> = [];

        if (leadsRes.data) {
          leadsRes.data.forEach(l => {
            items.push({ id: l.id, type: "lead", label: l.name });
          });
        }
        if (tripsRes.data) {
          tripsRes.data.forEach(t => {
            items.push({ id: t.id, type: "trip", label: `#${t.number} - ${t.title}` });
          });
        }
        if (contractsRes.data) {
          contractsRes.data.forEach(c => {
            items.push({ id: c.id, type: "contract", label: `Contrato: ${c.package_summary || 'Resumo'}` });
          });
        }

        setSearchResults(items);
      } catch (err) {
        console.error("Autocomplete search error:", err);
      }
    };

    const delay = setTimeout(fetchMatches, 200);
    return () => clearTimeout(delay);
  }, [searchQuery, showAutocomplete, agency?.id]);

  const noteRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  // Sync position from DB if it changes externally
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: note.x_pos, y: note.y_pos });
    }
  }, [note.x_pos, note.y_pos, isDragging]);

  // Sync content from DB if it changes externally
  useEffect(() => {
    setText(note.content);
  }, [note.content]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("textarea")) {
      return; // Ignore drag if clicking button or textarea
    }
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { x: position.x, y: position.y };
    document.body.style.cursor = "grabbing";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || !noteRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const noteRect = noteRef.current.getBoundingClientRect();

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      let newX = posStartRef.current.x + deltaX;
      let newY = posStartRef.current.y + deltaY;

      // Keep inside container bounds
      const maxX = containerRect.width - noteRect.width;
      const maxY = containerRect.height - noteRect.height;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = "";
        // Save final position to Supabase
        onUpdate(note.id, { x_pos: Math.round(position.x), y_pos: Math.round(position.y) });
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, position, containerRef, note.id, onUpdate]);

  const activeColor = COLORS.find((c) => c.name === note.color) || COLORS[0];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const caretPos = e.target.selectionStart;
    setText(val);

    // Find if cursor is preceded by @
    const textBeforeCaret = val.substring(0, caretPos);
    const atMatch = textBeforeCaret.match(/@([a-zA-Z0-9\s]*)$/);

    if (atMatch) {
      const matchIndex = textBeforeCaret.lastIndexOf("@");
      setAtIndex(matchIndex);
      setSearchQuery(atMatch[1]);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
      setAtIndex(null);
    }
  };

  const selectItem = (item: { id: string; type: "lead" | "trip" | "contract"; label: string }) => {
    if (atIndex === null) return;
    
    const beforeAt = text.substring(0, atIndex);
    const afterCaret = text.substring(noteRef.current?.querySelector("textarea")?.selectionStart || text.length);
    
    // Create tag: [Label](type:id)
    const tag = `[${item.label}](${item.type}:${item.id})`;
    const newText = beforeAt + tag + " " + afterCaret;
    
    setText(newText);
    setShowAutocomplete(false);
    setAtIndex(null);
    
    // Persist immediately
    onUpdate(note.id, { content: newText });
    
    // Refocus and reposition caret
    setTimeout(() => {
      const textarea = noteRef.current?.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        const newCaretPos = beforeAt.length + tag.length + 1;
        (textarea as HTMLTextAreaElement).setSelectionRange(newCaretPos, newCaretPos);
      }
    }, 50);
  };

  const handleTextBlur = () => {
    // Delay blur slightly so clicks in dropdown can register
    setTimeout(() => {
      if (text !== note.content) {
        onUpdate(note.id, { content: text });
      }
      if (onFocusChange) {
        onFocusChange(false);
      }
    }, 180);
  };

  const handleColorSelect = (colorName: string) => {
    onUpdate(note.id, { color: colorName });
    setShowColorPicker(false);
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        "absolute rounded-[24px] border shadow-md p-4 flex flex-col backdrop-blur-md select-none group transition-shadow",
        activeColor.bg,
        isDragging ? "shadow-2xl z-40 scale-[1.02]" : "z-20 hover:shadow-lg",
        !isEditable && "pointer-events-none"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${note.w_pos}px`,
        height: `${note.h_pos}px`,
      }}
    >
      {/* Note Header / Drag Handle */}
      {isEditable && (
        <div
          onMouseDown={handleMouseDown}
          className="h-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 mb-2 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripHorizontal className="w-3.5 h-3.5 opacity-40 hover:opacity-80 transition-opacity" />
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Color picker toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-inherit"
                title="Mudar cor"
              >
                <Palette className="w-3.5 h-3.5 opacity-60" />
              </button>
              {showColorPicker && (
                <div className="absolute top-6 right-0 bg-white dark:bg-zinc-900 border border-border rounded-xl p-1.5 flex gap-1 z-50 shadow-lg">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleColorSelect(c.name)}
                      className={cn(
                        "w-5 h-5 rounded-full border border-black/10 cursor-pointer",
                        c.bg.split(" ")[0]
                      )}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Delete note */}
            <button
              onClick={() => onDelete(note.id)}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-rose-600 dark:text-rose-400 cursor-pointer"
              title="Excluir lembrete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {isEditable ? (
          <>
            <textarea
              value={text}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              onFocus={() => onFocusChange && onFocusChange(true)}
              placeholder="Digite sua anotação... Use @ para vincular clientes, viagens ou contratos."
              className="flex-1 w-full bg-transparent border-none outline-none resize-none text-xs font-semibold leading-relaxed placeholder:text-black/35 dark:placeholder:text-white/35 text-inherit focus:ring-0"
            />
            {/* Autocomplete Dropdown */}
            {showAutocomplete && searchResults.length > 0 && (
              <div className="absolute bottom-2 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 border border-border rounded-xl shadow-xl max-h-32 overflow-y-auto no-scrollbar z-50 p-1 flex flex-col gap-0.5 text-xs text-foreground">
                {searchResults.map((item) => {
                  const Icon = item.type === "lead" ? Users : item.type === "trip" ? Bus : ScrollText;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent text blur
                        selectItem(item);
                      }}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-brand/10 hover:text-brand text-left cursor-pointer transition-colors w-full text-foreground/90 font-bold"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 w-full overflow-y-auto no-scrollbar text-xs font-semibold leading-relaxed whitespace-pre-wrap select-text text-inherit">
            {renderContent ? renderContent(text) : text}
          </div>
        )}
      </div>
    </div>
  );
}
