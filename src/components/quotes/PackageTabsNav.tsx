import {
  Hotel,
  Plane,
  Palmtree,
  Ticket,
  ArrowLeftRight,
  Package,
  Repeat,
  ShieldCheck,
  Smartphone,
  MoreHorizontal,
} from "lucide-react";

export type PackageModuleTab =
  | "hospedagem"
  | "aereo"
  | "passeios"
  | "ingressos"
  | "transfer_roundtrip"
  | "pacote_servicos"
  | "traslado_trecho"
  | "seguro"
  | "chip"
  | "outros";

interface PackageTabsNavProps {
  activeTab: PackageModuleTab;
  onTabChange: (tab: PackageModuleTab) => void;
  counts?: Partial<Record<PackageModuleTab, number>>;
}

const TABS: Array<{
  id: PackageModuleTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "hospedagem", label: "Hospedagem", icon: Hotel },
  { id: "aereo", label: "Aéreo", icon: Plane },
  { id: "passeios", label: "Passeios", icon: Palmtree },
  { id: "ingressos", label: "Ingressos", icon: Ticket },
  { id: "transfer_roundtrip", label: "Transfer ida e volta", icon: Repeat },
  { id: "pacote_servicos", label: "Pacote de serviços", icon: Package },
  { id: "traslado_trecho", label: "Traslado trecho", icon: ArrowLeftRight },
  { id: "seguro", label: "Seguro", icon: ShieldCheck },
  { id: "chip", label: "Chip", icon: Smartphone },
  { id: "outros", label: "Outros", icon: MoreHorizontal },
];

export function PackageTabsNav({ activeTab, onTabChange, counts = {} }: PackageTabsNavProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-1.5 min-w-max border-b border-border/60 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-[12px] font-semibold transition-all select-none cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-none"
                  : "bg-card hover:bg-muted text-foreground/80 hover:text-foreground border border-border/80"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-primary"}`} />
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
