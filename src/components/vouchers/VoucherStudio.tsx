import { Button } from "@/components/ui/button";
/**
 * VoucherStudio — editor visual de vouchers com StudioFrame
 * Sprint 3: Refatoração do componente monolítico de vouchers
 *
 * Props:
 *   - voucher: Voucher (existente ou draft inicial)
 *   - agency: dados da agência
 *   - onSave: callback que recebe o draft para persistir
 *   - onCancel: volta para lista
 *   - isEdit: modo edição vs. criação
 */
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Download,
  Plane,
  Hotel,
  Bus,
  User,
  Phone,
  Umbrella,
  ChevronDown,
  ChevronRight,
  Instagram,
  Upload,
  Save,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
// ⚡ html2canvas is loaded on-demand to prevent build heap exhaustion.
// Do NOT revert to a static import — this library is ~150 KB and triggers
// Vite SSR out-of-memory errors when statically bundled.
let _html2canvas: typeof import("html2canvas").default | null = null;
async function getHtml2Canvas() {
  if (!_html2canvas) {
    const mod = await import("html2canvas");
    _html2canvas = mod.default;
  }
  return _html2canvas;
}
import {
  type Voucher,
  type VoucherFlight,
  type VoucherAccommodation,
  type VoucherTransfer,
} from "@/services/vouchers";
import { StudioFrame, type CanvasFormat } from "@/components/studio/StudioFrame";
import TemplateVoucherEmbarqueA4 from "./templates/TemplateVoucherEmbarqueA4";
import TemplateVoucherStory from "./templates/TemplateVoucherStory";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAgency } from "@/lib/agency-context";
import {
  SupplierAutocomplete,
  type SupplierOption,
} from "@/components/suppliers/SupplierAutocomplete";

// ─── Types ────────────────────────────────────────────────────────────────────

type CanvasMode = "a4-portrait" | "story-916" | "whatsapp";
type TabId =
  | "passengers"
  | "flights"
  | "accommodation"
  | "transfers"
  | "emergency"
  | "observations";

interface Props {
  draft: Partial<Voucher>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Voucher>>>;
  agency: { name: string; slug: string; logo_url?: string | null; brand_color?: string };
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
  onUploadPdf: (file: File) => void;
  onPdfGenerated?: (blob: Blob) => Promise<void>;
  isEdit: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SMALL =
  "w-full h-8 px-2.5 rounded-full border border-border/50 bg-surface-alt/50 text-xs outline-none transition-all focus:bg-surface focus:border-border-strong";

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function AccordionSection({
  id,
  label,
  icon,
  count,
  openId,
  setOpenId,
  children,
}: {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
  openId: TabId | null;
  setOpenId: (v: TabId | null) => void;
  children: React.ReactNode;
}) {
  const open = openId === id;
  return (
    <div className="rounded-2xl border border-border bg-surface">
      <Button
        type="button"
        onClick={() => setOpenId(open ? null : id)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-surface-alt transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {icon}
        {label}
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-surface-alt px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
            {count}
          </span>
        )}
      </Button>
      {open && <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-2">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VoucherStudio({
  draft,
  setDraft,
  agency,
  onSave,
  saving,
  onCancel,
  onUploadPdf,
  onPdfGenerated,
  isEdit,
}: Props) {
  const [mode, setMode] = useState<CanvasMode>("a4-portrait");
  const [openSection, setOpenSection] = useState<TabId | null>("passengers");
  const [exporting, setExporting] = useState(false);
  const [storySheetOpen, setStorySheetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { brandKit, companyProfile } = useAgency();

  const renderSidebarContent = () => (
    <>
      {draft.source_type === "operator_pdf" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-800 leading-normal space-y-1">
          <span className="font-semibold block">Leitura de Documento & Modo de Contingência</span>
          <p>
            O comprovante da operadora foi anexado com sucesso. Caso o leitor digital de documentos
            não tenha preenchido automaticamente todos os detalhes de voos ou hospedagens por
            oscilações na conexão, você poderá complementar os campos manualmente utilizando os
            botões abaixo.
          </p>
        </div>
      )}

      {/* Header fields */}
      <div className="rounded-2xl border border-border bg-surface p-3 grid grid-cols-1 gap-2">
        <Lbl label="Destino">
          <input
            className={SMALL}
            value={draft.destination ?? ""}
            onChange={(e) => upd("destination", e.target.value)}
            placeholder="Lisboa, Portugal"
          />
        </Lbl>
        <Lbl label="Localizador">
          <input
            className={SMALL}
            value={draft.general_locator ?? ""}
            onChange={(e) => upd("general_locator", e.target.value)}
            placeholder="PNR / Código"
          />
        </Lbl>
      </div>

      {/* Passengers */}
      <AccordionSection
        id="passengers"
        label="Passageiros"
        icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
        count={passengers.length}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        {passengers.map((p, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-full border border-border p-2"
          >
            <Lbl label="Nome">
              <input
                className={SMALL}
                value={p.name}
                onChange={(e) => {
                  const arr = [...passengers];
                  arr[i] = { ...p, name: e.target.value };
                  upd("passengers", arr);
                }}
              />
            </Lbl>
            <Lbl label="Documento">
              <input
                className={SMALL}
                value={p.document ?? ""}
                onChange={(e) => {
                  const arr = [...passengers];
                  arr[i] = { ...p, document: e.target.value };
                  upd("passengers", arr);
                }}
              />
            </Lbl>
            <Lbl label="Assento">
              <input
                className={SMALL}
                value={p.seat ?? ""}
                onChange={(e) => {
                  const arr = [...passengers];
                  arr[i] = { ...p, seat: e.target.value };
                  upd("passengers", arr);
                }}
              />
            </Lbl>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() =>
                  upd(
                    "passengers",
                    passengers.filter((_, x) => x !== i),
                  )
                }
                className="text-xs text-danger hover:underline"
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          onClick={() => upd("passengers", [...passengers, { name: "", document: "", seat: "" }])}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
        >
          + Passageiro
        </Button>
      </AccordionSection>

      {/* Flights */}
      <AccordionSection
        id="flights"
        label="Voos"
        icon={<Plane className="h-3.5 w-3.5 text-muted-foreground" />}
        count={flights.length}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        {flights.map((f, i) => (
          <div key={i} className="space-y-1.5 rounded-full border border-border p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="sm:col-span-2">
                <Lbl label="Buscar Cia Aérea no Catálogo">
                  <SupplierAutocomplete
                    agencyId={draft.agency_id ?? ""}
                    value={null}
                    onChange={(s: SupplierOption | null) => {
                      if (!s) return;
                      const arr = [...flights];
                      arr[i] = {
                        ...f,
                        airline: s.name,
                      };
                      upd("flights", arr);
                    }}
                    filterKind="airline"
                    placeholder="Buscar cia aérea cadastrada..."
                  />
                </Lbl>
              </div>
              <Lbl label="Cia Aérea">
                <input
                  className={SMALL}
                  value={f.airline}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, airline: e.target.value };
                    upd("flights", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Voo Nº">
                <input
                  className={SMALL}
                  value={f.flight_number}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, flight_number: e.target.value };
                    upd("flights", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Origem">
                <input
                  className={SMALL}
                  value={f.origin}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, origin: e.target.value };
                    upd("flights", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Destino">
                <input
                  className={SMALL}
                  value={f.destination}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, destination: e.target.value };
                    upd("flights", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Data">
                <input
                  className={SMALL}
                  type="date"
                  value={f.date}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, date: e.target.value };
                    upd("flights", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Saída">
                <input
                  className={SMALL}
                  value={f.departure_time}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, departure_time: e.target.value };
                    upd("flights", arr);
                  }}
                  placeholder="08:30"
                />
              </Lbl>
              <Lbl label="Chegada">
                <input
                  className={SMALL}
                  value={f.arrival_time}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, arrival_time: e.target.value };
                    upd("flights", arr);
                  }}
                  placeholder="14:45"
                />
              </Lbl>
              <Lbl label="Classe">
                <input
                  className={SMALL}
                  value={f.class}
                  onChange={(e) => {
                    const arr = [...flights];
                    arr[i] = { ...f, class: e.target.value };
                    upd("flights", arr);
                  }}
                  placeholder="Economy"
                />
              </Lbl>
            </div>
            <Button
              type="button"
              onClick={() =>
                upd(
                  "flights",
                  flights.filter((_, x) => x !== i),
                )
              }
              className="text-[10px] text-danger hover:underline"
            >
              Remover voo
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            upd("flights", [
              ...flights,
              {
                locator: "",
                airline: "",
                flight_number: "",
                origin: "",
                destination: "",
                date: "",
                departure_time: "",
                arrival_time: "",
                class: "Economy",
                baggage: "23kg",
              },
            ])
          }
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
        >
          + Voo
        </Button>
      </AccordionSection>

      {/* Accommodation */}
      <AccordionSection
        id="accommodation"
        label="Hospedagem"
        icon={<Hotel className="h-3.5 w-3.5 text-muted-foreground" />}
        count={accommodation.length}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        {accommodation.map((a, i) => (
          <div key={i} className="space-y-1.5 rounded-full border border-border p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="sm:col-span-2">
                <Lbl label="Buscar Hotel no Catálogo da Agência">
                  <SupplierAutocomplete
                    agencyId={draft.agency_id ?? ""}
                    value={null}
                    onChange={(s: SupplierOption | null) => {
                      if (!s) return;
                      const arr = [...accommodation];
                      arr[i] = {
                        ...a,
                        name: s.name,
                        city: s.city ?? a.city,
                        phone: s.phone ?? a.phone,
                      };
                      upd("accommodation", arr);
                    }}
                    filterKind="hotel"
                    placeholder="Buscar hotel cadastrado..."
                  />
                </Lbl>
              </div>
              <Lbl label="Hotel">
                <input
                  className={SMALL}
                  value={a.name}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, name: e.target.value };
                    upd("accommodation", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Cidade">
                <input
                  className={SMALL}
                  value={a.city}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, city: e.target.value };
                    upd("accommodation", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Check-in">
                <input
                  className={SMALL}
                  type="date"
                  value={a.checkin}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, checkin: e.target.value };
                    upd("accommodation", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Check-out">
                <input
                  className={SMALL}
                  type="date"
                  value={a.checkout}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, checkout: e.target.value };
                    upd("accommodation", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Quarto">
                <input
                  className={SMALL}
                  value={a.room_type}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, room_type: e.target.value };
                    upd("accommodation", arr);
                  }}
                  placeholder="Duplo"
                />
              </Lbl>
              <Lbl label="Localizador">
                <input
                  className={SMALL}
                  value={a.confirmation}
                  onChange={(e) => {
                    const arr = [...accommodation];
                    arr[i] = { ...a, confirmation: e.target.value };
                    upd("accommodation", arr);
                  }}
                />
              </Lbl>
            </div>
            <Button
              type="button"
              onClick={() =>
                upd(
                  "accommodation",
                  accommodation.filter((_, x) => x !== i),
                )
              }
              className="text-[10px] text-danger hover:underline"
            >
              Remover hotel
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            upd("accommodation", [
              ...accommodation,
              {
                name: "",
                city: "",
                address: "",
                phone: "",
                checkin: "",
                checkout: "",
                room_type: "",
                meal_plan: "",
                confirmation: "",
              },
            ])
          }
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
        >
          + Hospedagem
        </Button>
      </AccordionSection>

      {/* Transfers */}
      <AccordionSection
        id="transfers"
        label="Transfers"
        icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />}
        count={transfers.length}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        {transfers.map((t, i) => (
          <div key={i} className="space-y-1.5 rounded-full border border-border p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="sm:col-span-2">
                <Lbl label="Buscar Operadora de Transfer">
                  <SupplierAutocomplete
                    agencyId={draft.agency_id ?? ""}
                    value={null}
                    onChange={(s: SupplierOption | null) => {
                      if (!s) return;
                      const arr = [...transfers];
                      arr[i] = {
                        ...t,
                        supplier: s.name,
                      };
                      upd("transfers", arr);
                    }}
                    filterKind="transport"
                    placeholder="Buscar transfer/operadora..."
                  />
                </Lbl>
              </div>
              <Lbl label="Tipo">
                <input
                  className={SMALL}
                  value={t.type}
                  onChange={(e) => {
                    const arr = [...transfers];
                    arr[i] = { ...t, type: e.target.value };
                    upd("transfers", arr);
                  }}
                  placeholder="Aeroporto"
                />
              </Lbl>
              <Lbl label="Data">
                <input
                  className={SMALL}
                  type="date"
                  value={t.date}
                  onChange={(e) => {
                    const arr = [...transfers];
                    arr[i] = { ...t, date: e.target.value };
                    upd("transfers", arr);
                  }}
                />
              </Lbl>
              <Lbl label="De">
                <input
                  className={SMALL}
                  value={t.origin}
                  onChange={(e) => {
                    const arr = [...transfers];
                    arr[i] = { ...t, origin: e.target.value };
                    upd("transfers", arr);
                  }}
                />
              </Lbl>
              <Lbl label="Para">
                <input
                  className={SMALL}
                  value={t.destination}
                  onChange={(e) => {
                    const arr = [...transfers];
                    arr[i] = { ...t, destination: e.target.value };
                    upd("transfers", arr);
                  }}
                />
              </Lbl>
            </div>
            <Button
              type="button"
              onClick={() =>
                upd(
                  "transfers",
                  transfers.filter((_, x) => x !== i),
                )
              }
              className="text-[10px] text-danger hover:underline"
            >
              Remover transfer
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            upd("transfers", [
              ...transfers,
              {
                type: "Aeroporto ↔ Hotel",
                date: "",
                origin: "",
                destination: "",
                vehicle: "",
                supplier: "",
                confirmation: "",
              },
            ])
          }
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
        >
          + Transfer
        </Button>
      </AccordionSection>

      {/* Emergency */}
      <AccordionSection
        id="emergency"
        label="Emergência"
        icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />}
        count={emergency.length}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        {emergency.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-full border border-border p-2"
          >
            <Lbl label="Nome">
              <input
                className={SMALL}
                value={c.name}
                onChange={(e) => {
                  const arr = [...emergency];
                  arr[i] = { ...c, name: e.target.value };
                  upd("emergency_contacts", arr);
                }}
              />
            </Lbl>
            <Lbl label="Telefone">
              <input
                className={SMALL}
                value={c.phone}
                onChange={(e) => {
                  const arr = [...emergency];
                  arr[i] = { ...c, phone: e.target.value };
                  upd("emergency_contacts", arr);
                }}
              />
            </Lbl>
            <Lbl label="Função">
              <input
                className={SMALL}
                value={c.role}
                onChange={(e) => {
                  const arr = [...emergency];
                  arr[i] = { ...c, role: e.target.value };
                  upd("emergency_contacts", arr);
                }}
                placeholder="Guia"
              />
            </Lbl>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() =>
                  upd(
                    "emergency_contacts",
                    emergency.filter((_, x) => x !== i),
                  )
                }
                className="text-[10px] text-danger hover:underline"
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            upd("emergency_contacts", [...emergency, { name: "", phone: "", role: "" }])
          }
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
        >
          + Contato
        </Button>
      </AccordionSection>

      {/* Observations */}
      <AccordionSection
        id="observations"
        label="Observações"
        icon={<Umbrella className="h-3.5 w-3.5 text-muted-foreground" />}
        openId={openSection}
        setOpenId={setOpenSection}
      >
        <textarea
          rows={4}
          className="w-full rounded-full border border-border/50 bg-surface-alt/50 px-2.5 py-2 text-xs outline-none focus:border-border-strong resize-none"
          value={draft.observations ?? ""}
          onChange={(e) => upd("observations", e.target.value)}
          placeholder="Informações adicionais para o passageiro…"
        />
      </AccordionSection>
    </>
  );

  const flights = draft.flights ?? [];
  const accommodation = draft.accommodation ?? [];
  const transfers = draft.transfers ?? [];
  const passengers = draft.passengers ?? [];
  const emergency = draft.emergency_contacts ?? [];

  function upd<K extends keyof Voucher>(key: K, value: any) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // ── WhatsApp Text Generator ──────────────────────────────────────────────
  function generateWhatsAppText(): string {
    let text = `✈️ *RESUMO DE EMBARQUE - ${draft.destination || "Sua Viagem"}*\n\n`;

    if (draft.general_locator) {
      text += `🔑 *Localizador Geral:* \`${draft.general_locator}\`\n\n`;
    }

    if (passengers.length > 0) {
      text += `👤 *Passageiros:*\n`;
      passengers.forEach((p) => {
        text += `- ${p.name}${p.document ? ` (Doc: ${p.document})` : ""}${p.seat ? ` - Assento: ${p.seat}` : ""}\n`;
      });
      text += `\n`;
    }

    if (flights.length > 0) {
      text += `🛫 *Voos Confirmados:*\n`;
      flights.forEach((f, idx) => {
        text += `*Voo ${idx + 1}:* ${f.airline} ${f.flight_number || ""}\n`;
        text += `📍 ${f.origin} ➔ ${f.destination}\n`;
        text += `📅 Data: ${f.date || "A confirmar"} | Saída: ${f.departure_time || "--:--"} | Chegada: ${f.arrival_time || "--:--"}\n`;
        if (f.locator) text += `🔑 Localizador: \`${f.locator}\`\n`;
        if (f.class) text += `💺 Classe: ${f.class}\n`;
        text += `\n`;
      });
    }

    if (accommodation.length > 0) {
      text += `🏨 *Hospedagem:*\n`;
      accommodation.forEach((h, idx) => {
        text += `*Hotel ${idx + 1}:* ${h.name}\n`;
        if (h.city) text += `📍 Cidade: ${h.city}\n`;
        text += `📅 Check-in: ${h.checkin || "A confirmar"} | Check-out: ${h.checkout || "A confirmar"}\n`;
        if (h.room_type) text += `🛏️ Quarto: ${h.room_type}\n`;
        if (h.meal_plan) text += `☕ Regime: ${h.meal_plan}\n`;
        if (h.confirmation) text += `🔑 Confirmação: \`${h.confirmation}\`\n`;
        text += `\n`;
      });
    }

    if (transfers.length > 0) {
      text += `🚌 *Transfers:*\n`;
      transfers.forEach((t) => {
        text += `- ${t.type || "Transfer"}: ${t.origin || "Origem"} ➔ ${t.destination || "Destino"}\n`;
        if (t.date) text += `  📅 Data: ${t.date}\n`;
        if (t.vehicle) text += `  🚗 Veículo: ${t.vehicle}\n`;
        if (t.supplier) text += `  🏢 Operadora: ${t.supplier}\n`;
        if (t.confirmation) text += `  🔑 Confirmação: \`${t.confirmation}\`\n`;
        text += `\n`;
      });
    }

    if (emergency.length > 0) {
      text += `🚨 *Contatos de Emergência:*\n`;
      emergency.forEach((c) => {
        text += `- ${c.name} (${c.role || "Suporte"}): ${c.phone}\n`;
      });
      text += `\n`;
    }

    if (draft.observations) {
      text += `📝 *Observações Importantes:*\n${draft.observations}\n\n`;
    }

    text += `💙 *Desejamos uma excelente viagem!*\n\nPlanejado com cuidado por *${agency.name}*`;
    return text;
  }

  // ── Export A4 PDF ──────────────────────────────────────────────────────────
  async function exportA4Pdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const el = document.getElementById("voucher-canvas");
      if (!el) throw new Error("Canvas não encontrado");
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const html2canvas = await getHtml2Canvas();
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const clonedCanvas = clonedDoc.getElementById("proposal-canvas");
          if (clonedCanvas) {
            clonedCanvas.style.transform = "none";
            clonedCanvas.style.transition = "none";
          }
        },
      });
      const img = canvas.toDataURL("image/jpeg", 0.96);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = 297;

      const pageCanvasHeight = imgWidth * 1.414;
      const totalPages = Math.ceil(imgHeight / pageCanvasHeight);
      const totalPdfHeight = pdfW * (imgHeight / imgWidth);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage("a4", "portrait");
        }
        const yOffset = -page * pdfH;
        pdf.addImage(img, "JPEG", 0, yOffset, pdfW, totalPdfHeight);
      }

      // Download local
      pdf.save(`voucher-${draft.destination ?? "viagem"}.pdf`);

      // Fase 6: persistir PDF no Storage via callback do componente pai
      if (onPdfGenerated) {
        const blob = pdf.output("blob");
        await onPdfGenerated(blob);
      }

      toast.success("PDF exportado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  }

  // ── Export Story PNG ───────────────────────────────────────────────────────
  async function exportStoryPng() {
    setExporting(true);
    try {
      const el =
        document.getElementById("story-canvas") || document.getElementById("story-preview-canvas");
      if (!el) throw new Error("Canvas Story não encontrado");
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const html2canvas = await getHtml2Canvas();
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const clonedCanvas = clonedDoc.getElementById("proposal-canvas");
          if (clonedCanvas) {
            clonedCanvas.style.transform = "none";
            clonedCanvas.style.transition = "none";
          }
        },
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `story-${draft.destination ?? "viagem"}.png`;
      a.click();
      toast.success("Story exportado!");
    } catch (e) {
      toast.error("Erro ao gerar Story");
    } finally {
      setExporting(false);
    }
  }

  // ─── Voucher as full prop for templates ────────────────────────────────────
  const voucherForTemplate: Voucher = {
    id: draft.id ?? "",
    trip_id: draft.trip_id ?? "",
    agency_id: draft.agency_id ?? "",
    source_type: draft.source_type ?? "manual",
    source_file_url: null,
    destination: draft.destination ?? null,
    general_locator: draft.general_locator ?? null,
    observations: draft.observations ?? null,
    cover_image_url: null,
    template: draft.template ?? "navy",
    passengers,
    flights,
    accommodation,
    transfers,
    tours: draft.tours ?? [],
    insurance: draft.insurance ?? {},
    emergency_contacts: emergency,
    pdf_url: null,
    generated_at: null,
    created_at: new Date().toISOString(),
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-sm font-semibold">
              {isEdit ? "Editar Voucher" : "Novo Voucher"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {draft.destination ?? "Sem destino"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile/Tablet config panel toggle */}
          <Button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-surface-alt transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Campos</span>
          </Button>
          {/* Format toggle */}
          <div className="flex rounded-full border border-border overflow-hidden">
            <Button
              type="button"
              onClick={() => setMode("a4-portrait")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === "a4-portrait" ? "bg-primary text-primary-foreground" : "hover:bg-surface-alt"}`}
            >
              A4
            </Button>
            <Button
              type="button"
              onClick={() => setMode("story-916")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === "story-916" ? "bg-primary text-primary-foreground" : "hover:bg-surface-alt"}`}
            >
              Story 9:16
            </Button>
            <Button
              type="button"
              onClick={() => setMode("whatsapp")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === "whatsapp" ? "bg-primary text-primary-foreground" : "hover:bg-surface-alt"}`}
            >
              WhatsApp
            </Button>
          </div>

          {/* Upload PDF */}
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-brand/50 bg-brand/5 px-3 text-xs font-bold text-brand hover:bg-brand/10 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            OCR IA
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUploadPdf(e.target.files[0])}
            />
          </label>

          {/* Export */}
          {mode === "a4-portrait" && (
            <Button
              type="button"
              onClick={exportA4Pdf}
              disabled={exporting}
              className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-surface-alt transition-colors disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exportando…" : "PDF A4"}
            </Button>
          )}
          {mode === "story-916" && (
            <Button
              type="button"
              onClick={() => setStorySheetOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-surface-alt transition-colors"
            >
              <Instagram className="h-3.5 w-3.5" />
              Story
            </Button>
          )}

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60 whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando…" : isEdit ? "Salvar" : "Criar Voucher"}
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sidebar */}
        <div className="hidden xl:block w-[280px] shrink-0 border-r border-border bg-surface overflow-y-auto p-3 space-y-2">
          {renderSidebarContent()}
        </div>

        {/* Right: Canvas preview / WhatsApp Chat */}
        <div className="flex-1 min-w-0 overflow-auto bg-surface-alt/30 flex items-start justify-center py-8">
          {mode === "whatsapp" ? (
            <div className="w-full max-w-sm bg-[#efeae2] rounded-[var(--radius-card)] border border-border/80 overflow-hidden flex flex-col h-[569px] font-sans">
              {/* WhatsApp Header */}
              <div className="bg-[#00a884] text-white px-4 py-2.5 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
                  {agency.logo_url ? (
                    <img src={agency.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm">{agency.name.substring(0, 2)}</span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs">{agency.name}</div>
                  <div className="text-[9px] text-white/80">Online</div>
                </div>
              </div>

              {/* Chat area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                <div className="max-w-[85%] bg-[#d9fdd3] text-[#111b21] rounded-2xl p-3 text-[11px] self-end ml-auto whitespace-pre-wrap font-mono relative leading-normal border border-border/20">
                  {generateWhatsAppText()}
                </div>
              </div>

              {/* Actions footer */}
              <div className="bg-[#f0f2f5] p-3 border-t border-border/80 flex gap-2 justify-end shrink-0">
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateWhatsAppText());
                    toast.success("Mensagem copiada!");
                  }}
                  className="h-8 rounded-full bg-white border border-border px-3 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  Copiar Mensagem
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generateWhatsAppText())}`;
                    window.open(url, "_blank");
                  }}
                  className="h-8 rounded-full bg-[#25d366] text-white px-4 text-xs font-semibold hover:bg-[#20ba5a] flex items-center gap-1.5 transition-colors"
                >
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <StudioFrame format={mode} zoomMode={0.72}>
              {mode === "a4-portrait" ? (
                <div id="voucher-canvas">
                  <TemplateVoucherEmbarqueA4
                    voucher={voucherForTemplate}
                    agency={agency}
                    brandKit={brandKit || undefined}
                    companyProfile={companyProfile || undefined}
                  />
                </div>
              ) : (
                <div id="story-preview-canvas" className="w-full h-full">
                  <TemplateVoucherStory
                    voucher={voucherForTemplate}
                    agency={agency}
                    brandKit={brandKit || undefined}
                  />
                </div>
              )}
            </StudioFrame>
          )}
        </div>
      </div>

      {/* ── Story Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={storySheetOpen} onOpenChange={setStorySheetOpen}>
        <SheetContent side="right" className="w-full max-w-md p-0 overflow-y-auto">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-semibold">Gerador de Story 9:16</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Baixe em alta resolução para enviar ao cliente.
            </p>
          </SheetHeader>
          <div className="px-6 py-4 flex flex-col gap-4 items-center">
            {/* Story preview inside sheet */}
            <div
              id="story-canvas"
              className="relative overflow-hidden shrink-0"
              style={{ width: "320px", height: "569px" }}
            >
              <TemplateVoucherStory
                voucher={voucherForTemplate}
                agency={agency}
                brandKit={brandKit || undefined}
              />
            </div>
            <div className="flex gap-3 w-full">
              <Button
                type="button"
                onClick={() => setStorySheetOpen(false)}
                className="flex-1 h-9 rounded-full border border-border text-xs font-medium hover:bg-surface-alt transition-colors"
              >
                Fechar
              </Button>
              <Button
                type="button"
                onClick={exportStoryPng}
                disabled={exporting}
                className="flex-1 h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Gerando…" : "Baixar 9:16 PNG"}
              </Button>
            </div>
          </div>
        </SheetContent>
        {/* ── Mobile Sidebar Config Sheet ────────────────────────────────────── */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-full max-w-[320px] p-0 overflow-y-auto bg-surface animate-none"
          >
            <SheetHeader className="px-4 py-3 border-b border-border bg-surface-alt/10">
              <SheetTitle className="text-xs font-bold uppercase tracking-wider">
                Campos do Voucher
              </SheetTitle>
            </SheetHeader>
            <div className="p-3 space-y-2">{renderSidebarContent()}</div>
          </SheetContent>
        </Sheet>
      </Sheet>
    </div>
  );
}
