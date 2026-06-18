import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPublicTour, enrollPublicTour } from "@/services/public";
import { Field, Input, PrimaryButton, Textarea, Select, GhostButton, money } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Check, Clipboard, Copy, FileText, QrCode, Sparkles } from "lucide-react";

export const Route = createFileRoute("/p/$agency_slug/tour/$id")({
  head: ({ params }) => ({ meta: [{ title: `Roteiro · ${params.agency_slug}` }] }),
  component: Page,
});

type TourDay = { day_number: number; title: string; description_md?: string };
type SeatCell = { r: number; c: number; label: string; type: string };

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
  
  // Checkout steps: 'form' | 'pix' | 'success'
  const [checkoutStep, setCheckoutStep] = useState<"form" | "pix" | "success">("form");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Campaign source (UTM tracking)
  const [utmSource, setUtmSource] = useState("Portal Público");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const utm = params.get("utm_source") || params.get("utm_campaign") || params.get("ref");
      if (utm) {
        setUtmSource(`Ads: ${utm}`);
      }
    }
  }, []);

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!q.data || !q.data.tour) {
    return <div className="p-10 text-center text-sm font-semibold text-gray-500 bg-[#f7f5ef] min-h-screen">Roteiro não disponível</div>;
  }

  const { agency, tour: t, days, layout, assignedSeats } = q.data;
  const seatMap: SeatCell[] =
    layout && Array.isArray(layout.seat_map) ? (layout.seat_map as unknown as SeatCell[]) : [];

  // Update extra passenger fields when count changes
  const handlePaxCountChange = (count: number) => {
    setPassengerCount(count);
    const needed = count - 1;
    setExtraPassengers(prev => {
      const next = [...prev];
      while (next.length < needed) next.push("");
      while (next.length > needed) next.pop();
      return next;
    });
  };

  // Sync selected seats count with passengerCount if seatMap is active
  const handleSeatClick = (seatLabel: string, isSelected: boolean) => {
    setSelectedSeats((prev) => {
      const next = isSelected ? prev.filter((s) => s !== seatLabel) : [...prev, seatLabel];
      if (next.length > 0) {
        handlePaxCountChange(next.length);
      }
      return next;
    });
  };

  // Mock upload of PIX receipt
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadedFile(file.name);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (seatMap.length > 0 && selectedSeats.length === 0) {
      return toast.error("Por favor, selecione pelo menos uma poltrona no ônibus.");
    }
    // Proceed to B2C PIX details
    setCheckoutStep("pix");
  }

  async function handleFinalEnrollment() {
    setBusy(true);
    const pax = seatMap.length > 0 ? Math.max(1, selectedSeats.length) : passengerCount;
    const unitPrice = Number(t.base_price) || 0;

    // Build extra notes with additional passenger names
    let finalNotes = form.notes || "";
    if (extraPassengers.length > 0) {
      finalNotes += `\nPassageiros adicionais:\n` + extraPassengers.map((name, i) => `${i + 2}: ${name}`).join("\n");
    }
    if (uploadedFile) {
      finalNotes += `\n[PIX VOUCHER UPLOADED: ${uploadedFile}]`;
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
    );

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
  const totalPrice = (Number(t.base_price) || 0) * (seatMap.length > 0 ? Math.max(1, selectedSeats.length) : passengerCount);

  // Copy Pix key
  const copyPix = () => {
    const pixCode = "00020101021226830014br.gov.bcb.pix2561pix.cora.com.br/v2/esmppoxxnyiscidzsjvy901248012410";
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código Copia e Cola Pix copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mx-auto min-h-screen bg-[#f7f5ef] pb-12 font-sans"
      style={
        {
          "--color-brand": agency.brand_color || "#ff4f9a",
          "--color-brand-foreground": agency.brand_color_fg || "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* Cover Banner */}
      <div className="relative w-full bg-white border-b border-gray-200">
        {t.cover_image_url ? (
          <div className="relative h-64 md:h-80 w-full overflow-hidden">
            <img src={t.cover_image_url} alt={t.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-6 left-6 right-6 md:left-12 max-w-4xl mx-auto flex items-end">
              <div className="text-white">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
                  {t.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-medium opacity-90">
                  <span>{t.destination}</span>
                  {t.departure_date && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      <span>{new Date(t.departure_date).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                  {t.return_date && (
                    <>
                      <span>→</span>
                      <span>{new Date(t.return_date).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{t.title}</h1>
            <div className="mt-2 text-muted-foreground">{t.destination}</div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        
        {/* Price Tag & Description */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-10">
          <div>
            <div className="text-3xl font-mono font-bold tracking-tight text-[#ff4f9a]">
              {Number(t.base_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-bold">
              Por Passageiro
            </div>
          </div>
          {t.important_notes && (
            <div className="bg-white border border-gray-200 p-4 rounded-xl text-sm leading-relaxed max-w-lg text-gray-700 shadow-sm">
              {t.important_notes}
            </div>
          )}
        </div>

        {/* Steps display */}
        {checkoutStep === "form" && (
          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Itinerary Column */}
            <div className="md:col-span-2 space-y-6">
              {days.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight border-b border-gray-200 pb-2 text-gray-800">
                    Roteiro Dia a Dia
                  </h2>
                  <ol className="space-y-3">
                    {days.map((d: any, i: number) => (
                      <li
                        key={i}
                        className="rounded-xl border border-gray-200 bg-white p-4 relative overflow-hidden group hover:border-[#ff4f9a]/30 transition-colors shadow-sm"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 group-hover:bg-[#ff4f9a] transition-colors" />
                        <div className="font-bold text-sm text-gray-800 ml-2">
                          Dia {d.day_number} — {d.title}
                        </div>
                        <div className="text-xs text-gray-500 ml-2 mt-2 leading-relaxed">
                          {d.description_md}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            {/* Inclusions / Checkout column */}
            <div className="space-y-6">
              {(includes.length > 0 || excludes.length > 0) && (
                <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  {includes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Inclui</h3>
                      <ul className="text-xs text-gray-700 mt-2 space-y-1.5">
                        {includes.map((inc) => (
                          <li key={inc} className="flex items-center gap-1.5">✓ {inc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excludes.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Não inclui</h3>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1.5">
                        {excludes.map((exc) => (
                          <li key={exc} className="flex items-center gap-1.5">✗ {exc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {/* Checkout Steps Control */}
        {checkoutStep === "form" && (
          <div className="mt-8 space-y-8">
            
            {/* Seat Map */}
            {seatMap.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-4 text-center">Escolha suas Poltronas no Ônibus</h2>
                <div className="flex justify-center overflow-x-auto py-2">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                      gap: "8px",
                    }}
                  >
                    {seatMap.map((cell, idx) => {
                      if (cell.type !== "seat") {
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "h-10 w-10 flex items-center justify-center text-[10px] rounded text-gray-400 font-bold",
                              cell.type === "aisle" && "text-transparent",
                              cell.type === "wc" && "bg-blue-50 text-blue-700",
                              cell.type === "door" && "bg-amber-50 text-amber-700",
                            )}
                          >
                            {cell.type === "wc" ? "WC" : cell.type === "door" ? "Porta" : ""}
                          </div>
                        );
                      }
                      const isAssigned = assignedSeats.includes(cell.label);
                      const isSelected = selectedSeats.includes(cell.label);
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isAssigned}
                          onClick={() => handleSeatClick(cell.label, isSelected)}
                          className={cn(
                            "h-10 w-10 rounded-md border text-xs font-bold transition-colors flex flex-col items-center justify-center cursor-pointer",
                            isAssigned
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 border-gray-200"
                              : isSelected
                                ? "border-[#ff4f9a] bg-[#ff4f9a] text-white"
                                : "border-gray-300 bg-white hover:border-[#ff4f9a]/50 hover:bg-gray-50",
                          )}
                        >
                          <span>{cell.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-white border border-gray-300" /> Livre
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-[#ff4f9a]" /> Selecionada
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-gray-100 border border-gray-200" /> Ocupada
                  </div>
                </div>
              </div>
            )}

            {/* Passenger Count Selection (when no seat map is active) */}
            {seatMap.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm max-w-sm">
                <Field label="Quantidade de Passageiros">
                  <Select value={passengerCount} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePaxCountChange(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "passageiro" : "passageiros"}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-2 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold tracking-tight text-gray-800">Identificação & Cadastro</h2>
                <p className="text-xs text-gray-500">Insira as informações de contato do responsável pela reserva.</p>
              </div>

              <Field label="Nome completo *">
                <Input
                  required
                  value={form.passenger_name}
                  onChange={(e) => setForm({ ...form, passenger_name: e.target.value })}
                  className="h-11 text-sm"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail *">
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-11 text-sm"
                  />
                </Field>
                <Field label="WhatsApp *">
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-11 text-sm"
                    placeholder="(49) 9..."
                  />
                </Field>
              </div>

              <Field label="CPF *">
                <Input
                  required
                  value={form.passenger_cpf}
                  onChange={(e) => setForm({ ...form, passenger_cpf: e.target.value })}
                  className="h-11 text-sm"
                  placeholder="000.000.000-00"
                />
              </Field>

              {/* Render Extra passenger names if count > 1 */}
              {passengerCount > 1 && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Demais passageiros</h3>
                  {extraPassengers.map((name, idx) => (
                    <Field key={idx} label={`Nome Completo - Passageiro ${idx + 2} *`}>
                      <Input
                        required
                        value={name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtraPassengers(prev => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className="h-10 text-xs"
                      />
                    </Field>
                  ))}
                </div>
              )}

              <Field label="Observações de Viagem (Opcional)">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="min-h-[80px]"
                  placeholder="Alergias, restrições alimentares, solicitações especiais..."
                />
              </Field>

              <PrimaryButton
                type="submit"
                className="w-full h-12 text-sm uppercase tracking-widest font-bold bg-[#ff4f9a] hover:bg-[#e03d80] text-white rounded-xl transition-all cursor-pointer"
              >
                Avançar para Pagamento — {money(totalPrice)}
              </PrimaryButton>
            </form>
          </div>
        )}

        {/* Step 2: PIX Checkout voucher upload */}
        {checkoutStep === "pix" && (
          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="text-center">
              <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Pagamento Pix Garantido</h2>
              <p className="text-xs text-gray-500 mt-1">Conclua sua compra enviando a transferência instantânea Pix no valor de <strong>{money(totalPrice)}</strong>.</p>
            </div>

            {/* Pix Copy and paste */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Código Copia e Cola Pix:</label>
              <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono select-all overflow-x-auto whitespace-nowrap">
                <span>00020101021226830014br.gov.bcb.pix2561pix.cora.com.br/v2/esmppoxxnyiscidzsjvy901248012410</span>
                <button
                  type="button"
                  onClick={copyPix}
                  className="ml-auto text-gray-400 hover:text-gray-900 cursor-pointer p-1"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Upload box */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Anexar Comprovante Pix</h3>
              
              {!uploadedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <span className="text-xs text-gray-600 block">Arraste ou clique para enviar o PDF ou Imagem do Pix</span>
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                  
                  {uploadProgress > 0 && (
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#ff4f9a] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{uploadedFile}</span>
                  </div>
                  <button type="button" onClick={() => setUploadedFile(null)} className="text-gray-500 hover:text-danger font-semibold">Remover</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <GhostButton onClick={() => setCheckoutStep("form")} className="w-1/3 h-11 text-xs">Voltar</GhostButton>
              <PrimaryButton
                onClick={handleFinalEnrollment}
                disabled={busy || !uploadedFile}
                className="flex-1 h-11 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer disabled:opacity-40"
              >
                {busy ? "Enviando..." : "Confirmar Inscrição"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {checkoutStep === "success" && (
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inscrição Solicitada com Sucesso!</h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Nossa equipe financeira e operacional recebeu a sua inscrição e comprovante de PIX. Enviaremos a confirmação oficial no WhatsApp informado em instantes.
              </p>
            </div>
            
            <div className="bg-[#f7f5ef] border border-gray-200 rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Viagem/Grupo:</span>
                <strong className="text-gray-800">{t.title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Poltronas:</span>
                <strong className="text-gray-800">{selectedSeats.join(", ") || "Em alocação"}</strong>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <span className="text-gray-800">Total Pago:</span>
                <strong className="text-emerald-600 font-mono">{money(totalPrice)}</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setCheckoutStep("form");
                setUploadedFile(null);
                setSelectedSeats([]);
                setForm({ passenger_name: "", passenger_cpf: "", email: "", phone: "", notes: "" });
              }}
              className="w-full h-11 text-xs font-bold uppercase tracking-wider bg-gray-900 text-white rounded-xl cursor-pointer hover:bg-gray-800"
            >
              Comprar outra passagem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
