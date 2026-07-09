import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { slugify } from "@/lib/slug";
import { resolveSignedInAgency } from "@/lib/auth-routing";
import { validateCNPJ, formatCNPJ, fetchCNPJData } from "@/lib/validations/document";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type DayKey = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
type BusinessHours = Record<DayKey, { open: string; close: string; closed: boolean }>;
const DAY_KEYS: DayKey[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const defaultHours = (): BusinessHours =>
  Object.fromEntries(
    DAY_KEYS.map((k, i) => [k, { open: "09:00", close: "18:00", closed: i >= 5 }]),
  ) as BusinessHours;

export const Route = createFileRoute("/auth/onboarding")({
  head: ({ context }: any) => ({ meta: [{ title: `Configure sua agência · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

const onboardingSchema = z.object({
  name: z.string().min(2, "Nome da agência é obrigatório"),
  slug: z.string().min(2, "URL é obrigatória"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  legalName: z.string().optional(),
  document: z.string().optional(),
  address_zip_code: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2, "No máximo 2 caracteres").optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      legalName: "",
      document: "",
      address_zip_code: "",
      address_street: "",
      address_number: "",
      address_complement: "",
      address_neighborhood: "",
      address_city: "",
      address_state: "",
    },
  });

  const documentValue = watch("document");
  const nameValue = watch("name");
  const slugValue = watch("slug");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth/login" });
        return;
      }
      setValue("email", u.user?.email ?? "");
      const agency = await resolveSignedInAgency(u.user.id);
      if (agency && agency.onboarding_completed) {
        navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
      }
    })();
  }, [navigate, setValue]);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue("name", v, { shouldValidate: true });
    if (!slugValue || slugify(slugValue) === slugify(v.slice(0, -1))) {
      setValue("slug", slugify(v), { shouldValidate: true });
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("slug", slugify(e.target.value), { shouldValidate: true });
  }

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatCNPJ(raw);
    setValue("document", formatted, { shouldValidate: true });
  }

  async function handleCnpjLookup() {
    const raw = (documentValue || "").replace(/[^\d]/g, "");
    if (raw.length !== 14 || !validateCNPJ(raw)) {
      toast.error("CNPJ inválido. Verifique o número informado.");
      return;
    }
    setLoadingCnpj(true);
    try {
      const data = await fetchCNPJData(raw);
      if (data.razao_social) setValue("legalName", data.razao_social);
      if (data.nome_fantasia || data.razao_social) {
        const n = data.nome_fantasia || data.razao_social;
        setValue("name", n);
        if (!slugValue) setValue("slug", slugify(n));
      }
      if (data.cep) setValue("address_zip_code", data.cep.replace(/(\d{5})(\d{3})/, "$1-$2"));
      if (data.logradouro) setValue("address_street", data.logradouro);
      if (data.numero) setValue("address_number", data.numero);
      if (data.complemento) setValue("address_complement", data.complemento);
      if (data.bairro) setValue("address_neighborhood", data.bairro);
      if (data.municipio) setValue("address_city", data.municipio);
      if (data.uf) setValue("address_state", data.uf);
      if (data.ddd_telefone_1) setValue("phone", data.ddd_telefone_1);
      toast.success("Dados do CNPJ importados com sucesso.");
    } catch (err) {
      toast.error("Não foi possível buscar dados deste CNPJ. Preencha manualmente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function nextStep() {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ["name", "slug"];
      const rawCnpj = (documentValue || "").replace(/[^\d]/g, "");
      if (rawCnpj.length > 0 && rawCnpj.length !== 14) {
        toast.error("CNPJ deve ter 14 dígitos numéricos.");
        return;
      }
      if (rawCnpj.length === 14 && !validateCNPJ(rawCnpj)) {
        toast.error("O CNPJ informado é inválido matematicamente.");
        return;
      }
    } else if (step === 2) {
      fieldsToValidate = [
        "address_zip_code",
        "address_street",
        "address_number",
        "address_complement",
        "address_neighborhood",
        "address_city",
        "address_state",
      ];
    }
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  }

  async function onSubmit(data: OnboardingFormData) {
    if (step < 3) {
      nextStep();
      return;
    }

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");

      const { data: rows, error } = await supabase.rpc("create_agency_onboarding", {
        _name: data.name,
        _slug: data.slug,
        _email: data.email,
        _phone: data.phone,
        _full_name: u.user.user_metadata?.full_name ?? null,
        _legal_name: data.legalName,
        _document: data.document,
        _address_zip_code: data.address_zip_code,
        _address_street: data.address_street,
        _address_number: data.address_number,
        _address_complement: data.address_complement,
        _address_neighborhood: data.address_neighborhood,
        _address_city: data.address_city,
        _address_state: data.address_state,
        _business_hours: defaultHours() as any,
        _onboarding_completed: true,
      });

      if (error) throw error;

      const ag = Array.isArray(rows) ? rows[0] : rows;
      if (!ag?.slug) throw new Error("Agência criada sem retorno de URL.");

      toast.success("Sua agência foi configurada com sucesso!");
      navigate({ to: "/agency/$slug", params: { slug: ag.slug }, replace: true });
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao configurar a agência.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Configure sua agência</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete os dados abaixo. Passo {step} de 3.
          </p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${step >= i ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-[var(--radius-card)] border-none glass-card border-none p-8"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-medium">Dados da Empresa</h2>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="CNPJ / Documento" error={errors.document?.message}>
                    <Input
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      {...register("document")}
                      onChange={handleDocumentChange}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={handleCnpjLookup}
                  disabled={
                    loadingCnpj || (documentValue || "").replace(/[^\d]/g, "").length !== 14
                  }
                  className="mb-[2px] h-10 rounded-full border-none px-4 text-sm font-medium hover:glass bg-white/5 border-white/10 disabled:opacity-50 cursor-pointer"
                >
                  {loadingCnpj ? "Buscando..." : "Buscar CNPJ"}
                </button>
              </div>
              <Field label="Razão social" error={errors.legalName?.message}>
                <Input {...register("legalName")} />
              </Field>
              <Field label="Nome da agência (Nome fantasia)" error={errors.name?.message}>
                <Input {...register("name")} onChange={handleNameChange} />
              </Field>
              <Field
                label="URL da sua agência no sistema"
                hint={`turis.app/agency/${slugValue || "minha-agencia"}`}
                error={errors.slug?.message}
              >
                <Input
                  placeholder="minha-agencia"
                  {...register("slug")}
                  onChange={handleSlugChange}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-medium">Endereço</h2>
              <Field label="CEP" error={errors.address_zip_code?.message}>
                <Input placeholder="00000-000" {...register("address_zip_code")} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Rua / Logradouro" error={errors.address_street?.message}>
                    <Input {...register("address_street")} />
                  </Field>
                </div>
                <div>
                  <Field label="Número" error={errors.address_number?.message}>
                    <Input {...register("address_number")} />
                  </Field>
                </div>
              </div>
              <Field label="Complemento" error={errors.address_complement?.message}>
                <Input {...register("address_complement")} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Field label="Bairro" error={errors.address_neighborhood?.message}>
                    <Input {...register("address_neighborhood")} />
                  </Field>
                </div>
                <div className="col-span-1">
                  <Field label="Cidade" error={errors.address_city?.message}>
                    <Input {...register("address_city")} />
                  </Field>
                </div>
                <div className="col-span-1">
                  <Field label="UF" error={errors.address_state?.message}>
                    <Input maxLength={2} {...register("address_state")} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-medium">Contato e Horários</h2>
              <Field label="E-mail principal" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
                <Input {...register("phone")} />
              </Field>
              <div className="rounded-[var(--radius-card)] border-none p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Você poderá configurar os horários detalhados de atendimento no menu{" "}
                  <strong>Minha Empresa</strong> depois de finalizar.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-full border-none px-4 py-2 text-sm font-medium hover:glass bg-white/5 border-white/10 cursor-pointer"
                disabled={isSubmitting}
              >
                Voltar
              </button>
            )}
            <PrimaryButton type="submit" disabled={isSubmitting} className="flex-1 cursor-pointer">
              {isSubmitting ? "Salvando…" : step === 3 ? "Finalizar e Entrar" : "Próximo"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
