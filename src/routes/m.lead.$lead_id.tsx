import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton , Button } from "@/components/ui/button";
import { ShieldCheck, Calendar, Users, MapPin, Sparkles, Heart, X, Plus } from "lucide-react";

export const Route = createFileRoute("/m/lead/$lead_id")({
  head: ({ context }: any) => ({ meta: [{ title: `Preferências de Viagem · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: PublicLeadFormPage,
});

type PublicLead = {
  id: string;
  name: string;
  destination: string | null;
  email: string | null;
  phone: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  pax_ages: number[];
  pax_list?: Array<{
    full_name: string;
    document?: string;
    birth_date?: string;
    relationship: string;
    phone?: string;
    email?: string;
  }>;
  pcd?: boolean;
  reduced_mobility?: boolean;
  autism?: boolean;
  health_notes?: string | null;
  interest_type: string | null;
  notes: string | null;
  lgpd_accepted: boolean;
  agency_name: string;
  agency_logo: string | null;
  custom_fields?: Record<string, any> | null;
};

const INTEREST_OPTIONS = [
  { v: "flights", label: "Passagens Aéreas" },
  { v: "hotel", label: "Somente Hotel" },
  { v: "package_flight", label: "Pacote Aéreo Completo" },
  { v: "package_ground", label: "Pacote Terrestre Completo" },
  { v: "other", label: "Outros Serviços" },
] as const;

function PublicLeadFormPage() {
  const { lead_id } = Route.useParams();
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PublicLead>>({});
  const [paxAgesStr, setPaxAgesStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paxForm, setPaxForm] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    relationship: "other",
    phone: "",
    email: "",
  });
  const [paxFormOpen, setPaxFormOpen] = useState(false);

  useEffect(() => {
    (supabase.rpc as any)("public_lead_by_id", { _lead_id: lead_id }).then(
      ({ data, error }: any) => {
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        const r = (data as unknown as PublicLead[])?.[0];
        if (!r) {
          setErrorMsg("Link de formulário inválido ou não encontrado.");
          return;
        }
        setLead(r);
        setForm(r);
        setPaxAgesStr((r.pax_ages || []).join(", "));
        if (r.lgpd_accepted) {
          // If they already submitted LGPD or want to edit, that's fine.
        }
      },
    );
  }, [lead_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lgpd_accepted) {
      toast.error("Você precisa aceitar os termos da LGPD para enviar.");
      return;
    }

    setSaving(true);

    const paxAges = paxAgesStr
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    // Capture Tracking Data from URL
    const searchParams = new URLSearchParams(window.location.search);
    const click_id = searchParams.get("fbclid") || searchParams.get("gclid");
    const utm_source = searchParams.get("utm_source");
    const utm_medium = searchParams.get("utm_medium");
    const utm_campaign = searchParams.get("utm_campaign");
    const utm_term = searchParams.get("utm_term");

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      destination: form.destination,
      travel_start: form.travel_start,
      travel_end: form.travel_end,
      pax_adults: form.pax_adults || 1,
      pax_children: form.pax_children || 0,
      pax_infants: form.pax_infants || 0,
      pax_ages: paxAges,
      interest_type: form.interest_type,
      notes: form.notes,
      lgpd_accepted: true,
      pcd: form.pcd || false,
      reduced_mobility: form.reduced_mobility || false,
      autism: form.autism || false,
      health_notes: form.health_notes || "",
      pax_list: form.pax_list || [],
      custom_fields: form.custom_fields || {},
      // Tracking fields
      click_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
    };

    const { error } = await (supabase.rpc as any)("public_save_lead", {
      _lead_id: lead_id,
      _payload: payload,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Preferências salvas com sucesso!");
      setSubmitted(true);
    }
  }

  if (errorMsg) {
    return (
      <CenterContainer>
        <div className="text-center p-6 bg-danger/5 border border-danger/20 rounded-[var(--radius-card)] max-w-md">
          <h1 className="text-lg font-bold text-danger mb-2">Formulário Indisponível</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </CenterContainer>
    );
  }

  if (!lead) {
    return (
      <CenterContainer>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando formulário personalizado...</p>
        </div>
      </CenterContainer>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header Card */}
      <header className="glass-card border-none border-b border-border py-6 px-4 shrink-0">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          {lead.agency_logo ? (
            <img
              src={lead.agency_logo}
              alt={lead.agency_name}
              className="h-12 w-12 rounded-[var(--radius-card)] object-cover border-none"
            />
          ) : (
            <div className="h-12 w-12 rounded-[var(--radius-card)] bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand text-lg">
              {lead.agency_name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <span className="ds-meta uppercase tracking-widest font-extrabold text-brand block">
              Formulário Personalizado
            </span>
            <h1 className="text-base font-bold text-foreground leading-tight mt-0.5">
              {lead.agency_name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conte-nos mais sobre sua próxima experiência de viagem
            </p>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8">
        {submitted ? (
          <div className="glass-card border-none border border-success/30 rounded-[var(--radius-card)] p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-success/15 border border-success/30 rounded-full flex items-center justify-center text-success mx-auto">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Preferências Enviadas!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Obrigado por preencher nosso formulário. Suas respostas foram salvas e nosso consultor
              já foi notificado para dar continuidade ao seu atendimento.
            </p>
            <div className="pt-2 text-xs text-muted-foreground border-t border-border flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-brand" /> Viagem planejada com carinho por{" "}
              {lead.agency_name}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Greeting */}
            <div className="glass bg-white/5 border-white/10/10 border-none/50 rounded-[var(--radius-card)] p-5 space-y-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Olá, {lead.name}! 👋
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Por favor, preencha os campos abaixo. Isso nos ajudará a selecionar as melhores
                opções de hotéis, voos e tarifas de acordo com o perfil do seu grupo.
              </p>
            </div>

            {/* Travel Details Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="ds-label-caps text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand" /> Destino & Interesse
              </h3>

              <Field label="Destino da Viagem">
                <Input
                  required
                  value={form.destination ?? ""}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="Para onde você deseja ir?"
                  className="rounded-[var(--radius-card)]"
                />
              </Field>

              <Field label="Período/Mês Flexível de Interesse (Opcional)">
                <Input
                  value={(form.custom_fields as any)?.interest_period ?? ""}
                  onChange={(e) => {
                    const custom = {
                      ...(form.custom_fields || {}),
                      interest_period: e.target.value,
                    };
                    setForm({ ...form, custom_fields: custom });
                  }}
                  placeholder="Ex: Julho/2026, Outubro, Final do ano"
                  className="rounded-[var(--radius-card)]"
                />
              </Field>

              <Field label="Tipo de Serviço de Interesse">
                <Select
                  required
                  value={form.interest_type ?? ""}
                  onChange={(e) => setForm({ ...form, interest_type: e.target.value })}
                  className="rounded-[var(--radius-card)]"
                >
                  <option value="">Selecione uma opção...</option>
                  {INTEREST_OPTIONS.map((opt) => (
                    <option key={opt.v} value={opt.v}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Dates Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="ds-label-caps text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand" /> Datas Previstas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ida Prevista">
                  <Input
                    type="date"
                    value={form.travel_start ?? ""}
                    onChange={(e) => setForm({ ...form, travel_start: e.target.value })}
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
                <Field label="Retorno Previsto">
                  <Input
                    type="date"
                    value={form.travel_end ?? ""}
                    onChange={(e) => setForm({ ...form, travel_end: e.target.value })}
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
              </div>
            </div>

            {/* Passengers Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="ds-label-caps text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand" /> Passageiros & Idades
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Adultos">
                  <Input
                    type="number"
                    min={1}
                    value={form.pax_adults ?? 1}
                    onChange={(e) =>
                      setForm({ ...form, pax_adults: parseInt(e.target.value) || 1 })
                    }
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
                <Field label="Crianças">
                  <Input
                    type="number"
                    min={0}
                    value={form.pax_children ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, pax_children: parseInt(e.target.value) || 0 })
                    }
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
                <Field label="Bebês">
                  <Input
                    type="number"
                    min={0}
                    value={form.pax_infants ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, pax_infants: parseInt(e.target.value) || 0 })
                    }
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
              </div>

              {/* Children Ages */}
              {(form.pax_children ?? 0) > 0 && (
                <Field label="Idades das Crianças (ex: 5, 8)">
                  <Input
                    required
                    value={paxAgesStr}
                    onChange={(e) => setPaxAgesStr(e.target.value)}
                    placeholder="Separe por vírgulas"
                    className="rounded-[var(--radius-card)]"
                  />
                </Field>
              )}

              {/* Aviation tariff guidance */}
              <div className="ds-meta bg-brand/5 border border-brand/10 p-3.5 rounded-[var(--radius-card)] text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">
                  Regras de Tarifa da Aviação:
                </span>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>
                    <strong>Adulto (ADT):</strong> A partir de 12 anos completos.
                  </li>
                  <li>
                    <strong>Criança (CHD):</strong> 2 a 11 anos completos (2 anos completos já pagam
                    tarifa CHD).
                  </li>
                  <li>
                    <strong>Bebê (INF):</strong> 0 a 23 meses. Deve viajar no colo de um adulto.
                  </li>
                </ul>
              </div>
            </div>

            {/* Acompanhantes Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="ds-label-caps text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand" /> Viajantes Acompanhantes
                </h3>
                <span className="text-xs font-extrabold text-brand bg-brand/5 border border-brand/10 px-2 py-0.5 rounded">
                  {(form.pax_list || []).length} Cadastrados
                </span>
              </div>

              {!form.pax_list || form.pax_list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum acompanhante adicionado. Se você viaja acompanhado, adicione-os abaixo.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.pax_list.map((pax, index) => (
                    <div
                      key={index}
                      className="border-none/60 p-3.5 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/10 relative flex justify-between items-start"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {pax.full_name}
                        </span>
                        <span className="text-[9px] text-brand uppercase font-extrabold bg-brand/5 border border-brand/10 px-1.5 py-0.5 rounded inline-block mt-1">
                          {pax.relationship === "spouse"
                            ? "Cônjuge"
                            : pax.relationship === "child"
                              ? "Filho(a)"
                              : pax.relationship === "parent"
                                ? "Pai/Mãe"
                                : pax.relationship === "sibling"
                                  ? "Irmão/Irmã"
                                  : pax.relationship === "friend"
                                    ? "Amigo(a)"
                                    : pax.relationship === "relative"
                                      ? "Familiar"
                                      : "Outro"}
                        </span>
                        {(pax.document || pax.birth_date) && (
                          <div className="ds-meta text-muted-foreground space-y-0.5 mt-2 font-mono">
                            {pax.document && <div>CPF: {pax.document}</div>}
                            {pax.birth_date && (
                              <div>
                                Nasc: {new Date(pax.birth_date).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const updated = (form.pax_list || []).filter((_, idx) => idx !== index);
                          setForm({ ...form, pax_list: updated });
                        }}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                onClick={() => setPaxFormOpen((o) => !o)}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mt-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />{" "}
                {paxFormOpen ? "Fechar Formulário" : "Adicionar Acompanhante"}
              </Button>

              {paxFormOpen && (
                <div className="border-none/80 p-4 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/10 space-y-3 mt-3">
                  <Field label="Nome Completo *">
                    <Input
                      placeholder="Nome do acompanhante"
                      value={paxForm.full_name}
                      onChange={(e) => setPaxForm({ ...paxForm, full_name: e.target.value })}
                      
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="CPF / Documento">
                      <Input
                        placeholder="Apenas números"
                        value={paxForm.document}
                        onChange={(e) => setPaxForm({ ...paxForm, document: e.target.value })}
                        
                      />
                    </Field>
                    <Field label="Data de Nascimento">
                      <Input
                        type="date"
                        value={paxForm.birth_date}
                        onChange={(e) => setPaxForm({ ...paxForm, birth_date: e.target.value })}
                        
                      />
                    </Field>
                  </div>
                  <Field label="Grau de Parentesco / Relação">
                    <Select
                      value={paxForm.relationship}
                      onChange={(e) => setPaxForm({ ...paxForm, relationship: e.target.value })}
                      
                    >
                      <option value="spouse">Cônjuge</option>
                      <option value="child">Filho(a)</option>
                      <option value="parent">Pai/Mãe</option>
                      <option value="sibling">Irmão/Irmã</option>
                      <option value="friend">Amigo(a)</option>
                      <option value="relative">Familiar / Outro Relacionamento</option>
                      <option value="other">Outro</option>
                    </Select>
                  </Field>
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      if (!paxForm.full_name) {
                        toast.error("O nome completo é obrigatório");
                        return;
                      }
                      const updated = [...(form.pax_list || []), { ...paxForm }];
                      setForm({ ...form, pax_list: updated });
                      setPaxForm({
                        full_name: "",
                        document: "",
                        birth_date: "",
                        relationship: "other",
                        phone: "",
                        email: "",
                      });
                      setPaxFormOpen(false);
                    }}
                    className="w-full text-xs h-9"
                  >
                    Adicionar Acompanhante
                  </PrimaryButton>
                </div>
              )}
            </div>

            {/* Acessibilidade & Saúde Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="ds-label-caps text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-brand" /> Necessidades Especiais & Saúde
              </h3>

              <div className="flex flex-col gap-2.5 text-xs font-semibold text-foreground">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={form.pcd || false}
                    onChange={(e) => setForm({ ...form, pcd: e.target.checked })}
                    className="h-4 w-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <span>PCD (Pessoa com Deficiência)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={form.reduced_mobility || false}
                    onChange={(e) => setForm({ ...form, reduced_mobility: e.target.checked })}
                    className="h-4 w-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <span>Mobilidade Reduzida</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={form.autism || false}
                    onChange={(e) => setForm({ ...form, autism: e.target.checked })}
                    className="h-4 w-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <span>Espectro Autista (TEA)</span>
                </label>
              </div>

              <Field label="Restrições Médicas, Alimentares ou Alergias Importantes">
                <Textarea
                  value={form.health_notes ?? ""}
                  onChange={(e) => setForm({ ...form, health_notes: e.target.value })}
                  placeholder="Ex: intolerância a glúten, asma grave, necessidade de cadeira de rodas no aeroporto, etc..."
                  rows={3}
                  className="rounded-[var(--radius-card)]"
                />
              </Field>
            </div>

            {/* Custom Notes Section */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="ds-label-caps text-muted-foreground border-b border-border/50 pb-2">
                Conte-nos Mais
              </h3>
              <Field label="Algum detalhe ou preferência especial?">
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: preferência de companhias aéreas, tipo de quarto, interesses específicos (praia, ecoturismo, etc...)"
                  rows={4}
                  className="rounded-[var(--radius-card)]"
                />
              </Field>
            </div>

            {/* LGPD Acceptance */}
            <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-5 space-y-3 flex items-start gap-4">
              <Input
                type="checkbox"
                required
                checked={form.lgpd_accepted || false}
                onChange={(e) => setForm({ ...form, lgpd_accepted: e.target.checked })}
                className="h-5 w-5 rounded text-brand focus:ring-brand mt-0.5 cursor-pointer"
                id="lgpd_agree"
              />
              <label
                htmlFor="lgpd_agree"
                className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
              >
                <strong className="text-foreground block">
                  Consentimento de Coleta de Dados & LGPD
                </strong>
                Concordo que {lead.agency_name} possa coletar, processar e armazenar os dados de
                viagem preenchidos acima com a finalidade exclusiva de planejar propostas de viagens
                e serviços contratados.
              </label>
            </div>

            {/* Submit Button */}
            <PrimaryButton
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-[var(--radius-card)] font-bold uppercase tracking-wider text-xs"
            >
              {saving ? "Salvando suas respostas..." : "Enviar Preferências"}
            </PrimaryButton>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground shrink-0 border-t border-border glass-card border-none mt-10">
        <div className="flex items-center justify-center gap-1 ds-meta">
          Protegido por criptografia <Heart className="h-3 w-3 text-brand fill-brand" /> Powered by
          Turis
        </div>
      </footer>
    </div>
  );
}

function CenterContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}
