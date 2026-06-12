import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { slugify } from "@/lib/slug";
import { resolveSignedInAgency } from "@/lib/auth-routing";
import { validateCNPJ, formatCNPJ, fetchCNPJData } from "@/lib/validations/document";

export const Route = createFileRoute("/auth/onboarding")({
  head: () => ({ meta: [{ title: "Configure sua agência · TravelOS" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth/login" });
        return;
      }
      setForm((f) => ({ ...f, email: u.user?.email ?? "" }));
      const agency = await resolveSignedInAgency(u.user.id);
      if (agency && agency.onboarding_completed) {
        navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
      }
    })();
  }, [navigate]);

  function setName(v: string) {
    setForm((current) => ({ ...current, name: v, slug: current.slug ? current.slug : slugify(v) }));
  }

  function setSlug(v: string) {
    setForm({ ...form, slug: slugify(v) });
  }

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatCNPJ(raw);
    setForm({ ...form, document: formatted });
  }

  async function handleCnpjLookup() {
    const raw = form.document.replace(/[^\d]/g, "");
    if (raw.length !== 14 || !validateCNPJ(raw)) {
      toast.error("CNPJ inválido. Verifique o número informado.");
      return;
    }
    setLoadingCnpj(true);
    try {
      const data = await fetchCNPJData(raw);
      setForm((f) => ({
        ...f,
        legalName: data.razao_social || f.legalName,
        name: data.nome_fantasia || data.razao_social || f.name,
        slug: f.slug || slugify(data.nome_fantasia || data.razao_social || ""),
        address_zip_code: data.cep
          ? data.cep.replace(/(\d{5})(\d{3})/, "$1-$2")
          : f.address_zip_code,
        address_street: data.logradouro || f.address_street,
        address_number: data.numero || f.address_number,
        address_complement: data.complemento || f.address_complement,
        address_neighborhood: data.bairro || f.address_neighborhood,
        address_city: data.municipio || f.address_city,
        address_state: data.uf || f.address_state,
        phone: data.ddd_telefone_1 || f.phone,
      }));
      toast.success("Dados do CNPJ importados com sucesso.");
    } catch (err) {
      toast.error("Não foi possível buscar dados deste CNPJ. Preencha manualmente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();

    if (step < 3) {
      if (step === 1) {
        const rawCnpj = form.document.replace(/[^\d]/g, "");
        if (rawCnpj.length > 0 && rawCnpj.length !== 14) {
          toast.error("CNPJ deve ter 14 dígitos numéricos.");
          return;
        }
        if (rawCnpj.length === 14 && !validateCNPJ(rawCnpj)) {
          toast.error("O CNPJ informado é inválido matematicamente.");
          return;
        }
      }
      setStep(step + 1);
      return;
    }

    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");

      // @ts-ignore: Types will be updated when supabase gen types runs
      const { data: rows, error } = await supabase.rpc("create_agency_onboarding", {
        _name: form.name,
        _slug: form.slug,
        _email: form.email,
        _phone: form.phone,
        _full_name: u.user.user_metadata?.full_name ?? null,
        _legal_name: form.legalName,
        _document: form.document,
        _address_zip_code: form.address_zip_code,
        _address_street: form.address_street,
        _address_number: form.address_number,
        _address_complement: form.address_complement,
        _address_neighborhood: form.address_neighborhood,
        _address_city: form.address_city,
        _address_state: form.address_state,
        _onboarding_completed: true,
      });

      if (error) throw error;

      const ag = Array.isArray(rows) ? rows[0] : rows;
      if (!ag?.slug) throw new Error("Agência criada sem retorno de URL.");

      toast.success("Sua agência foi configurada com sucesso!");
      navigate({ to: "/agency/$slug", params: { slug: ag.slug }, replace: true });
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao configurar a agência.");
      setBusy(false);
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
          onSubmit={create}
          className="space-y-4 rounded-xl border border-border bg-surface p-8 shadow-sm"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-medium">Dados da Empresa</h2>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="CNPJ / Documento">
                    <Input
                      value={form.document}
                      onChange={handleDocumentChange}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={handleCnpjLookup}
                  disabled={loadingCnpj || form.document.replace(/[^\d]/g, "").length !== 14}
                  className="mb-[2px] h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-alt disabled:opacity-50"
                >
                  {loadingCnpj ? "Buscando..." : "Buscar CNPJ"}
                </button>
              </div>
              <Field label="Razão social">
                <Input
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                />
              </Field>
              <Field label="Nome da agência (Nome fantasia)">
                <Input required value={form.name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field
                label="URL da sua agência no sistema"
                hint={`travelos.app/agency/${form.slug || "minha-agencia"}`}
              >
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="minha-agencia"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-medium">Endereço</h2>
              <Field label="CEP">
                <Input
                  value={form.address_zip_code}
                  onChange={(e) => setForm({ ...form, address_zip_code: e.target.value })}
                  placeholder="00000-000"
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Rua / Logradouro">
                    <Input
                      value={form.address_street}
                      onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Número">
                    <Input
                      value={form.address_number}
                      onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              <Field label="Complemento">
                <Input
                  value={form.address_complement}
                  onChange={(e) => setForm({ ...form, address_complement: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Bairro">
                  <Input
                    value={form.address_neighborhood}
                    onChange={(e) => setForm({ ...form, address_neighborhood: e.target.value })}
                  />
                </Field>
                <Field label="Cidade">
                  <Input
                    value={form.address_city}
                    onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                  />
                </Field>
                <Field label="UF">
                  <Input
                    value={form.address_state}
                    onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                    maxLength={2}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-medium">Contato e Horários</h2>
              <Field label="E-mail principal">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <div className="rounded-md border border-border p-4 bg-muted/30">
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
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-alt"
                disabled={busy}
              >
                Voltar
              </button>
            )}
            <PrimaryButton type="submit" disabled={busy} className="flex-1">
              {busy ? "Salvando…" : step === 3 ? "Finalizar e Entrar" : "Próximo"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
