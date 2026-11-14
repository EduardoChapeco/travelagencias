import { useState } from "react";
import {
  Search,
  Check,
  ChevronDown,
  Info,
  Car,
  Palmtree,
  ShieldCheck,
  Smartphone,
  Ticket,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

export interface ServiceItem {
  id: string;
  type: "transfer" | "activity" | "ticket" | "insurance" | "chip" | "service_package";
  title: string;
  description: string;
  supplierName: string;
  imageUrl?: string;
  price: number;
  taxes: number;
  fees: number;
  inclusions?: string[];
  vehicleType?: string;
}

interface ServicesSearchCatalogProps {
  serviceType: "transfer" | "activity" | "ticket" | "insurance" | "chip" | "service_package";
  services: ServiceItem[];
  onAddService: (service: ServiceItem) => void;
  addedServiceIds?: string[];
}

export function ServicesSearchCatalog({
  serviceType,
  services,
  onAddService,
  addedServiceIds = [],
}: ServicesSearchCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const filteredServices = services.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getServiceTypeIcon = () => {
    switch (serviceType) {
      case "transfer":
        return Car;
      case "activity":
        return Palmtree;
      case "ticket":
        return Ticket;
      case "insurance":
        return ShieldCheck;
      case "chip":
        return Smartphone;
      default:
        return Package;
    }
  };

  const Icon = getServiceTypeIcon();

  return (
    <div className="w-full space-y-4">
      {/* Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-[var(--radius-xl)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-foreground">
            {filteredServices.length} Serviços disponíveis
          </span>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por nome do serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Grid de Serviços */}
      <div className="space-y-4">
        {filteredServices.map((service) => {
          const isAdded = addedServiceIds.includes(service.id);
          const isExpanded = expandedServiceId === service.id;

          return (
            <div
              key={service.id}
              className={`w-full bg-surface border rounded-[var(--radius-xl)] p-5 transition-all space-y-3 ${
                isAdded
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Foto */}
                <div className="md:col-span-3 relative rounded-[var(--radius-lg)] overflow-hidden aspect-[16/10] bg-muted shrink-0">
                  <img
                    src={
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-none">
                    <Icon className="w-3 h-3" />
                    {service.supplierName}
                  </div>
                </div>

                {/* Descrição e Detalhes */}
                <div className="md:col-span-6 space-y-2">
                  <h3 className="text-[15px] font-bold text-foreground leading-snug">
                    {service.title}
                  </h3>

                  <p className={`text-[12px] text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                    {service.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                    className="text-primary text-[11px] font-semibold hover:underline inline-block pt-0.5 cursor-pointer"
                  >
                    {isExpanded ? "Ocultar detalhes" : "Ver detalhes do Serviço"}
                  </button>

                  {service.inclusions && service.inclusions.length > 0 && isExpanded && (
                    <div className="pt-2 border-t border-border/40 space-y-1">
                      <div className="text-[11px] font-bold text-foreground">Inclusões do serviço:</div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                        {service.inclusions.map((inc, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{inc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preço e Botão Adicionar */}
                <div className="md:col-span-3 text-right space-y-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-muted-foreground">Preço</div>
                    <div className="text-[19px] font-extrabold text-foreground tracking-tight">
                      {formatCurrency(service.price)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      taxas inclusas de {formatCurrency(service.taxes)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Impostos inclusos {formatCurrency(service.fees)}
                    </div>
                  </div>

                  <div>
                    {isAdded ? (
                      <Button
                        type="button"
                        onClick={() => onAddService(service)}
                        className="w-full h-9 bg-emerald-600 text-white hover:bg-emerald-700 rounded-[var(--radius-md)] text-[12px] font-bold shadow-none cursor-pointer"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Adicionado ao Pacote
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => onAddService(service)}
                        className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-md)] text-[12px] font-bold flex items-center justify-center gap-1 shadow-none cursor-pointer"
                      >
                        <span>Adicionar</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="text-center py-12 bg-surface border border-border rounded-[var(--radius-xl)] space-y-3">
            <Icon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h4 className="text-[14px] font-bold text-foreground">Nenhum serviço disponível</h4>
            <p className="text-[12px] text-muted-foreground">
              Não encontramos traslados ou passeios para as datas e destino selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
