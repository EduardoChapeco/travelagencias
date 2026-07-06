import { useState } from "react";
import { Phone, AlertCircle, Compass, Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppWidget } from "@/components/portal/TripPortalShared";

interface TabContatosProps {
  trip: any;
  voucher: any;
}

export function TabContatos({ trip, voucher }: TabContatosProps) {
  const [contactsAiLoaded, setContactsAiLoaded] = useState(false);
  const [contactsAiData, setContactsAiData] = useState<any[] | null>(null);
  const [contactsAiLoading, setContactsAiLoading] = useState(false);

  const handleLoadAiContacts = async () => {
    if (!trip.destination) return;
    setContactsAiLoading(true);
    setContactsAiLoaded(true);
    try {
      const destinations = [trip.destination];
      if (trip.flights && Array.isArray(trip.flights)) {
        trip.flights.forEach((f: any) => {
          if (f.destination) destinations.push(f.destination);
        });
      }
      const uniqueDests = [...new Set(destinations)].join(", ");
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: `Viajante brasileiro indo para: ${uniqueDests}. Retorne JSON array com dados de cada pais (incluindo conexoes): [{"country": "Nome", "flag": "Emoji", "emergency": "Numero", "police": "Numero", "ambulance": "Numero", "consulate": {"name": "Consulado Brasileiro", "phone": "+XX...", "address": "Endereco"}, "key_rules": ["Regra 1", "Regra 2"], "mandatory_taxes": ["Taxa 1"], "currency": "Moeda local", "voltage": "V", "timezone": "UTC+/-X"}]. Retorne APENAS JSON valido, sem markdown.`,
          systemPrompt:
            "Voce e especialista em viagens internacionais. Retorne APENAS JSON valido.",
          modelPreference: "smart",
        },
      });
      if (error) throw error;
      const text = data?.result || "";
      const match = text.match(/\[[\s\S]*\]/);
      setContactsAiData(match ? JSON.parse(match[0]) : []);
    } catch {
      setContactsAiData([]);
    } finally {
      setContactsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-danger/10 rounded-3xl p-8 relative overflow-hidden border border-danger/20">
        <Phone className="w-10 h-10 mb-4 opacity-90 text-danger" />
        <h2 className="text-3xl font-black tracking-tight mb-2 text-danger">
          Contatos e Emergência
        </h2>
        <p className="text-danger/80 font-medium max-w-lg leading-relaxed">
          Tenha sempre em mãos os contatos do seu agente e números úteis do seu destino.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AppWidget title="Agência e Suporte" icon={<Phone className="h-5 w-5 text-brand" />}>
            <div className="space-y-3">
              <a
                href={`tel:${trip.agency?.phone || ""}`}
                className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-brand/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-foreground">Sua Agência</div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {trip.agency?.name}
                  </div>
                </div>
                <div className="text-sm font-black text-brand tracking-wider">
                  {trip.agency?.phone || "Não informado"}
                </div>
              </a>
            </div>
          </AppWidget>

          {voucher?.emergency_contacts && voucher.emergency_contacts.length > 0 && (
            <AppWidget
              title="Contatos Operacionais"
              icon={<AlertCircle className="h-5 w-5 text-warning" />}
            >
              <div className="space-y-3">
                {voucher.emergency_contacts.map((ec: any, i: number) => (
                  <a
                    key={i}
                    href={`tel:${ec.phone}`}
                    className="flex items-center justify-between rounded-2xl bg-warning/10 p-4 border border-warning/20 hover:bg-warning/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-warning">{ec.role}</div>
                      <div className="text-xs font-medium text-warning/80">{ec.name}</div>
                    </div>
                    <div className="text-sm font-black text-warning tracking-wider">{ec.phone}</div>
                  </a>
                ))}
              </div>
            </AppWidget>
          )}
        </div>

        <div className="space-y-6">
          <AppWidget
            title="Números Úteis por Destino · IA"
            icon={<Compass className="h-5 w-5 text-info" />}
          >
            {!contactsAiLoaded && (
              <div className="text-center py-4 space-y-3">
                <button
                  onClick={handleLoadAiContacts}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[24px] bg-info/10 text-info text-xs font-bold border border-info/20 hover:bg-info/20 transition-colors"
                >
                  <Lightbulb className="h-3.5 w-3.5" /> Carregar Informações do Destino
                </button>
                <p className="text-[10px] text-muted-foreground">
                  A IA analisa seu destino e rotas de conexão.
                </p>
              </div>
            )}

            {contactsAiLoading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="h-8 w-8 text-info animate-spin" />
                <p className="text-sm text-muted-foreground">Analisando países da sua rota...</p>
              </div>
            )}

            {contactsAiData && !contactsAiLoading && contactsAiData.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Não foi possível obter dados para este destino.
              </p>
            )}

            {contactsAiData && !contactsAiLoading && contactsAiData.length > 0 && (
              <div className="space-y-4">
                {contactsAiData.map((country: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-border overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-surface-alt/30 border-b border-border/50">
                      <span className="text-2xl">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground">{country.country}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {country.currency} · {country.timezone} · {country.voltage}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
                      {country.emergency && (
                        <a
                          href={`tel:${country.emergency}`}
                          className="flex flex-col items-center py-3 hover:bg-danger/5 transition-colors"
                        >
                          <span className="text-xs font-black text-danger">
                            {country.emergency}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            Emergência
                          </span>
                        </a>
                      )}
                      {country.police && (
                        <a
                          href={`tel:${country.police}`}
                          className="flex flex-col items-center py-3 hover:bg-warning/5 transition-colors"
                        >
                          <span className="text-xs font-black text-warning">{country.police}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            Polícia
                          </span>
                        </a>
                      )}
                      {country.ambulance && (
                        <a
                          href={`tel:${country.ambulance}`}
                          className="flex flex-col items-center py-3 hover:bg-info/5 transition-colors"
                        >
                          <span className="text-xs font-black text-info">{country.ambulance}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            Ambulância
                          </span>
                        </a>
                      )}
                    </div>

                    {country.consulate?.phone && (
                      <a
                        href={`tel:${country.consulate.phone}`}
                        className="flex items-center gap-3 px-3 py-3 border-b border-border/50 hover:bg-brand/5 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-sm">
                          🇧🇷
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">
                            {country.consulate.name}
                          </div>
                          {country.consulate.address && (
                            <div className="text-[9px] text-muted-foreground truncate">
                              {country.consulate.address}
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-black text-brand shrink-0">
                          {country.consulate.phone}
                        </div>
                      </a>
                    )}

                    {country.key_rules && country.key_rules.length > 0 && (
                      <div className="px-3 py-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                          Regras Importantes
                        </div>
                        <ul className="space-y-0.5">
                          {country.key_rules.slice(0, 3).map((rule: string, ri: number) => (
                            <li
                              key={ri}
                              className="flex items-start gap-1.5 text-[10px] text-muted-foreground"
                            >
                              <span className="text-warning mt-0.5 shrink-0">⚠</span> {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AppWidget>
        </div>
      </div>
    </div>
  );
}
