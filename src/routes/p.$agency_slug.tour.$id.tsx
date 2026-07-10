import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPublicTour, enrollPublicTour } from "@/services/public";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { NativeSelect as Select } from "@/components/ui/select";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { money } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  Check,
  Clipboard,
  Copy,
  FileText,
  QrCode,
  Sparkles,
  AlertTriangle,
  XCircle,
  Hotel,
  Star,
  Video,
  BedDouble,
  Calendar,
  MapPin,
  Layers,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/p/$agency_slug/tour/$id")({
  head: ({ params }) => ({ meta: [{ title: `Roteiro · ${params.agency_slug}` }] }),
  component: Page,
});

type TourDay = { day_number: number; title: string; description_md?: string };
type SeatCell = { r: number; c: number; label: string; type: string };

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  let videoId = "";
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
  } catch (e) {
    // ignore
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function Page() {
  const { agency_slug, id } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-tour", agency_slug, id],
    queryFn: async () => {
      const data = await fetchPublicTour(agency_slug as string, id as string);
      return data;
    },
  });

  const [form, setForm] = useState({
    passenger_name: "",
    passenger_cpf: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [extraPassengers, setExtraPassengers] = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // LGPD consent — obrigatório para avançar
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdError, setLgpdError] = useState(false);

  // Checkout steps: 'form' | 'pix' | 'success'
  const [checkoutStep, setCheckoutStep] = useState<"form" | "pix" | "success">("form");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Campaign source (UTM tracking)
  const [utmSource, setUtmSource] = useState("Portal Público");

  // Premium Custom Booking States
  const [selectedPricingTier, setSelectedPricingTier] = useState<any>(null);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const utm = params.get("utm_source") || params.get("utm_campaign") || params.get("ref");
      if (utm) {
        setUtmSource(`Ads: ${utm}`);
      }
    }
  }, []);

  useEffect(() => {
    if (
      q.data?.tour?.pricing_tiers &&
      Array.isArray(q.data.tour.pricing_tiers) &&
      q.data.tour.pricing_tiers.length > 0
    ) {
      setSelectedPricingTier(q.data.tour.pricing_tiers[0]);
    }
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6 text-center">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-200">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Falha ao Carregar Página</h2>
        <p className="text-xs text-gray-500 mt-2 max-w-sm">
          {q.error instanceof Error
            ? q.error.message
            : "Não foi possível carregar os detalhes do pacote de viagem."}
        </p>
        <Button
          onClick={() => q.refetch()}
          className="mt-4 px-4 py-2 rounded-[var(--radius-card)] bg-gray-900 text-white font-bold text-xs shadow hover:bg-gray-800 transition-all cursor-pointer"
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (!q.data || !q.data.tour) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6 text-center">
        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-200">
          <XCircle className="w-6 h-6 text-gray-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Roteiro Indisponível</h2>
        <p className="text-xs text-gray-500 mt-2 max-w-xs">
          Esta viagem em grupo não existe, foi excluída ou está atualmente arquivada como rascunho.
        </p>
      </div>
    );
  }

  const { agency, tour: t, days, layout, assignedSeats: rawAssignedSeats, settings, confirmedCount } = q.data;
  const assignedSeats = (rawAssignedSeats as string[]) || [];
  const seatMap: SeatCell[] =
    layout && Array.isArray(layout.seat_map) ? (layout.seat_map as unknown as SeatCell[]) : [];

  const hotel = t.hotel_details && typeof t.hotel_details === "object" ? t.hotel_details : null;
  const promo = t.promo_media && typeof t.promo_media === "object" ? t.promo_media : null;

  const pricingTiers = Array.isArray(t.pricing_tiers) ? t.pricing_tiers : [];
  const extraOptions = Array.isArray(t.extra_options) ? t.extra_options : [];

  const handlePaxCountChange = (count: number) => {
    setPassengerCount(count);
    const needed = count - 1;
    setExtraPassengers((prev) => {
      const next = [...prev];
      while (next.length < needed) next.push("");
      while (next.length > needed) next.pop();
      return next;
    });
  };

  const handleSeatClick = (seatLabel: string, isSelected: boolean) => {
    setSelectedSeats((prev) => {
      const next = isSelected ? prev.filter((s) => s !== seatLabel) : [...prev, seatLabel];
      if (next.length > 0) {
        handlePaxCountChange(next.length);
      }
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    try {
      setUploadProgress(10);
      setUploadedFileName(file.name);

      const fileExt = file.name.split(".").pop();
      const fileName = `${agency.id}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

      setUploadProgress(30);

      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setUploadProgress(80);

      setUploadedFile(data.path);
      setUploadProgress(100);
      toast.success("Comprovante enviado com sucesso!");
    } catch (err: any) {
      setUploadProgress(0);
      setUploadedFileName(null);
      setUploadedFile(null);
      toast.error(`Erro ao enviar comprovante: ${err.message}`);
    }
  };

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (seatMap.length > 0 && selectedSeats.length === 0) {
      return toast.error("Por favor, selecione pelo menos uma poltrona no ônibus.");
    }
    if (!lgpdConsent) {
      setLgpdError(true);
      document
        .getElementById("lgpd_consent")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast.error("Você precisa aceitar o consentimento LGPD para prosseguir.");
    }
    setLgpdError(false);
    setCheckoutStep("pix");
  }

  async function handleFinalEnrollment() {
    setBusy(true);
    const pax = seatMap.length > 0 ? Math.max(1, selectedSeats.length) : passengerCount;
    const unitPrice = selectedPricingTier
      ? Number(selectedPricingTier.price)
      : Number(t.base_price) || 0;

    let finalNotes = form.notes || "";
    if (selectedPricingTier) {
      finalNotes += `\nAcomodação: ${selectedPricingTier.name} (${money(Number(selectedPricingTier.price))})`;
    }
    if (selectedExtras.length > 0) {
      finalNotes +=
        `\nOpcionais:\n` +
        selectedExtras.map((ext) => `- ${ext.name}: ${money(Number(ext.price))}`).join("\n");
    }
    if (extraPassengers.length > 0) {
      finalNotes +=
        `\nPassageiros adicionais:\n` +
        extraPassengers.map((name, i) => `${i + 2}: ${name}`).join("\n");
    }

    const { error: bErr } = await enrollPublicTour(
      agency.id,
      t.id,
      {
        ...form,
        notes: finalNotes,
        source: utmSource,
      } as any,
      selectedSeats,
      unitPrice,
      pax,
      t.title,
      uploadedFile,
    );

    if (!bErr && uploadedFile) {
      try {
        await supabase
          .from("group_tour_enrollments")
          .update({
            selected_pricing_tier: selectedPricingTier || {},
            selected_extras: selectedExtras,
          })
          .eq("receipt_url", uploadedFile);
      } catch (err) {
        console.error("Erro ao salvar JSONB de tarifas/adicionais:", err);
      }
    }

    setBusy(false);
    if (bErr) {
      toast.error(bErr.message);
    } else {
      toast.success("Inscrição e comprovante Pix recebidos!");
      setCheckoutStep("success");
    }
  }

  const includes = Array.isArray(t.includes) ? (t.includes as string[]) : [];
  const excludes = Array.isArray(t.excludes) ? (t.excludes as string[]) : [];

  const currentUnitPrice = selectedPricingTier
    ? Number(selectedPricingTier.price)
    : Number(t.base_price) || 0;
  const currentExtrasSum = selectedExtras.reduce((sum, ext) => sum + (Number(ext.price) || 0), 0);
  const paxMultiplier = seatMap.length > 0 ? Math.max(1, selectedSeats.length) : passengerCount;
  const totalPrice = (currentUnitPrice + currentExtrasSum) * paxMultiplier;

  const pixKey =
    settings?.pix_key ||
    "00020101021226830014br.gov.bcb.pix2561pix.cora.com.br/v2/esmppoxxnyiscidzsjvy901248012410";

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const embedVideoUrl = promo?.youtube_url ? getYouTubeEmbedUrl(promo.youtube_url) : null;

  return (
    <div
      className="mx-auto min-h-screen bg-[#f4f5f8] pb-24 lg:pb-12 font-sans antialiased text-slate-800"
      style={
        {
          "--color-brand": agency.brand_color || "#151515",
          "--color-brand-foreground": agency.brand_color_fg || "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* Cover Banner */}
      <div className="relative w-full bg-slate-900 border-b border-slate-200">
        {t.cover_image_url ? (
          <div className="relative h-72 md:h-96 w-full overflow-hidden">
            <img src={t.cover_image_url} alt={t.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 md:left-12 max-w-6xl mx-auto flex items-end">
              <div className="text-white space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--color-brand)] text-[var(--color-brand-foreground)] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Excursão Oficial
                </span>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-none text-white max-w-3xl drop-shadow-none">
                  {t.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:text-base font-semibold opacity-90">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[var(--color-brand)]" /> {t.destination}
                  </span>
                  {t.departure_date && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-[var(--color-brand)]" />{" "}
                        {new Date(t.departure_date).toLocaleDateString("pt-BR")}
                      </span>
                    </>
                  )}
                  {t.return_date && (
                    <>
                      <span>→</span>
                      <span>{new Date(t.return_date).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                  {(() => {
                    const limit = t.total_seats || 0;
                    const confirmed = Math.max(assignedSeats.length, confirmedCount || 0);
                    const remaining = Math.max(0, limit - confirmed);
                    const isUnlimited = (t.financial && (t.financial as any).capacity_mode === "UNLIMITED") || t.total_seats === 999999;
                    if (isUnlimited) {
                      return (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                            Vagas Ilimitadas
                          </span>
                        </>
                      );
                    }
                    if (remaining === 0) {
                      return (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                          <span className="text-xs bg-rose-500/20 text-rose-350 px-2 py-0.5 rounded-full font-bold">
                            Esgotado
                          </span>
                        </>
                      );
                    }
                    if (remaining <= 5) {
                      return (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                            Últimas Vagas ({remaining})
                          </span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-16 text-white bg-slate-950">
            <h1 className="text-4xl font-extrabold uppercase tracking-tight">{t.title}</h1>
            <div className="mt-2 text-slate-400 font-semibold">{t.destination}</div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
        {checkoutStep === "form" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Content Area (Itinerary, Hotel, Video) */}
            <div className="lg:col-span-2 space-y-6">
              {/* YouTube Promo Video Embed */}
              {embedVideoUrl && (
                <section className="bg-white border border-slate-200 rounded-[var(--radius-card)] overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Video className="w-5 h-5 text-brand" />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                      Vídeo Promocional
                    </h2>
                  </div>
                  <div className="aspect-video w-full">
                    <iframe
                      src={embedVideoUrl}
                      title="Vídeo promocional"
                      className="w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </section>
              )}

              {/* Hotel Comfort Info */}
              {hotel && hotel.name && (
                <section className="bg-white border border-slate-200 rounded-[var(--radius-card)] p-5 md:p-6 space-y-4 shadow-xs relative">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Hospedagem Inclusa
                      </span>
                      <h2 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                        <Hotel className="w-5 h-5 text-brand shrink-0" />
                        {hotel.name}
                      </h2>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: Number(hotel.stars) || 3 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-[var(--radius-card)] shrink-0">
                      <div>
                        Check-in:{" "}
                        <strong className="text-slate-800">{hotel.check_in || "14:00"}</strong>
                      </div>
                      <div>
                        Check-out:{" "}
                        <strong className="text-slate-800">{hotel.check_out || "12:00"}</strong>
                      </div>
                    </div>
                  </div>

                  {hotel.description && (
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      {hotel.description}
                    </p>
                  )}

                  {hotel.amenities &&
                    Array.isArray(hotel.amenities) &&
                    hotel.amenities.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Comodidades & Lazer
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {hotel.amenities.map((am: string) => (
                            <span
                              key={am}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 shadow-2xs"
                            >
                              ✓ {am}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {hotel.gallery && Array.isArray(hotel.gallery) && hotel.gallery.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Galeria de Fotos
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {hotel.gallery.map((imgUrl: string, imgIdx: number) => (
                          <a
                            key={imgIdx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-video rounded-[var(--radius-card)] overflow-hidden border border-slate-200 group bg-slate-100 block"
                          >
                            <img
                              src={imgUrl}
                              alt={`Foto do hotel ${imgIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Itinerary Chronological */}
              {days.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-[var(--radius-card)] p-5 md:p-6 space-y-4 shadow-xs">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-brand" /> Roteiro Completo
                  </h2>

                  <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
                    {days.map((d: any, i: number) => (
                      <div key={i} className="relative group">
                        {/* Timeline dot */}
                        <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white group-hover:bg-[var(--color-brand)] transition-colors" />

                        <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                          Dia {d.day_number || d.day} — {d.title}
                        </h3>

                        {(d.description_md || d.description) && (
                          <div className="text-xs text-slate-500 mt-1 leading-relaxed prose prose-sm max-w-none prose-slate">
                            <ReactMarkdown>{d.description_md || d.description}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Inclusions & Exclusions */}
              {(includes.length > 0 || excludes.length > 0) && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {includes.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-[var(--radius-card)] p-5 shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" /> O que está Incluso
                      </h3>
                      <ul className="text-xs text-slate-650 space-y-2 font-medium">
                        {includes.map((inc) => (
                          <li key={inc} className="flex items-start gap-1">
                            <span className="text-emerald-500 mr-1.5">✓</span>
                            {inc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excludes.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-[var(--radius-card)] p-5 shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-650 shrink-0" /> O que não está
                        Incluso
                      </h3>
                      <ul className="text-xs text-slate-550 space-y-2 font-medium">
                        {excludes.map((exc) => (
                          <li key={exc} className="flex items-start gap-1">
                            <span className="text-rose-500 mr-1.5">✗</span>
                            {exc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right Reservation sticky widget */}
            <div className="space-y-6">
              <div className="sticky top-6 bg-white border border-slate-200 rounded-[var(--radius-card)] p-5 md:p-6 shadow-none space-y-5">
                <div className="border-b border-slate-100 pb-4 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Reservas Online
                  </span>
                  <div className="text-3xl font-mono font-black text-[var(--color-brand)] mt-1">
                    {money(totalPrice)}
                  </div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider mt-1">
                    Subtotal com taxas inclusas
                  </div>
                </div>

                {/* Capacidade e Vagas */}
                <div className="bg-slate-50 border border-slate-100 rounded-[var(--radius-card)] p-3 text-center space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    Disponibilidade
                  </span>
                  {(t.financial && (t.financial as any).capacity_mode === "UNLIMITED") || t.total_seats === 999999 ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                      ● Vagas Ilimitadas
                    </span>
                  ) : (() => {
                    const limit = t.total_seats || 0;
                    const confirmed = Math.max(assignedSeats.length, confirmedCount || 0);
                    const remaining = Math.max(0, limit - confirmed);
                    if (remaining === 0) {
                      return (t.financial && (t.financial as any).waitlist_enabled) ? (
                        <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1">
                          ⚠ Vagas Esgotadas (Lista de Espera)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-650 flex items-center justify-center gap-1">
                          ✕ Vagas Esgotadas
                        </span>
                      );
                    }
                    return (
                      <div className="space-y-1">
                        <strong className="text-xs font-bold text-slate-800 block">
                          {remaining} {remaining === 1 ? "vaga disponível" : "vagas disponíveis"}
                        </strong>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[var(--color-brand)] h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (confirmed / limit) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-semibold text-slate-500 block font-sans">
                          {confirmed} de {limit} vagas ocupadas
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Pricing Tiers Selection */}
                {pricingTiers.length > 0 ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      1. Escolha a Acomodação
                    </label>
                    <div className="space-y-2">
                      {pricingTiers.map((tier: any, idx: number) => {
                        const isSelected = selectedPricingTier?.name === tier.name;
                        return (
                          <Button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPricingTier(tier)}
                            className={cn(
                              "w-full text-left p-3 rounded-[var(--radius-card)] border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1",
                              isSelected
                                ? "border-brand bg-brand/5 shadow-xs font-bold"
                                : "border-slate-200 bg-white hover:border-slate-400",
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-slate-800">{tier.name}</span>
                              <span className="text-xs font-mono font-bold text-brand">
                                {money(tier.price)}
                              </span>
                            </div>
                            {tier.description && (
                              <span className="text-[10px] text-slate-500 font-medium block leading-snug">
                                {tier.description}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 bg-slate-50 border border-slate-100 rounded-[var(--radius-card)] p-3 text-xs text-slate-655 text-center">
                    Tarifa Base Individual:{" "}
                    <strong className="text-brand font-mono">{money(Number(t.base_price))}</strong>
                  </div>
                )}

                {/* Upgrades Extras Selection */}
                {extraOptions.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      2. Serviços Opcionais
                    </label>
                    <div className="space-y-2">
                      {extraOptions.map((ext: any, idx: number) => {
                        const isChecked = selectedExtras.some((x) => x.name === ext.name);
                        return (
                          <Button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedExtras(
                                  selectedExtras.filter((x) => x.name !== ext.name),
                                );
                              } else {
                                setSelectedExtras([...selectedExtras, ext]);
                              }
                            }}
                            className={cn(
                              "w-full text-left p-3 rounded-[var(--radius-card)] border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3",
                              isChecked
                                ? "border-emerald-300 bg-emerald-50/20 font-bold"
                                : "border-slate-200 bg-white hover:border-slate-400",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold block text-slate-850 truncate">
                                {ext.name}
                              </span>
                              {ext.description && (
                                <span className="text-[9px] text-slate-500 truncate block font-medium mt-0.5">
                                  {ext.description}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">
                              +{money(ext.price)}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Passenger Selector (if no seats) */}
                {seatMap.length === 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <Field label="3. Quantidade de Passageiros">
                      <Select
                        value={passengerCount}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handlePaxCountChange(Number(e.target.value))
                        }
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "passageiro" : "passageiros"}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                )}

                {/* Scroll button to Checkout */}
                <Button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById("checkout_anchor")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full flex h-11 items-center justify-center bg-[var(--color-brand)] text-[var(--color-brand-foreground)] rounded-[var(--radius-card)] font-bold uppercase tracking-wider text-xs transition-opacity hover:opacity-90 cursor-pointer shadow-none"
                >
                  Reservar Agora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Seat Map & Forms */}
        {checkoutStep === "form" && (
          <div id="checkout_anchor" className="mt-8 space-y-8 scroll-mt-6">
            {/* Seat Map Selector */}
            {seatMap.length > 0 && (
              <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-black text-slate-850 mb-1 text-center uppercase tracking-wider">
                  Escolha suas Poltronas
                </h2>
                <p className="text-xs text-slate-400 text-center mb-5 font-semibold">
                  Selecione poltronas livres para os passageiros.
                </p>
                <div className="flex justify-center overflow-x-auto py-2">
                  <div
                    className="p-4 border border-slate-100 rounded-[var(--radius-card)] bg-slate-50/50"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${layout?.cols ?? 5}, minmax(0, 1fr))`,
                      gap: "8px",
                    }}
                  >
                    {seatMap.map((cell, idx) => {
                      if (cell.type !== "seat") {
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "h-10 w-10 flex items-center justify-center text-[10px] rounded text-slate-400 font-bold",
                              cell.type === "aisle" && "text-transparent",
                              cell.type === "wc" && "bg-blue-50 text-blue-700",
                              cell.type === "door" && "bg-amber-50 text-amber-700",
                            )}
                          >
                            {cell.type === "wc" ? "WC" : cell.type === "door" ? "P." : ""}
                          </div>
                        );
                      }
                      const isAssigned = assignedSeats.includes(cell.label);
                      const isSelected = selectedSeats.includes(cell.label);
                      return (
                        <Button
                          key={idx}
                          type="button"
                          disabled={isAssigned}
                          onClick={() => handleSeatClick(cell.label, isSelected)}
                          className={cn(
                            "h-10 w-10 rounded-full border text-xs font-mono font-bold transition-colors flex flex-col items-center justify-center cursor-pointer",
                            isAssigned
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                              : isSelected
                                ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-foreground)] shadow-xs"
                                : "border-slate-300 bg-white hover:border-slate-400",
                          )}
                        >
                          {cell.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded bg-white border border-slate-300" /> Livre
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded bg-[var(--color-brand)]" /> Selecionada
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-200" />{" "}
                    Ocupada
                  </div>
                </div>
              </div>
            )}

            {/* Registration Form */}
            <form
              onSubmit={handleFormSubmit}
              className="space-y-6 rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
            >
              <div className="mb-2 border-b border-slate-100 pb-4">
                <h2 className="text-base font-black text-slate-850 uppercase tracking-wider">
                  Identificação & Cadastro
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Insira as informações de contato do responsável pela reserva.
                </p>
              </div>

              <Field label="Nome completo *">
                <Input
                  required
                  value={form.passenger_name}
                  onChange={(e) => setForm({ ...form, passenger_name: e.target.value })}
                  className="h-11 text-sm rounded-[var(--radius-card)]"
                  placeholder="Nome completo do responsável"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail *">
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-11 text-sm rounded-[var(--radius-card)]"
                    placeholder="voce@exemplo.com"
                  />
                </Field>
                <Field label="WhatsApp *">
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-11 text-sm rounded-[var(--radius-card)]"
                    placeholder="(00) 90000-0000"
                  />
                </Field>
              </div>

              <Field label="CPF *">
                <Input
                  required
                  value={form.passenger_cpf}
                  onChange={(e) => setForm({ ...form, passenger_cpf: e.target.value })}
                  className="h-11 text-sm rounded-[var(--radius-card)]"
                  placeholder="000.000.000-00"
                />
              </Field>

              {passengerCount > 1 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Demais passageiros
                  </h3>
                  {extraPassengers.map((name, idx) => (
                    <Field key={idx} label={`Nome Completo - Passageiro ${idx + 2} *`}>
                      <Input
                        required
                        value={name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtraPassengers((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className="h-10 text-xs rounded-[var(--radius-card)]"
                        placeholder="Nome completo"
                      />
                    </Field>
                  ))}
                </div>
              )}

              <Field label="Observações de Viagem (Opcional)">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="min-h-[80px] rounded-[var(--radius-card)] text-xs"
                  placeholder="Alergias, restrições alimentares, solicitações especiais..."
                />
              </Field>

              {/* LGPD Consent */}
              <div
                id="lgpd_consent_wrapper"
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors",
                  lgpdError
                    ? "border-red-300 bg-red-50/50"
                    : lgpdConsent
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-200 bg-slate-50/50",
                )}
              >
                <input
                  type="checkbox"
                  id="lgpd_consent"
                  checked={lgpdConsent}
                  onChange={(e) => {
                    setLgpdConsent(e.target.checked);
                    if (e.target.checked) setLgpdError(false);
                  }}
                  className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 rounded border-slate-350 text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                />
                <label
                  htmlFor="lgpd_consent"
                  className="text-xs text-slate-650 leading-relaxed cursor-pointer select-none font-medium font-sans"
                >
                  Li e concordo com o processamento dos meus dados pessoais para fins de cadastro,
                  contato e reserva desta viagem, em conformidade com a{" "}
                  <strong className="text-slate-800">
                    Lei Geral de Proteção de Dados (LGPD — Lei n.º 13.709/2018)
                  </strong>
                  . Seus dados serão tratados exclusivamente para gestão da viagem e não serão
                  compartilhados com terceiros sem o seu consentimento. *
                </label>
              </div>
              {lgpdError && (
                <p className="text-xs text-red-600 font-semibold pl-1 flex items-center gap-1">
                  <span>⚠</span> Consentimento LGPD obrigatório para prosseguir.
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={!lgpdConsent}
                className="w-full h-12 text-sm uppercase tracking-widest font-bold bg-[var(--color-brand)] text-[var(--color-brand-foreground)] rounded-[var(--radius-card)] transition-all cursor-pointer disabled:opacity-40"
              >
                Avançar para Pagamento — {money(totalPrice)}
              </PrimaryButton>

              {agency?.whatsapp && (
                <a
                  href={`https://wa.me/${agency.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá! Tenho interesse no grupo "${t.title}" e gostaria de tirar algumas dúvidas.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-sm font-bold text-emerald-700 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.257-.002 9.532-4.282 9.534-9.544.001-2.55-1.01-4.945-2.846-6.782A9.458 9.458 0 0012.008 1.53c-5.26 0-9.536 4.281-9.538 9.543-.001 1.636.485 3.196 1.4 4.597L2.83 19.38l3.817-1.002.001-.001-.001-.001zm11.721-6.425c-.29-.145-1.714-.847-1.979-.942-.266-.096-.459-.145-.653.146-.193.29-.748.942-.917 1.135-.169.193-.338.217-.628.072-2.316-1.16-3.23-1.63-4.524-3.856-.289-.499.29-.464.829-1.538.085-.17.042-.317-.02-.462-.064-.145-.653-1.573-.895-2.152-.236-.569-.475-.49-.652-.499-.169-.008-.362-.008-.556-.008a1.07 1.07 0 00-.773.362c-.266.29-1.014.992-1.014 2.417 0 1.425 1.039 2.798 1.184 2.993.145.193 2.044 3.122 4.951 4.38.692.3 1.232.479 1.652.613.696.222 1.329.19 1.83.115.558-.083 1.714-.7 1.956-1.376.242-.676.242-1.256.17-1.377-.073-.121-.266-.193-.556-.339z" />
                  </svg>
                  Dúvidas? Fale Conosco no WhatsApp
                </a>
              )}
            </form>
          </div>
        )}

        {/* Step 2: PIX Checkout voucher upload */}
        {checkoutStep === "pix" && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[var(--radius-card)] p-6 md:p-8 shadow-xs space-y-6">
            <div className="text-center">
              <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <QrCode className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-slate-850 uppercase tracking-wider">
                Pagamento Pix Garantido
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Conclua sua compra enviando a transferência instantânea Pix no valor de{" "}
                <strong>{money(totalPrice)}</strong>.
              </p>
            </div>

            {/* Pix Copy and paste */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {pixKey.startsWith("000201")
                  ? "Código Copia e Cola Pix:"
                  : "Chave Pix para Transferência:"}
              </label>
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-[var(--radius-card)] px-4 py-3 text-xs font-mono select-all overflow-x-auto whitespace-nowrap">
                <span>{pixKey}</span>
                <Button
                  type="button"
                  onClick={copyPix}
                  className="ml-auto text-slate-400 hover:text-slate-900 cursor-pointer p-1 shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Upload box */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Anexar Comprovante Pix
              </h3>

              {!uploadedFile ? (
                <div className="border-2 border-dashed border-slate-300 rounded-[var(--radius-card)] p-6 text-center hover:bg-slate-50/50 transition-colors relative">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs text-slate-655 block font-semibold">
                    Arraste ou clique para enviar o PDF ou Imagem do Pix
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />

                  {uploadProgress > 0 && (
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-[var(--color-brand)] h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[var(--radius-card)] p-4 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{uploadedFileName}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      setUploadedFileName(null);
                    }}
                    className="text-slate-500 hover:text-danger font-semibold"
                  >
                    Remover
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <GhostButton onClick={() => setCheckoutStep("form")} className="w-1/3 h-11 text-xs">
                Voltar
              </GhostButton>
              <PrimaryButton
                onClick={handleFinalEnrollment}
                disabled={busy || !uploadedFile}
                className="flex-1 h-11 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--radius-card)] cursor-pointer disabled:opacity-40"
              >
                {busy ? "Enviando..." : "Confirmar Inscrição"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {checkoutStep === "success" && (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-[var(--radius-card)] p-8 shadow-none text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-855 uppercase tracking-wider font-sans">
                Inscrição Solicitada!
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">
                Nossa equipe recebeu a sua inscrição e o comprovante de PIX. Enviaremos a
                confirmação oficial no WhatsApp informado em instantes.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[var(--radius-card)] p-4.5 text-left text-xs space-y-2.5 font-medium">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 font-sans">Viagem/Grupo:</span>
                <strong className="text-slate-800 text-right uppercase">{t.title}</strong>
              </div>
              {selectedPricingTier && (
                <div className="flex justify-between gap-3 font-sans">
                  <span className="text-slate-500">Acomodação:</span>
                  <strong className="text-slate-800 text-right">{selectedPricingTier.name}</strong>
                </div>
              )}
              {selectedExtras.length > 0 && (
                <div className="flex justify-between gap-3 font-sans">
                  <span className="text-slate-500">Opcionais:</span>
                  <strong className="text-slate-800 text-right">
                    {selectedExtras.map((x) => x.name).join(", ")}
                  </strong>
                </div>
              )}
              <div className="flex justify-between gap-3 font-sans">
                <span className="text-slate-500">Poltronas:</span>
                <strong className="text-slate-800 text-right">
                  {selectedSeats.join(", ") || "Em alocação"}
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2.5 font-bold font-sans">
                <span className="text-slate-800">Total Pago:</span>
                <strong className="text-emerald-700 font-mono text-sm">{money(totalPrice)}</strong>
              </div>
            </div>

            <Button
              onClick={() => {
                setCheckoutStep("form");
                setUploadedFile(null);
                setSelectedSeats([]);
                setLgpdConsent(false);
                setLgpdError(false);
                setSelectedExtras([]);
                setForm({ passenger_name: "", passenger_cpf: "", email: "", phone: "", notes: "" });
              }}
              className="w-full h-11 text-xs font-bold uppercase tracking-wider bg-slate-900 text-white rounded-[var(--radius-card)] cursor-pointer hover:bg-slate-800 shadow-none"
            >
              Comprar outra passagem
            </Button>
          </div>
        )}
        {/* Bottom Sticky Mobile CTA Bar */}
        {checkoutStep === "form" && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">
                Subtotal
              </span>
              <span className="text-lg font-mono font-black text-[var(--color-brand)] mt-1">
                {money(totalPrice)}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => {
                document
                  .getElementById("checkout_anchor")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="px-6 h-10 bg-[var(--color-brand)] text-[var(--color-brand-foreground)] font-bold text-xs uppercase tracking-wider rounded-[var(--radius-card)] shadow-none active:scale-95 transition-transform"
            >
              Reservar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
