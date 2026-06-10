import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plane, AlertTriangle, CheckCircle2, Square, CheckSquare, Loader2 } from "lucide-react";
import { PrimaryButton } from "@/components/ui/form";
import { toast } from "sonner";

export const Route = createFileRoute("/m/checkin/$token")({
  head: () => ({ meta: [{ title: "Meu Embarque · TravelOS" }] }),
  component: MobileCheckinPage,
});

type Item = { label: string; done?: boolean; passenger_id?: string };
type Card = {
  id: string; pnr: string | null; airline: string | null;
  status: string; alerts: string[]; checklist: Item[];
  trip_id: string; agency_id: string;
};

function MobileCheckinPage() {
  const { token } = Route.useParams();
  const [card, setCard] = useState<Card | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<Item[]>([]);

  useEffect(() => {
    supabase.rpc("get_public_boarding_card", { p_id: token })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else if (!data || data.length === 0) setErr("Cartão de embarque não encontrado ou expirado.");
        else {
          const c = data[0] as Card;
          setCard(c);
          setChecklist(c.checklist || []);
        }
      });
  }, [token]);

  async function toggle(idx: number) {
     const next = checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
     setChecklist(next);
     setSaving(true);
     const { error } = await supabase.rpc("update_public_boarding_card_checklist", { p_id: token, p_checklist: next });
     setSaving(false);
     if (error) {
        toast.error("Erro ao sincronizar. Tente novamente.");
        setChecklist(checklist); // revert
     } else {
        toast.success("Progresso salvo");
     }
  }

  if (err) return <Center><AlertTriangle className="w-8 h-8 text-danger mb-3"/><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!card) return <Center><Loader2 className="w-8 h-8 text-brand animate-spin mb-3"/><p className="text-sm font-medium text-muted-foreground">Carregando seu embarque…</p></Center>;

  const doneCount = checklist.filter(c => c.done).length;
  const isAllDone = doneCount === checklist.length && checklist.length > 0;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface text-foreground font-sans">
      {/* Header */}
      <div className="bg-brand text-brand-foreground px-6 py-8 rounded-b-[2.5rem] shadow-md relative overflow-hidden">
         <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
         <div className="relative z-10">
            <h1 className="mb-1 text-2xl font-black tracking-tight drop-shadow-sm">Check-in</h1>
            <p className="text-brand-foreground/80 font-medium text-sm">Acompanhe e confirme os passos para o seu voo.</p>
         </div>
      </div>

      <div className="px-6 py-6 space-y-6">
         {/* Flight Info */}
         <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-brand">
                  <Plane className="w-5 h-5" />
                  <span className="font-bold">Seu Voo</span>
               </div>
               {isAllDone && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Localizador (PNR)</div>
                  <div className="font-mono text-lg font-black text-foreground">{card.pnr || "Pendente"}</div>
               </div>
               <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Cia Aérea</div>
                  <div className="text-lg font-bold text-foreground">{card.airline || "Pendente"}</div>
               </div>
            </div>
         </div>

         {/* Alerts */}
         {card.alerts?.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4">
               <div className="flex items-center gap-2 text-warning font-bold text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" /> Atenção
               </div>
               <ul className="space-y-1.5 text-xs text-warning-foreground font-medium pl-6 list-disc">
               {card.alerts.map((a, i) => <li key={i}>{a}</li>)}
               </ul>
            </div>
         )}

         {/* Interactive Checklist */}
         <div>
            <div className="flex justify-between items-end mb-3">
               <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Etapas</h2>
               <span className="text-xs font-bold text-brand">{doneCount}/{checklist.length}</span>
            </div>
            
            <div className="bg-background border border-border/60 rounded-2xl overflow-hidden shadow-sm">
               {checklist.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma etapa definida.</div>
               ) : (
                  <div className="divide-y divide-border/40">
                     {checklist.map((it, i) => (
                        <button 
                           key={i} 
                           onClick={() => toggle(i)}
                           disabled={saving}
                           className={\`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-surface-alt/50 active:bg-surface-alt \${it.done ? "bg-surface-alt/20" : ""}\`}
                        >
                           {it.done ? (
                              <CheckSquare className="w-5 h-5 text-success shrink-0" />
                           ) : (
                              <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                           )}
                           <span className={\`text-sm font-medium \${it.done ? "line-through text-muted-foreground" : "text-foreground"}\`}>
                              {it.label}
                           </span>
                        </button>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {isAllDone && (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center mt-8">
               <h3 className="font-bold text-success text-sm mb-1">Tudo Pronto!</h3>
               <p className="text-xs text-success/80 font-medium">Sua documentação e check-in estão finalizados. Boa viagem!</p>
            </div>
         )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
     <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="flex flex-col items-center justify-center text-center p-8">
           {children}
        </div>
     </div>
  );
}
