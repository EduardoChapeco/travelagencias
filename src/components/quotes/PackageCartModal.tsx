import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SheetPage } from "@/components/ui/sheet";
import {
  ShoppingCart,
  Trash2,
  Hotel,
  Plane,
  Car,
  Palmtree,
  ShieldCheck,
  Smartphone,
  Ticket,
  Package,
  Sparkles,
  Sliders,
  FileText,
  MessageCircle,
  ArrowRight,
  UserCheck,
  Plus,
  X,
  Check,
  Send,
  User,
  LayoutTemplate,
  Search,
  FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { BannerGeneratorModal } from "./BannerGeneratorModal";
import { PriceAdjustmentModal } from "./PriceAdjustmentModal";
import { PROPOSAL_TEMPLATES, type ProposalTemplateId } from "@/components/proposals/templates";
import { fetchLeads, type Lead } from "@/services/crm";
import { useAgency } from "@/lib/agency-context";

export interface CartItemProduct {
  id: string;
  type: "hotel" | "flight" | "transfer" | "activity" | "insurance" | "chip" | "ticket" | "service_package" | "other";
  title: string;
  subtitle: string;
  roomOrFare?: string;
  boardBasis?: string;
  passengersDesc?: string;
  utilizationPeriod: string;
  taxAmount: number;
  priceAmount: number;
  rawDetails?: any;
}

interface PackageCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItemProduct[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onSaveProposal: (data: {
    client: {
      name: string;
      email: string;
      phone: string;
      attendant: string;
      notes?: string;
      leadId?: string | null;
      clientId?: string | null;
    };
    template: ProposalTemplateId;
    markupPercent: number;
    discountAmount: number;
    type: "pdf" | "web" | "book" | "contract";
  }) => Promise<{ proposalId?: string; token?: string; contractToken?: string; tripId?: string; whatsappUrl?: string } | void>;
  agencyName?: string;
  agencyPhone?: string;
  attendantsList?: Array<{ id: string; name: string }>;
}

export function PackageCartModal({
  open,
  onOpenChange,
  items,
  onRemoveItem,
  onClearCart,
  onSaveProposal,
  agencyName = "Travel Agências",
  agencyPhone = "(49) 99999-9999",
  attendantsList = [
    { id: "1", name: "Eduardo Chapeco" },
    { id: "2", name: "Ana Beatriz (Consultora)" },
    { id: "3", name: "Carlos Mendes (Operações)" },
  ],
}: PackageCartModalProps) {
  const { agency } = useAgency();

  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplateId>("editorial-flat");

  // Client & Lead Form State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  const [attendant, setAttendant] = useState(attendantsList[0]?.name || "Eduardo Chapeco");
  const [clientName, setClientName] = useState("Rafael Vasconcelos");
  const [clientEmail, setClientEmail] = useState("rafael@cliente.com.br");
  const [clientPhone, setClientPhone] = useState("(49) 98877-6655");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Modals
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  // Pricing Adjustments State
  const [markupPercent, setMarkupPercent] = useState(12);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Query CRM Leads for real association
  const { data: crmLeads } = useQuery({
    enabled: !!agency?.id && open,
    queryKey: ["crm-leads-quick", agency?.id],
    queryFn: () => (agency?.id ? fetchLeads(agency.id) : Promise.resolve([])),
  });

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!crmLeads) return [];
    if (!leadSearch.trim()) return crmLeads.slice(0, 5);
    return crmLeads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
          (l.phone && l.phone.includes(leadSearch)) ||
          (l.email && l.email.toLowerCase().includes(leadSearch.toLowerCase())),
      )
      .slice(0, 6);
  }, [crmLeads, leadSearch]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setClientName(lead.name);
    if (lead.email) setClientEmail(lead.email);
    if (lead.phone) setClientPhone(lead.phone);
    setShowLeadDropdown(false);
    toast.success(`Lead vinculado: ${lead.name}`);
  };

  // Totals calculations
  const totalTaxes = items.reduce((acc, item) => acc + item.taxAmount, 0);
  const totalNetBase = items.reduce((acc, item) => acc + item.priceAmount, 0);
  const totalBaseCost = totalNetBase + totalTaxes;
  const markupValue = (totalNetBase * markupPercent) / 100;
  const grandTotal = Math.max(0, totalNetBase + markupValue + totalTaxes - discountAmount);
  const installments10x = grandTotal / 10;

  // Selected hotel and flight details for Banner
  const primaryHotel = items.find((i) => i.type === "hotel");
  const primaryFlight = items.find((i) => i.type === "flight");

  const handleAutofillUserData = () => {
    setAttendant("Eduardo Chapeco");
    setClientName("Cliente Preferencial");
    setClientEmail("contato@excelenciatour.com.br");
    setClientPhone("(49) 99123-4567");
    toast.info("Dados de atendimento preenchidos.");
  };

  const handleAction = async (type: "pdf" | "web" | "book" | "contract") => {
    if (!clientName.trim()) {
      toast.error("Por favor, preencha o nome do cliente.");
      return;
    }
    if (items.length === 0) {
      toast.error("O carrinho está vazio.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSaveProposal({
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          attendant,
          notes,
          leadId: selectedLeadId,
        },
        template: selectedTemplate,
        markupPercent,
        discountAmount,
        type,
      });

      if (type === "web") {
        const cleanPhone = clientPhone.replace(/\D/g, "");
        const webLink = result?.token
          ? `${window.location.origin}/m/proposal/${result.token}`
          : `${window.location.origin}/p/orcamento-demo`;

        const msg = encodeURIComponent(
          `Olá ${clientName}! Segue a sua proposta de viagem oficial elaborada por ${agencyName}:\n\n🔗 *Acesse sua proposta interativa:* ${webLink}\n\nQualquer dúvida estou à disposição!`,
        );
        window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${msg}`, "_blank");
        toast.success("Orçamento gerado e WhatsApp aberto com sucesso!");
        onOpenChange(false);
      } else if (type === "contract") {
        if (result?.contractToken) {
          const contractUrl = `${window.location.origin}/m/contract/${result.contractToken}`;
          const cleanPhone = clientPhone.replace(/\D/g, "");
          const msg = encodeURIComponent(
            `Olá ${clientName}! Seu contrato de viagem foi gerado por ${agencyName}.\n\n📄 *Assine eletronicamente com validade jurídica:* ${contractUrl}`,
          );
          window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${msg}`, "_blank");
          toast.success("Contrato gerado com link de assinatura digital!");
        } else {
          toast.success("Contrato gerado com sucesso!");
        }
        onOpenChange(false);
      } else if (type === "pdf") {
        toast.success("Orçamento PDF gerado para download!");
      } else if (type === "book") {
        toast.success("Reserva enviada para confirmação com localizador gerado!");
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar orçamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return Hotel;
      case "flight":
        return Plane;
      case "transfer":
        return Car;
      case "activity":
        return Palmtree;
      case "insurance":
        return ShieldCheck;
      case "chip":
        return Smartphone;
      case "ticket":
        return Ticket;
      default:
        return Package;
    }
  };

  return (
    <>
      <SheetPage
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-foreground" />
            <span>Carrinho · Orçamento</span>
            <span className="text-[11px] font-mono font-bold bg-muted/40 text-foreground px-2 py-0.5 rounded-full border border-border/80">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          </div>
        }
        actions={
          items.length > 0 ? (
            <button
              type="button"
              onClick={onClearCart}
              className="text-destructive hover:underline text-[12px] font-medium flex items-center gap-1 cursor-pointer mr-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          ) : undefined
        }
        width="clamp(540px, 55vw, 860px)"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBannerModalOpen(true)}
                disabled={items.length === 0}
                className="rounded-full text-[12px] h-9 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gerar Banner
              </Button>

              <Button
                type="button"
                onClick={() => handleAction("web")}
                disabled={items.length === 0 || submitting}
                className="rounded-full text-[12px] h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-none cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction("contract")}
                disabled={items.length === 0 || submitting}
                className="rounded-full text-[12px] h-9 font-bold flex items-center gap-1.5"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Contrato Digital
              </Button>

              <Button
                type="button"
                onClick={() => handleAction("book")}
                disabled={items.length === 0 || submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 text-[13px] font-bold h-9 flex items-center gap-1 shadow-none cursor-pointer"
              >
                <span>Reservar</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Tabela de Produtos no Carrinho */}
          <div className="space-y-3">
            <div className="overflow-x-auto border border-border/80 rounded-[var(--radius-xl)] bg-background">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/80 text-[11px]">
                  <tr>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Utilização</th>
                    <th className="p-3 text-right">Taxa</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center w-10">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => {
                    const Icon = getItemIcon(item.type);
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 space-y-0.5">
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-foreground">{item.title}</div>
                              <div className="text-[11px] text-muted-foreground">{item.subtitle}</div>
                              {item.roomOrFare && (
                                <div className="text-[10px] font-mono text-primary font-medium">
                                  {item.roomOrFare} {item.boardBasis ? `· ${item.boardBasis}` : ""}
                                </div>
                              )}
                              {item.passengersDesc && (
                                <div className="text-[10px] text-muted-foreground">
                                  {item.passengersDesc}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                          {item.utilizationPeriod}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {formatCurrency(item.taxAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(item.priceAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum item adicionado ao orçamento ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-muted/40 font-bold border-t border-border">
                    <tr>
                      <td colSpan={2} className="p-3 text-foreground font-semibold">
                        Totalizador do Orçamento
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(totalTaxes)}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-[15px] text-foreground">
                        {formatCurrency(grandTotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Seletor de Template de Proposta (Design System Builder) */}
          <div className="p-4 bg-muted/20 border border-border rounded-[var(--radius-xl)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                Template da Proposta Web & PDF
              </h4>
              <span className="text-[11px] text-muted-foreground font-medium">
                Estilo visual do orçamento
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {PROPOSAL_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-2 rounded-[var(--radius-lg)] border text-left transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-surface shadow-xs"
                        : "border-border/70 bg-background/60 hover:bg-background"
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded mb-1.5 border border-border/50 flex items-center justify-center text-[10px] font-black"
                      style={{ backgroundColor: tmpl.previewBg, color: tmpl.previewBg === "#0f172a" ? "#fff" : "#1e293b" }}
                    >
                      {tmpl.label.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="text-[11px] font-bold text-foreground truncate">{tmpl.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dados do Cliente e CRM Leads */}
          <div className="p-4 bg-muted/20 border border-border rounded-[var(--radius-xl)] space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h4 className="text-[13px] font-bold text-foreground">Dados do cliente & Vínculo CRM</h4>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutofillUserData}
                  className="text-primary text-[11px] font-medium hover:underline flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Preencher dados padrão
                </button>
              </div>
            </div>

            {/* Busca Rápida de Lead CRM */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Vincular Lead do CRM por nome, telefone ou email..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    className="w-full h-8 pl-8 pr-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {selectedLeadId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLeadId(null)}
                    className="h-8 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Desvincular Lead
                  </Button>
                )}
              </div>

              {showLeadDropdown && filteredLeads.length > 0 && (
                <div className="absolute top-9 left-0 w-full z-20 bg-surface border border-border rounded-[var(--radius-lg)] shadow-lg divide-y divide-border/60 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => handleSelectLead(lead)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors flex items-center justify-between text-[12px]"
                    >
                      <div>
                        <div className="font-bold text-foreground">{lead.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {lead.phone || lead.email || "Sem contato informado"}
                        </div>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        Vincular
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inputs do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Atendente <span className="text-destructive">*</span>
                </label>
                <select
                  value={attendant}
                  onChange={(e) => setAttendant(e.target.value)}
                  className="w-full h-8 px-2 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {attendantsList.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Nome <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Telefone / WhatsApp <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Telefone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {showNotes ? (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-muted-foreground">Observações internas da proposta</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Inserir notas sobre preferências de quarto, bagagem extra ou condições..."
                  className="w-full h-16 p-2 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-primary text-[11px] font-medium flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Observação
              </button>
            )}
          </div>

          {/* Barra de Ações Inferiores */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBannerModalOpen(true)}
                disabled={items.length === 0}
                className="rounded-full text-[12px] h-9 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Criar Banner
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustModalOpen(true)}
                disabled={items.length === 0}
                className="rounded-full text-[12px] h-9 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-foreground" />
                Ajuste ({markupPercent}%)
              </Button>
            </div>
          </div>
        </div>
      </SheetPage>

      {/* Modal de Ajuste de Preço */}
      <PriceAdjustmentModal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        baseCost={totalBaseCost}
        initialMarkupPercent={markupPercent}
        initialDiscountAmount={discountAmount}
        onApplyAdjustment={(adj) => {
          setMarkupPercent(adj.markupPercent);
          setDiscountAmount(adj.discountAmount);
          toast.success("Ajuste de margem comercial aplicado ao orçamento!");
        }}
      />

      {/* Modal de Banner */}
      <BannerGeneratorModal
        open={bannerModalOpen}
        onOpenChange={setBannerModalOpen}
        destination={primaryHotel?.title || "Maceió - AL"}
        hotelName={primaryHotel?.title || "Hotel Selecionado"}
        airlineName={primaryFlight?.title || "Azul Linhas Aéreas"}
        nightsCount={5}
        mealPlan={primaryHotel?.boardBasis || "Café da Manhã"}
        totalPrice={grandTotal}
        pricePerPerson={grandTotal / 2}
        installments10x={installments10x}
        agencyName={agencyName}
        agencyPhone={agencyPhone}
      />
    </>
  );
}
