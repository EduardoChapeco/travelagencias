/**
 * TemplateVoucherEmbarqueA4 — Voucher A4 premium de embarque
 * Exibido dentro do StudioFrame com canvas_format = "a4-portrait"
 * Usado no VoucherStudio (Sprint 3)
 */
import { type Voucher } from "@/services/vouchers";
import { type BrandKit, type CompanyProfile } from "@/lib/agency-context";

interface Props {
  voucher: Voucher;
  agency: {
    name: string;
    slug: string;
    logo_url?: string | null;
    brand_color?: string;
  };
  brandKit?: BrandKit | null;
  companyProfile?: CompanyProfile | null;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[11px] leading-snug">
      <span className="shrink-0 w-28 font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="flex-1 text-slate-800">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span 
          className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"
          style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
        >
          {title}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {children}
    </div>
  );
}

export default function TemplateVoucherEmbarqueA4({ voucher: v, agency, brandKit, companyProfile }: Props) {
  const primaryColor = brandKit?.primary_color || brandKit?.brand_color || agency.brand_color || "#1a56db";
  const secondaryColor = brandKit?.secondary_color || "#D4AF37";
  const bgColor = brandKit?.background_color || "#FFFFFF";
  const textColor = brandKit?.text_color || "#111827";
  const fontHeading = brandKit?.font_heading || "Outfit";
  const fontBody = brandKit?.font_body || "Inter";

  const brand = primaryColor;
  const logoUrl = brandKit?.logo_url || agency.logo_url;

  const formatAddress = (addr: any) => {
    if (!addr || typeof addr !== "object") return "";
    const parts = [
      addr.street ? `${addr.street}${addr.number ? `, ${addr.number}` : ""}` : "",
      addr.complement ? `${addr.complement}` : "",
      addr.neighborhood ? `${addr.neighborhood}` : "",
      addr.city ? `${addr.city} - ${addr.state || ""}` : "",
      addr.zip ? `CEP ${addr.zip}` : ""
    ].filter(Boolean);
    return parts.join(" — ");
  };

  const agencyAddress = companyProfile?.address ? formatAddress(companyProfile.address) : "";

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
      className="w-full min-h-full bg-white text-slate-900 p-8 flex flex-col"
      style={{ 
        ...styleVars,
        fontSize: "12px",
        fontFamily: "var(--brand-body-font, sans-serif)"
      }}
    >
      <link
        href={`https://fonts.googleapis.com/css2?family=${fontHeadingUrl}:wght@400;600;700;800&family=${fontBodyUrl}:wght@400;500;700&display=swap`}
        rel="stylesheet"
      />
      {/* HEADER */}
      <div
        className="flex items-center justify-between mb-6 pb-4 border-b-2"
        style={{ borderColor: brand }}
      >
        <div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={agency.name}
              className="h-10 object-contain"
              crossOrigin="anonymous"
            />
          ) : (
            <div 
              className="text-xl font-black tracking-tighter" 
              style={{ color: brand, fontFamily: "var(--brand-heading-font, sans-serif)" }}
            >
              {agency.name}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">Guia de Embarque</div>
        </div>
        <div className="text-right">
          <div 
            className="text-2xl font-black tracking-tighter text-slate-800"
            style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
          >
            {v.destination ?? "—"}
          </div>
          {v.general_locator && (
            <div className="text-[10px] font-mono mt-0.5 text-slate-500">
              LOC: <span className="font-bold text-slate-700">{v.general_locator}</span>
            </div>
          )}
        </div>
      </div>

      {/* PASSAGEIROS */}
      {v.passengers && v.passengers.length > 0 && (
        <Section title="Passageiros">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {v.passengers.map((p, i) => (
              <div key={i} className="flex flex-col border border-slate-100 rounded-md px-3 py-2">
                <span 
                  className="font-bold text-[12px] text-slate-800"
                  style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
                >
                  {p.name}
                </span>
                {p.document && (
                  <span className="text-[10px] text-slate-400">Doc: {p.document}</span>
                )}
                {p.seat && <span className="text-[10px] text-slate-400">Assento: {p.seat}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* VOOS */}
      {v.flights && v.flights.length > 0 && (
        <Section title="Voos">
          {v.flights.map((f, i) => (
            <div key={i} className="mb-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span 
                  className="font-black text-base tracking-tighter"
                  style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
                >
                  {f.origin ?? "—"} → {f.destination ?? "—"}
                </span>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {f.class ?? "Economy"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Row label="Cia Aérea" value={f.airline} />
                <Row label="Voo" value={f.flight_number} />
                <Row label="Localizador" value={f.locator} />
                <Row label="Data" value={f.date} />
                <Row label="Saída" value={f.departure_time} />
                <Row label="Chegada" value={f.arrival_time} />
                <Row label="Bagagem" value={f.baggage} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* HOSPEDAGEM */}
      {v.accommodation && v.accommodation.length > 0 && (
        <Section title="Hospedagem">
          {v.accommodation.map((a, i) => (
            <div key={i} className="mb-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              <div 
                className="font-bold text-[13px]"
                style={{ fontFamily: "var(--brand-heading-font, sans-serif)" }}
              >
                {a.name}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <Row label="Cidade" value={a.city} />
                <Row label="Regime" value={a.meal_plan} />
                <Row label="Check-in" value={a.checkin} />
                <Row label="Check-out" value={a.checkout} />
                <Row label="Quarto" value={a.room_type} />
                <Row label="Localizador" value={a.confirmation} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* TRANSFERS */}
      {v.transfers && v.transfers.length > 0 && (
        <Section title="Transfers">
          {v.transfers.map((t, i) => (
            <div key={i} className="flex gap-3 text-[11px] items-start mb-1">
              <span className="shrink-0 font-bold text-slate-500">{t.type ?? "Transfer"}</span>
              <span className="flex-1">
                {t.origin} → {t.destination}
              </span>
              {t.date && <span className="text-slate-400 shrink-0">{t.date}</span>}
            </div>
          ))}
        </Section>
      )}

      {/* SEGURO */}
      {v.insurance && Object.keys(v.insurance).length > 0 && (
        <Section title="Seguro de Viagem">
          <div className="grid grid-cols-2 gap-1">
            <Row label="Seguradora" value={(v.insurance as any).provider} />
            <Row label="Apólice" value={(v.insurance as any).policy_number} />
            <Row label="Validade" value={(v.insurance as any).valid_until} />
            <Row label="Telefone 24h" value={(v.insurance as any).emergency_phone} />
          </div>
        </Section>
      )}

      {/* CONTATOS DE EMERGÊNCIA */}
      {v.emergency_contacts && v.emergency_contacts.length > 0 && (
        <Section title="Contatos de Emergência">
          {v.emergency_contacts.map((c: any, i: number) => (
            <div key={i} className="flex gap-4 text-[11px] mb-1">
              <span className="font-bold w-32 shrink-0">{c.name}</span>
              <span className="text-slate-500">{c.phone}</span>
              {c.role && <span className="text-slate-400 text-[10px]">{c.role}</span>}
            </div>
          ))}
        </Section>
      )}

      {/* OBSERVAÇÕES */}
      {v.observations && (
        <Section title="Observações">
          <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
            {v.observations}
          </p>
        </Section>
      )}

      {/* FOOTER */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
        {companyProfile && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-slate-500 font-medium pb-2 border-b border-slate-100/30">
            {companyProfile.cnpj && <div>CNPJ: {companyProfile.cnpj}</div>}
            {companyProfile.phone && <div>Tel: {companyProfile.phone}</div>}
            {companyProfile.email && <div>E-mail: {companyProfile.email}</div>}
            {companyProfile.website && <div className="col-span-2">Site: {companyProfile.website}</div>}
            {agencyAddress && <div className="col-span-2 md:col-span-3">Endereço: {agencyAddress}</div>}
          </div>
        )}
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <div>
            Documento gerado por{" "}
            <span className="font-semibold text-slate-600">TravelOS · {agency.name}</span>
          </div>
          <div className="font-mono">@{agency.slug}</div>
        </div>
      </div>
    </div>
  );
}
