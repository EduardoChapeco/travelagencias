import { useState } from "react";
import { Star, MapPin, Check, Info } from "lucide-react";
import { SheetPage } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface HotelDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: {
    name: string;
    stars: number;
    address?: string;
    neighborhood?: string;
    city?: string;
    images?: Array<{ url?: string; description?: string }>;
    amenities?: string[];
    description?: string;
    mealPlans?: string[];
  } | null;
}

export function HotelDetailsModal({ open, onOpenChange, hotel }: HotelDetailsModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!hotel) return null;

  const images = hotel.images && hotel.images.length > 0
    ? hotel.images.map((img) => img.url || "").filter(Boolean)
    : [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
      ];

  const amenities = hotel.amenities || [
    "Wi-Fi de Alta Velocidade Grátis",
    "Piscina ao Ar Livre",
    "Restaurante Buffet e À La Carte",
    "Café da Manhã Incluso",
    "Recepção 24 Horas",
    "Ar Condicionado Split",
    "TV a Cabo com Canais Internacionais",
    "Serviço de Quarto Diário",
  ];

  return (
    <SheetPage
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-amber-400">
            {[...Array(hotel.stars || 3)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
            ))}
          </div>
          <span className="truncate max-w-[280px] sm:max-w-md">{hotel.name}</span>
        </div>
      }
      width="clamp(520px, 50vw, 760px)"
      contentClassName="p-0 overflow-y-auto no-scrollbar"
      footer={
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-6 text-[12px]"
          >
            Fechar Detalhes
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header com fotos em destaque */}
        <div className="relative aspect-[16/9] w-full bg-black/10 overflow-hidden">
          <img
            src={images[activeImageIndex] || images[0]}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-[20px] font-bold tracking-tight text-white">{hotel.name}</h2>
            <p className="text-[12px] text-white/90 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
              {hotel.address || `Rua José Luiz Calazans 30, Jatiúca, ${hotel.city || "Maceió - AL"}`}
            </p>
          </div>
        </div>

        {/* Miniaturas de fotos */}
        {images.length > 1 && (
          <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-14 rounded-[var(--radius-md)] overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activeImageIndex === idx ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Detalhes e comodidades */}
        <div className="px-6 space-y-6 pb-6">
          <div className="space-y-2">
            <h4 className="text-[14px] font-bold text-foreground">Sobre a Hospedagem</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {hotel.description ||
                "Localizado estrategicamente próximo à orla marítima e aos principais polos gastronômicos da cidade. O hotel oferece acomodações modernas e climatizadas, perfeitas tanto para lazer quanto para viagens em família. Conta com piscina panorâmica, café da manhã com delícias regionais e atendimento de padrão internacional homologado pela operadora parceira."}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-foreground">Comodidades e Facilidades</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-[12px] text-foreground/90 p-2.5 rounded-[var(--radius-md)] bg-muted/20 border border-border/80"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted/20 border border-border/80 rounded-[var(--radius-xl)] space-y-1.5 text-[12px]">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500" />
              Políticas de Check-in e Check-out
            </div>
            <p className="text-muted-foreground">
              Check-in a partir das 14:00 | Check-out até às 12:00. Cancelamento com reembolso integral até 7 dias antes do embarque conforme regras do contrato direto.
            </p>
          </div>
        </div>
      </div>
    </SheetPage>
  );
}
