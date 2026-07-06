import { ShieldCheck } from "lucide-react";

export function LeadAccessibilityCard({ lead }: { lead: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-extrabold uppercase tracking-widest text-brand border-b border-border pb-2 flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-brand" /> Acessibilidade & Saúde
      </h4>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 text-xs font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled
              checked={lead.pcd || false}
              className="h-4 w-4 rounded border-border"
            />
            <span>PCD (Pessoa com Deficiência)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled
              checked={lead.reduced_mobility || false}
              className="h-4 w-4 rounded border-border"
            />
            <span>Mobilidade Reduzida</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled
              checked={lead.autism || false}
              className="h-4 w-4 rounded border-border"
            />
            <span>Espectro Autista (TEA)</span>
          </div>
        </div>
        <div className="pt-2 border-t border-border/40">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
            Notas de Saúde / Restrições
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed bg-surface-alt/30 p-2.5 rounded-2xl border border-border/40">
            {lead.health_notes || "Nenhuma observação cadastrada."}
          </p>
        </div>
      </div>
    </div>
  );
}
