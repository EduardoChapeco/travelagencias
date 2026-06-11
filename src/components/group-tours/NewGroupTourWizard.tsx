import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, Check, ChevronRight, ChevronLeft, Map, Plane, Bus, Ship, Train, Link as LinkIcon, Plus, Trash2, Upload
} from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, StatusBadge } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STEPS = ["Essencial", "Data & Vagas", "Valores & Inclusos", "Itinerário & Mídia", "Revisão"];

type ItineraryDay = { day: number; title: string; description: string };

export function NewGroupTourWizard({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [transportType, setTransportType] = useState("air");
  const [slug, setSlug] = useState("");
  
  const [departure, setDeparture] = useState("");
  const [ret, setRet] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [seats, setSeats] = useState(20);
  const [busLayout, setBusLayout] = useState("");

  const [price, setPrice] = useState<number>(0);
  const [includes, setIncludes] = useState<string[]>([]);
  const [newInclude, setNewInclude] = useState("");
  const [excludes, setExcludes] = useState<string[]>([]);
  const [newExclude, setNewExclude] = useState("");
  const [hasFlights, setHasFlights] = useState(false);

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [isPublic, setIsPublic] = useState(false);
  const [status, setStatus] = useState("draft");

  const busesQ = useQuery({
    queryKey: ["bus-layouts", agencyId],
    queryFn: async () => {
      const { data } = await supabase.from("bus_layouts").select("id, name").eq("agency_id", agencyId);
      return data ?? [];
    },
  });

  const generateSlug = () => {
    if (!title) return;
    setSlug(slugify(title) + "-" + Math.random().toString(36).slice(2, 6));
  };

  const handleNext = () => {
    if (step === 0 && (!title || !destination)) {
      toast.error("Preencha o título e destino para continuar.");
      return;
    }
    if (step === 0 && !slug) generateSlug();
    if (step === 1 && (!departure || !seats)) {
      toast.error("Preencha a data de saída e o total de vagas.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${agencyId}/tours/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('agency_media_bucket')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('agency_media_bucket').getPublicUrl(filePath);
      setCoverUrl(data.publicUrl);
      toast.success("Imagem carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da imagem.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!title || !departure || !seats) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    
    const payload = {
      agency_id: agencyId,
      title,
      slug: slug || (slugify(title) + "-" + Math.random().toString(36).slice(2, 6)),
      destination: destination || null,
      transport_type: transportType,
      departure_date: departure || null,
      return_date: ret || null,
      registration_deadline: regDeadline || null,
      total_seats: seats,
      base_price: price,
      includes,
      excludes,
      itinerary,
      cover_image_url: coverUrl || null,
      is_public: isPublic,
      status,
      bus_layout_id: busLayout || null,
    };

    const { error } = await supabase.from("group_tours").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Excursão criada com sucesso!");
    onCreated();
  }

  return (
    <SheetPage isOpen={true} onClose={onClose} title="Nova Excursão em Grupo">
      <p className="text-xs text-muted-foreground mb-4">Configure as informações do seu pacote passo a passo.</p>

        {/* Stepper progress */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-8 py-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 ${i === step ? "opacity-100" : "opacity-40"}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step ? "bg-success text-success-foreground" : i === step ? "bg-brand text-brand-foreground" : "bg-surface-alt text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-widest hidden md:block ${
                i < step ? "text-success" : i === step ? "text-brand" : "text-muted-foreground"
              }`}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-2" />}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface/30">
          <div className="mx-auto max-w-2xl space-y-6">
            
            {/* STEP 0: ESSENTIALS */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Título do Pacote *">
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Ex: Réveillon Mágico em Gramado 2027" 
                    className="text-lg font-medium"
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Destino Principal *">
                    <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Gramado, RS" />
                  </Field>
                  <Field label="Meio de Transporte">
                    <Select value={transportType} onChange={(e) => setTransportType(e.target.value)}>
                      <option value="air">Aéreo</option>
                      <option value="bus">Rodoviário</option>
                      <option value="cruise">Marítimo / Cruzeiro</option>
                      <option value="train">Trem</option>
                      <option value="mixed">Misto</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Slug (URL Amigável)">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground bg-surface-alt px-3 py-2 rounded-md border border-border text-sm">/tour/</span>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="reveillon-gramado-2027" />
                    <GhostButton type="button" onClick={generateSlug} className="shrink-0 h-9">Gerar</GhostButton>
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 1: DATES & SEATS */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Vagas Disponíveis">
                    <Input type="number" disabled value="" />
                  </Field>
                  <Field label="Data de Saída *">
                    <Input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} />
                  </Field>
                  <Field label="Data de Retorno">
                    <Input type="date" value={ret} onChange={(e) => setRet(e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prazo limite p/ inscrição">
                    <Input type="date" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} />
                  </Field>
                  <Field label="Total de Vagas *">
                    <Input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value) || 0)} />
                  </Field>
                </div>
                {transportType === 'bus' && (
                  <Field label="Mapa de Assentos (Frota de Ônibus)">
                    <Select value={busLayout} onChange={(e) => setBusLayout(e.target.value)}>
                      <option value="">Sem ônibus atrelado (Não controlar mapa)</option>
                      {busesQ.data?.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Ao atrelar um ônibus, as vendas permitirão a escolha da poltrona.</p>
                  </Field>
                )}
              </div>
            )}

            {/* STEP 2: PRICING & INCLUSIONS */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Preço Base por Pessoa (R$) *">
                  <Input 
                    type="number" 
                    min={0} 
                    step="0.01" 
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value) || 0)} 
                    className="text-lg font-mono text-brand"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm mt-8">
                  <input
                    type="checkbox"
                    checked={hasFlights}
                    onChange={(e) => setHasFlights(e.target.checked)}
                    className="rounded border-border text-brand focus:ring-brand"
                  />
                  Incluir Voos no Pacote Base
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Includes */}
                  <div className="space-y-3">
                    <Field label="O que está incluso">
                      <div className="flex gap-2">
                        <Input value={newInclude} onChange={e => setNewInclude(e.target.value)} onKeyDown={e => {
                          if(e.key === 'Enter') { e.preventDefault(); if(newInclude.trim()) { setIncludes([...includes, newInclude.trim()]); setNewInclude(""); } }
                        }} placeholder="Ex: Café da manhã" />
                        <GhostButton type="button" onClick={() => { if(newInclude.trim()) { setIncludes([...includes, newInclude.trim()]); setNewInclude(""); } }}>
                          <Plus className="h-4 w-4" />
                        </GhostButton>
                      </div>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      {includes.map((inc, i) => (
                        <div key={i} className="flex items-center justify-between bg-success/10 text-success text-xs py-1.5 px-3 rounded-md border border-success/20">
                          <span className="flex items-center gap-1.5"><Check className="h-3 w-3" /> {inc}</span>
                          <button onClick={() => setIncludes(includes.filter((_, idx) => idx !== i))} className="hover:text-danger"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                      {includes.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhum item adicionado.</div>}
                    </div>
                  </div>

                  {/* Excludes */}
                  <div className="space-y-3">
                    <Field label="O que NÃO está incluso">
                      <div className="flex gap-2">
                        <Input value={newExclude} onChange={e => setNewExclude(e.target.value)} onKeyDown={e => {
                          if(e.key === 'Enter') { e.preventDefault(); if(newExclude.trim()) { setExcludes([...excludes, newExclude.trim()]); setNewExclude(""); } }
                        }} placeholder="Ex: Taxa de turismo" />
                        <GhostButton type="button" onClick={() => { if(newExclude.trim()) { setExcludes([...excludes, newExclude.trim()]); setNewExclude(""); } }}>
                          <Plus className="h-4 w-4" />
                        </GhostButton>
                      </div>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      {excludes.map((exc, i) => (
                        <div key={i} className="flex items-center justify-between bg-danger/10 text-danger text-xs py-1.5 px-3 rounded-md border border-danger/20">
                          <span className="flex items-center gap-1.5"><X className="h-3 w-3" /> {exc}</span>
                          <button onClick={() => setExcludes(excludes.filter((_, idx) => idx !== i))} className="hover:text-danger/70"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                      {excludes.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhum item adicionado.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ITINERARY & MEDIA */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Imagem de Capa (Banner)">
                  {coverUrl ? (
                    <div className="relative w-full h-40 rounded-xl border border-border overflow-hidden group">
                      <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => setCoverUrl("")} className="text-danger flex items-center gap-2 text-sm font-bold bg-surface px-4 py-2 rounded-lg border border-danger/30 hover:bg-danger hover:text-white transition-colors">
                          <Trash2 className="h-4 w-4" /> Remover Imagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" id="cover-upload" />
                      <label htmlFor="cover-upload" className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-border/60 bg-surface hover:border-brand/50 hover:bg-surface-alt/50 cursor-pointer transition-colors">
                        {uploading ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-2" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        )}
                        <span className="text-sm font-semibold text-muted-foreground">{uploading ? "Enviando..." : "Clique para fazer upload da capa"}</span>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Recomendado: 1200x800px</span>
                      </label>
                    </div>
                  )}
                </Field>

                <div className="border-t border-border pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Itinerário Dia-a-Dia</h4>
                    <GhostButton type="button" onClick={() => setItinerary([...itinerary, { day: itinerary.length + 1, title: "", description: "" }])} className="h-8 text-xs gap-1.5 border border-border">
                      <Plus className="h-3.5 w-3.5" /> Adicionar Dia
                    </GhostButton>
                  </div>
                  
                  <div className="space-y-4">
                    {itinerary.map((day, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl border border-border/60 bg-surface-alt/20">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">
                            {idx + 1}
                          </div>
                          <button onClick={() => setItinerary(itinerary.filter((_, i) => i !== idx))} className="text-muted-foreground/50 hover:text-danger mt-auto pb-1" title="Remover dia">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <Input 
                            placeholder={`Título do Dia ${idx + 1} (ex: Chegada em Gramado)`} 
                            value={day.title}
                            onChange={(e) => setItinerary(itinerary.map((d, i) => i === idx ? { ...d, title: e.target.value } : d))}
                            className="font-semibold text-sm"
                          />
                          <Textarea 
                            placeholder="Descrição rica das atividades do dia..." 
                            rows={3}
                            value={day.description}
                            onChange={(e) => setItinerary(itinerary.map((d, i) => i === idx ? { ...d, description: e.target.value } : d))}
                          />
                        </div>
                      </div>
                    ))}
                    {itinerary.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground">
                        Nenhum dia adicionado ao itinerário.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & PUBLISH */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-border bg-surface-alt/20 p-6 flex gap-6">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="w-32 h-32 rounded-lg object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-surface flex items-center justify-center border border-dashed border-border">
                      <Map className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{title || "Sem título"}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{destination || "Destino não informado"}</p>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="flex flex-col"><span className="text-muted-foreground">Preço Base:</span><strong className="text-brand font-mono text-sm">R$ {price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></div>
                      <div className="flex flex-col"><span className="text-muted-foreground">Vagas:</span><strong>{seats} pessoas</strong></div>
                      <div className="flex flex-col"><span className="text-muted-foreground">Saída:</span><strong>{departure ? new Date(departure).toLocaleDateString('pt-BR') : 'A definir'}</strong></div>
                      <div className="flex flex-col"><span className="text-muted-foreground">Retorno:</span><strong>{ret ? new Date(ret).toLocaleDateString('pt-BR') : 'A definir'}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Opções de Publicação</h4>
                  
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                    <label htmlFor="isPublic" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Publicar no Portal B2C
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Se marcado, esta excursão ficará visível publicamente no site da agência para clientes comprarem online.
                  </p>

                  <div className="pt-2">
                    <Field label="Status Operacional">
                      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
                        <option value="draft">Rascunho (Não iniciada)</option>
                        <option value="open">Abertas inscrições</option>
                        <option value="confirmed">Confirmada / Lotada</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4">
          <GhostButton onClick={handleBack} disabled={step === 0} className="gap-2 w-28">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </GhostButton>
          
          <div className="flex gap-3">
            <GhostButton onClick={onClose} disabled={submitting}>Cancelar</GhostButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton onClick={handleNext} className="gap-2 w-32">
                Próximo <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={submit} disabled={submitting} className="w-40 font-bold tracking-wider">
                {submitting ? "SALVANDO..." : "CRIAR EXCURSÃO"}
              </PrimaryButton>
            )}
          </div>
        </div>
    </SheetPage>
  );
}
