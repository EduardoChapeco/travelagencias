import { Plane, Hotel, MapPin } from "lucide-react";
import { type Voucher } from "@/services/vouchers";
import { type BrandKit } from "@/lib/agency-context";

interface Props {
  voucher: Voucher;
  agency: {
    name: string;
    slug: string;
    logo_url?: string | null;
    brand_color?: string;
  };
  brandKit?: BrandKit | null;
}

export default function TemplateVoucherStory({ voucher: v, agency, brandKit }: Props) {
  const primaryColor = brandKit?.primary_color || brandKit?.brand_color || agency.brand_color || "#4f46e5";
  const secondaryColor = brandKit?.secondary_color || "#ec4899";
  const bgColor = brandKit?.background_color || "#FFFFFF";
  const textColor = brandKit?.text_color || "#111827";
  const fontHeading = brandKit?.font_heading || "Outfit";
  const fontBody = brandKit?.font_body || "Inter";

  const brand = primaryColor;
  const logoUrl = brandKit?.logo_white_url || brandKit?.logo_url || agency.logo_url;

  const styleVars = {
    "--brand-primary": primaryColor,
    "--brand-secondary": secondaryColor,
    "--brand-heading-font": `"${fontHeading}", sans-serif`,
    "--brand-body-font": `"${fontBody}", sans-serif`,
  } as React.CSSProperties;

  const fontHeadingUrl = fontHeading.replace(/\s+/g, "+");
  const fontBodyUrl = fontBody.replace(/\s+/g, "+");

  return (
    <div
      className="relative flex flex-col w-full h-full overflow-hidden text-white"
      style={{ 
        ...styleVars,
        background: `linear-gradient(135deg, ${primaryColor}4D, #030712)`,
        fontFamily: "var(--brand-body-font, sans-serif)"
      }}
    >
      <link
        href={`https://fonts.googleapis.com/css2?family=${fontHeadingUrl}:wght@400;600;700;800&family=${fontBodyUrl}:wght@400;500;700&display=swap`}
        rel="stylesheet"
      />
      {/* Decorative blobs */}
      <div
        className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-25 blur-[80px]"
        style={{ backgroundColor: primaryColor }}
      />
      <div 
        className="absolute bottom-[-80px] left-[-80px] w-64 h-64 rounded-full opacity-20 blur-[80px]" 
        style={{ backgroundColor: secondaryColor }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-8">
        {/* Agency logo */}
        <div className="flex items-center gap-3 mb-auto">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={agency.name}
              crossOrigin="anonymous"
              className="h-10 w-auto object-contain bg-white/5 backdrop-blur-sm rounded-md p-1"
            />
          ) : (
            <span 
              className="font-black text-xl tracking-tighter"
              style={{ fontFamily: "var(--brand-heading-font, sans-serif)", color: primaryColor }}
            >
              {agency.name}
            </span>
          )}
        </div>

        {/* Destination hero */}
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Próximo destino
            </span>
          </div>
          <h1 
            className="text-4xl font-black leading-none tracking-tighter"
            style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
          >
            {v.destination ?? "Sua Viagem!"}
          </h1>
          {v.general_locator && (
            <div className="mt-2 text-xs font-mono text-white/50">
              LOC: <span className="text-white/70">{v.general_locator}</span>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="flex flex-col gap-3 mt-4">
          {v.flights && v.flights.length > 0 && (
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                <span>Voo Confirmado</span>
                <Plane className="w-4 h-4" />
              </div>
              <div 
                className="flex justify-between items-center text-lg font-bold"
                style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
              >
                <span>{v.flights[0].origin ?? "—"}</span>
                <div className="flex items-center gap-1 text-white/40">
                  <div className="h-px w-8 bg-white/30" />
                  <Plane className="w-3 h-3" />
                  <div className="h-px w-8 bg-white/30" />
                </div>
                <span>{v.flights[0].destination ?? "—"}</span>
              </div>
              <div className="text-[10px] mt-1 text-white/50 text-center">
                {v.flights[0].airline}{" "}
                {v.flights[0].flight_number && `· ${v.flights[0].flight_number}`}
                {v.flights[0].date && ` · ${v.flights[0].date}`}
              </div>
            </div>
          )}

          {v.accommodation && v.accommodation.length > 0 && (
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
                <span>Hospedagem</span>
                <Hotel className="w-4 h-4" />
              </div>
              <div 
                className="text-base font-bold truncate"
                style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
              >
                {v.accommodation[0].name}
              </div>
              {v.accommodation[0].city && (
                <div className="text-[10px] text-white/50 mt-0.5 truncate">
                  {v.accommodation[0].city}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passengers summary */}
        {v.passengers && v.passengers.length > 0 && (
          <div className="mt-4 text-[11px] text-white/50 text-center">
            {v.passengers.length} passageiro{v.passengers.length !== 1 ? "s" : ""} ·{" "}
            {v.passengers.map((p) => p.name.split(" ")[0]).join(", ")}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            Planejado com perfeição por
          </p>
          <p className="text-xs font-bold text-white/70">@{agency.slug}</p>
        </div>
      </div>
    </div>
  );
}
