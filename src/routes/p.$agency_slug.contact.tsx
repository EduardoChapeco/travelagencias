import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import {
  fetchPublicAgencyBasic,
  fetchPublicAgencyPolicies,
  submitPublicLead,
} from "@/services/public";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/p/$agency_slug/contact")({
  head: () => ({ meta: [{ title: "Fale Conosco" }] }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  phone: z.string().min(8, "WhatsApp/Telefone inválido ou incompleto"),
  email: z.string().email("Digite um e-mail válido").optional().or(z.literal("")),
  destination: z.string().optional(),
  travel_start: z.string().optional(),
  travel_end: z.string().optional(),
  pax_count: z.coerce.number().min(1, "A viagem deve ter pelo menos 1 passageiro"),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  lgpdAccepted: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar as Políticas de Privacidade para continuar",
  }),
});

type ContactFormData = z.infer<typeof contactSchema>;

function ContactPage() {
  const { agency_slug } = useParams({ from: "/p/$agency_slug/contact" });

  const [utms, setUtms] = useState({ source: "", medium: "", campaign: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      destination: "",
      travel_start: "",
      travel_end: "",
      pax_count: 2,
      estimated_value: "",
      notes: "",
      lgpdAccepted: false,
    },
  });

  const agencyQ = useQuery({
    queryKey: ["agency-basic", agency_slug],
    queryFn: () => fetchPublicAgencyBasic(agency_slug as string),
  });

  const policiesQ = useQuery({
    enabled: !!agencyQ.data?.id,
    queryKey: ["agency-policies", agencyQ.data?.id],
    queryFn: () => fetchPublicAgencyPolicies(),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtms({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
    });
  }, []);

  async function onSubmit(data: ContactFormData) {
    setErrorMsg("");

    let finalNotes = (data.notes || "").trim();
    if (utms.source || utms.medium || utms.campaign) {
      finalNotes += `\n\n--- Rastreio de Campanha ---\nOrigem: ${utms.source || "N/A"}\nMídia: ${utms.medium || "N/A"}\nCampanha: ${utms.campaign || "N/A"}`;
    }

    try {
      await submitPublicLead({
        agency_slug: agency_slug as string,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        destination: data.destination || null,
        travel_start: data.travel_start || null,
        travel_end: data.travel_end || null,
        pax_count: data.pax_count,
        estimated_value: parseFloat(data.estimated_value || "0") || 0,
        source: utms.source || "website",
        notes: finalNotes || null,
      });
      setSubmitted(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#000000", "#ffffff", "#a8a29e"],
        disableForReducedMotion: true,
      });
    } catch (err: any) {
      setErrorMsg("Ocorreu um erro ao enviar seu contato: " + (err?.message || String(err)));
    }
  }

  if (agencyQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!agencyQ.data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm">
        Agência não encontrada.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Recebemos seu pedido!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Sua solicitação de viagem foi encaminhada diretamente para nossos especialistas.
            Entraremos em contato muito em breve para montar seu roteiro ideal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Comece sua jornada
        </h1>
        <p className="text-muted-foreground">
          Preencha os detalhes abaixo para que possamos entender melhor o seu perfil de viajante.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errorMsg && (
          <div className="rounded-[var(--radius-card)] border border-danger bg-danger/5 p-4 text-sm text-danger font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 rounded-3xl border-none glass-card border-none p-6 md:p-8">
          <div className="space-y-1.5">
            <label className="ds-label-caps text-muted-foreground ml-2">
              Nome Completo *
            </label>
            <Input
              {...register("name")}
              className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
              placeholder="Como quer ser chamado?"
            />
            {errors.name && (
              <span className="ds-meta font-semibold text-red-500 ml-2 block">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                WhatsApp *
              </label>
              <Input
                {...register("phone")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
                placeholder="(11) 99999-9999"
              />
              {errors.phone && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.phone.message}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                E-mail
              </label>
              <Input
                type="email"
                {...register("email")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.email.message}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-4">
            <label className="ds-label-caps text-muted-foreground ml-2">
              Destino dos Sonhos
            </label>
            <Input
              {...register("destination")}
              className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
              placeholder="Para onde você quer ir?"
            />
            {errors.destination && (
              <span className="ds-meta font-semibold text-red-500 ml-2 block">
                {errors.destination.message}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                Ida Prevista
              </label>
              <Input
                type="date"
                {...register("travel_start")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
              />
              {errors.travel_start && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.travel_start.message}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                Retorno
              </label>
              <Input
                type="date"
                {...register("travel_end")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
              />
              {errors.travel_end && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.travel_end.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                Qtd. Pessoas
              </label>
              <Input
                type="number"
                min="1"
                {...register("pax_count")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
              />
              {errors.pax_count && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.pax_count.message}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="ds-label-caps text-muted-foreground ml-2">
                Orçamento Est. (R$)
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                {...register("estimated_value")}
                className="w-full rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground"
                placeholder="Ex: 15000"
              />
              {errors.estimated_value && (
                <span className="ds-meta font-semibold text-red-500 ml-2 block">
                  {errors.estimated_value.message}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-4">
            <label className="ds-label-caps text-muted-foreground ml-2">
              Detalhes Adicionais
            </label>
            <Textarea
              rows={4}
              {...register("notes")}
              className="w-full py-3 rounded-[var(--radius-card)] border-none focus:border-foreground focus:ring-foreground resize-none"
              placeholder="O que não pode faltar nessa viagem?"
            />
            {errors.notes && (
              <span className="ds-meta font-semibold text-red-500 ml-2 block">
                {errors.notes.message}
              </span>
            )}
          </div>
        </div>

        {/* LGPD Consent */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-3 px-2">
            <Input
              type="checkbox"
              id="lgpd"
              {...register("lgpdAccepted")}
              className="mt-1 h-5 w-5 rounded focus:ring-foreground cursor-pointer"
            />
            <label
              htmlFor="lgpd"
              className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed"
            >
              Declaro que li e concordo com a coleta dos meus dados para fins de orçamento e
              atendimento comercial, conforme as{" "}
              <span className="text-foreground font-semibold underline decoration-border underline-offset-2">
                Políticas de Privacidade
              </span>{" "}
              da agência.
            </label>
          </div>
          {errors.lgpdAccepted && (
            <span className="ds-meta font-semibold text-red-500 ml-2 block">
              {errors.lgpdAccepted.message}
            </span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-full bg-foreground text-background text-sm font-bold tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Solicitar Orçamento"} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
