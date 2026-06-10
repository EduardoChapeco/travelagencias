import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$agency_slug/contact")({
  head: () => ({ meta: [{ title: "Fale Conosco" }] }),
  component: ContactPage,
});

function ContactPage() {
  const { agency_slug } = useParams({ from: "/p/$agency_slug/contact" });
  
  const [utms, setUtms] = useState({ source: "", medium: "", campaign: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    destination: "",
    travel_start: "",
    travel_end: "",
    pax_count: 2,
    estimated_value: "",
    notes: "",
  });

  const agencyQ = useQuery({
    queryKey: ["agency-basic", agency_slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("id, name, logo_url").eq("slug", agency_slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const policiesQ = useQuery({
    enabled: !!agencyQ.data?.id,
    queryKey: ["agency-policies", agencyQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase.from("policy_documents").select("id, type, version").eq("agency_id", agencyQ.data!.id).eq("is_published", true);
      return data || [];
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtms({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || ""
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    
    if (!lgpdAccepted) {
      setErrorMsg("Você precisa aceitar os Termos e Políticas para continuar.");
      return;
    }

    setBusy(true);

    let finalNotes = f.notes.trim();
    if (utms.source || utms.medium || utms.campaign) {
      finalNotes += \`\n\n--- Rastreio de Campanha ---\nOrigem: \${utms.source || 'N/A'}\nMídia: \${utms.medium || 'N/A'}\nCampanha: \${utms.campaign || 'N/A'}\`;
    }

    const { error } = await supabase.rpc('submit_public_lead', {
      _agency_slug: agency_slug,
      _name: f.name,
      _email: f.email || null,
      _phone: f.phone || null,
      _destination: f.destination || null,
      _travel_start: f.travel_start || null,
      _travel_end: f.travel_end || null,
      _pax_count: f.pax_count,
      _estimated_value: parseFloat(f.estimated_value) || 0,
      _source: utms.source || 'website',
      _notes: finalNotes || null
    });

    setBusy(false);

    if (error) {
      setErrorMsg("Ocorreu um erro ao enviar seu contato: " + error.message);
      return;
    }

    // Success!
    setSubmitted(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#000000', '#ffffff', '#a8a29e'],
      disableForReducedMotion: true
    });
  }

  if (agencyQ.isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!agencyQ.data) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm">Agência não encontrada.</div>;
  }

  const hasPolicies = policiesQ.data && policiesQ.data.length > 0;

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recebemos seu pedido!</h1>
          <p className="text-muted-foreground leading-relaxed">
            Sua solicitação de viagem foi encaminhada diretamente para nossos especialistas. Entraremos em contato muito em breve para montar seu roteiro ideal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">Comece sua jornada</h1>
        <p className="text-muted-foreground">Preencha os detalhes abaixo para que possamos entender melhor o seu perfil de viajante.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="rounded-2xl border border-danger bg-danger/5 p-4 text-sm text-danger font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 md:p-8">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Nome Completo *</label>
            <input 
              required 
              value={f.name} 
              onChange={(e) => setF({...f, name: e.target.value})} 
              className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
              placeholder="Como quer ser chamado?"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">WhatsApp *</label>
              <input 
                required 
                value={f.phone} 
                onChange={(e) => setF({...f, phone: e.target.value})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">E-mail</label>
              <input 
                type="email" 
                value={f.email} 
                onChange={(e) => setF({...f, email: e.target.value})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Destino dos Sonhos</label>
            <input 
              value={f.destination} 
              onChange={(e) => setF({...f, destination: e.target.value})} 
              className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
              placeholder="Para onde você quer ir?"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Ida Prevista</label>
              <input 
                type="date" 
                value={f.travel_start} 
                onChange={(e) => setF({...f, travel_start: e.target.value})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Retorno</label>
              <input 
                type="date" 
                value={f.travel_end} 
                onChange={(e) => setF({...f, travel_end: e.target.value})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Qtd. Pessoas</label>
              <input 
                type="number" min="1" 
                value={f.pax_count} 
                onChange={(e) => setF({...f, pax_count: parseInt(e.target.value) || 1})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Orçamento Est. (R$)</label>
              <input 
                type="number" min="0" step="100"
                value={f.estimated_value} 
                onChange={(e) => setF({...f, estimated_value: e.target.value})} 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all"
                placeholder="Ex: 15000"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Detalhes Adicionais</label>
            <textarea 
              rows={4}
              value={f.notes} 
              onChange={(e) => setF({...f, notes: e.target.value})} 
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm focus:border-foreground focus:ring-1 focus:ring-foreground outline-none transition-all resize-none"
              placeholder="O que não pode faltar nessa viagem?"
            />
          </div>

        </div>

        {/* LGPD Consent */}
        <div className="flex items-start gap-3 px-2">
          <input 
            type="checkbox" 
            id="lgpd" 
            checked={lgpdAccepted}
            onChange={(e) => setLgpdAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-border text-foreground focus:ring-foreground transition-all cursor-pointer"
          />
          <label htmlFor="lgpd" className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed">
            Declaro que li e concordo com a coleta dos meus dados para fins de orçamento e atendimento comercial, conforme as {" "}
            <span className="text-foreground font-semibold underline decoration-border underline-offset-2">Políticas de Privacidade</span> da agência.
          </label>
        </div>

        <button 
          type="submit" 
          disabled={busy}
          className="w-full h-14 rounded-full bg-foreground text-background text-sm font-bold tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Solicitar Orçamento"} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
