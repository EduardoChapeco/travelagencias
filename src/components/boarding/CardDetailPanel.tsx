import { useState, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Clock,
  Users,
  AlertTriangle,
  Link as LinkIcon,
  CheckSquare,
  Square,
  Pencil,
  Check,
  Hotel,
  Bus,
  UserCheck,
  Phone,
  Plane,
  MapPin,
  Upload,
  Ticket,
  Loader2,
  Trash2,
  Globe,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton, GhostButton, fmtDate } from "@/components/ui/form";
import {
  type BoardingCard as Card,
  type ChecklistItem,
  updateBoardingCard,
  updateBoardingCardChecklist,
} from "@/services/boarding";
import { RoomingList } from "./RoomingList";

export function CardDetailPanel({
  card,
  onClose,
  onUpdated,
}: {
  card: Card;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { slug } = useParams({ strict: false });
  const qc = useQueryClient();

  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist ?? []);
  const [newItem, setNewItem] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  // Inline edits
  const [pnr, setPnr] = useState(card.pnr ?? "");
  const [airline, setAirline] = useState(card.airline ?? "");
  const [departureDate, setDepartureDate] = useState(card.departure_date ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [tags, setTags] = useState<string[]>(card.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Briefing
  const [briefingDate, setBriefingDate] = useState(card.briefing_date ?? "");
  const [briefingUrl, setBriefingUrl] = useState(card.briefing_url ?? "");

  // Operational fields (new)
  const [hotelName, setHotelName] = useState(card.hotel_name ?? "");
  const [hotelAddress, setHotelAddress] = useState(card.hotel_address ?? "");
  const [hotelCheckin, setHotelCheckin] = useState(card.hotel_checkin ?? "");
  const [hotelCheckout, setHotelCheckout] = useState(card.hotel_checkout ?? "");
  const [hotelPhone, setHotelPhone] = useState(card.hotel_phone ?? "");
  const [transferProvider, setTransferProvider] = useState(card.transfer_provider ?? "");
  const [transferTime, setTransferTime] = useState(card.transfer_time ?? "");
  const [guideName, setGuideName] = useState(card.guide_name ?? "");
  const [guidePhone, setGuidePhone] = useState(card.guide_phone ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(card.emergency_phone ?? "");
  const [destination, setDestination] = useState(card.destination ?? "");
  const [destinationType, setDestinationType] = useState(card.destination_type ?? "national");

  // Tickets panel
  const [activeSection, setActiveSection] = useState<"main" | "tickets" | "rooming">("main");
  const ticketFileRef = useRef<HTMLInputElement>(null);

  // Support ticket form
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketType, setTicketType] = useState("trip");

  async function exportGuiaPdf() {
    const toastId = toast.loading("Gerando Guia de Embarque PDF...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Create a temporary hidden container for PDF generation
      const printContainer = document.createElement("div");
      printContainer.style.position = "fixed";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "-9999px";
      printContainer.style.width = "800px";
      printContainer.style.backgroundColor = "#FFFFFF";
      printContainer.style.fontFamily = "sans-serif";
      printContainer.style.color = "#151515";
      printContainer.style.padding = "40px";

      // Contextual recommendations
      const recommendations =
        destinationType === "international"
          ? [
              "Passaporte: Deve ter validade mínima de 6 meses a partir da data de retorno.",
              "Visto e Entrada: Certifique-se de que o país de destino não exige visto prévio ou realize a emissão do e-Visa/autorização correspondente.",
              "Vacinas: Certificado Internacional de Vacinação (CIVP) de Febre Amarela e outras vacinas conforme as exigências do destino.",
              "Seguro Viagem: Altamente recomendado, sendo obrigatório para entrada em diversos territórios (ex: Tratado de Schengen na Europa).",
              "Chip eSIM / Conectividade: Ative o roaming internacional ou adquira um chip eSIM de internet antes do embarque.",
            ]
          : [
              "Documentação: Leve documento original com foto oficial (RG atualizado ou CNH física/digital válida).",
              "Apresentação no Aeroporto: Compareça com no mínimo 2 horas de antecedência para voos nacionais.",
              "Franquia de Bagagem: Verifique as dimensões da mala de mão (limite padrão de 10kg) e itens permitidos na cabine.",
              "Medicamentos: Mantenha receitas médicas para medicamentos controlados e transporte-os na bagagem de mão.",
            ];

      let innerHTML = `
        <div style="border: 1px solid #E8E4DC; padding: 30px; background-color: #FFFFFF;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #FF4F9A; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #151515; letter-spacing: -0.5px; text-transform: uppercase;">GUIA DE EMBARQUE</h1>
              <p style="font-size: 11px; color: #777168; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Turis Intelligence</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 14px; font-weight: 800; color: #FF4F9A; font-family: monospace;">PNR: ${pnr || "PENDENTE"}</span>
              <p style="font-size: 10px; color: #777168; margin: 4px 0 0 0;">Ref: ${card.internal_ref || "—"}</p>
            </div>
          </div>

          <!-- Trip details -->
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 6px; color: #777168; text-transform: uppercase; margin-bottom: 12px;">Informações da Viagem</h2>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
              <div>
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #151515;">${card.trip_title || "Sem título de viagem"}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #777168; text-transform: uppercase;">Destino: ${card.trip_destination || destination || "Não especificado"}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; font-weight: 600;">Data: ${departureDate ? new Date(departureDate + "T00:00:00").toLocaleDateString("pt-BR") : "Pendente"}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Cia Aérea: ${airline || "—"}</p>
              </div>
            </div>
          </div>
      `;

      if (hotelName) {
        innerHTML += `
          <!-- Hotel and accommodation details -->
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 6px; color: #777168; text-transform: uppercase; margin-bottom: 12px;">Hospedagem</h2>
            <div style="background-color: #F8F7F4; padding: 15px; border-radius: 4px; border: 1px solid #E8E4DC;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #151515;">${hotelName}</p>
              ${hotelAddress ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Endereço: ${hotelAddress}</p>` : ""}
              <div style="display: flex; gap: 30px; margin-top: 10px; font-size: 11px;">
                <div><strong>Check-in:</strong> ${hotelCheckin ? new Date(hotelCheckin + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                <div><strong>Check-out:</strong> ${hotelCheckout ? new Date(hotelCheckout + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                ${hotelPhone ? `<div><strong>Telefone:</strong> ${hotelPhone}</div>` : ""}
              </div>
            </div>
          </div>
        `;
      }

      if (transferProvider || guideName || emergencyPhone) {
        innerHTML += `
          <!-- Operational and local guide details -->
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 6px; color: #777168; text-transform: uppercase; margin-bottom: 12px;">Operações & Receptivo Local</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        `;

        if (transferProvider) {
          innerHTML += `
              <div style="background-color: #FFFFFF; padding: 12px; border: 1px solid #E8E4DC; border-radius: 4px;">
                <strong style="font-size: 11px; color: #777168; text-transform: uppercase; display: block; margin-bottom: 4px;">Transfer / Translado</strong>
                <span style="font-size: 12px; font-weight: 700; color: #151515;">${transferProvider}</span>
                ${transferTime ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Horário: ${transferTime}</p>` : ""}
              </div>
          `;
        }

        if (guideName) {
          innerHTML += `
              <div style="background-color: #FFFFFF; padding: 12px; border: 1px solid #E8E4DC; border-radius: 4px;">
                <strong style="font-size: 11px; color: #777168; text-transform: uppercase; display: block; margin-bottom: 4px;">Guia Turístico</strong>
                <span style="font-size: 12px; font-weight: 700; color: #151515;">${guideName}</span>
                ${guidePhone ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Telefone: ${guidePhone}</p>` : ""}
              </div>
          `;
        }

        innerHTML += `
            </div>
        `;

        if (emergencyPhone) {
          innerHTML += `
            <div style="margin-top: 10px; background-color: #FFF0F5; border: 1px solid #FFB6C1; padding: 10px 15px; border-radius: 4px; font-size: 12px;">
              <strong>Contato de Emergência / Suporte 24h:</strong> <span style="font-family: monospace; font-weight: bold; color: #FF4F9A;">${emergencyPhone}</span>
            </div>
          `;
        }

        innerHTML += `
          </div>
        `;
      }

      innerHTML += `
          <!-- Recommendations -->
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 6px; color: #777168; text-transform: uppercase; margin-bottom: 12px;">Recomendações Contextuais (${destinationType === "international" ? "Viagem Internacional" : "Viagem Nacional"})</h2>
            <ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #151515; line-height: 1.6;">
              ${recommendations.map((r) => `<li style="margin-bottom: 6px;">${r}</li>`).join("")}
            </ul>
          </div>
      `;

      if (checklist.length > 0) {
        innerHTML += `
          <!-- Checklist -->
          <div style="margin-bottom: 15px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 6px; color: #777168; text-transform: uppercase; margin-bottom: 12px;">Checklist Pré-Embarque</h2>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
              ${checklist
                .map(
                  (c) => `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 11px;">
                  <span style="font-size: 14px; font-family: monospace; font-weight: bold; color: ${c.done ? "#10B981" : "#94A3B8"}">${c.done ? "[x]" : "[ ]"}</span>
                  <span style="text-decoration: ${c.done ? "line-through" : "none"}; color: ${c.done ? "#777168" : "#151515"}">${c.label}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      }

      innerHTML += `
        </div>
      `;

      printContainer.innerHTML = innerHTML;

      document.body.appendChild(printContainer);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(printContainer, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(printContainer);

      const img = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = 297;
      const computedH = (canvas.height * pdfW) / canvas.width;

      pdf.addImage(img, "JPEG", 0, 0, pdfW, Math.min(pdfH, computedH));
      pdf.save(`guia-embarque-${pnr || "reserva"}.pdf`);

      toast.success("Guia de Embarque PDF baixado com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PDF", { id: toastId });
    }
  }

  // Activities timeline query
  const activitiesQ = useQuery({
    queryKey: ["boarding_card_activities", card.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_card_activities")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Support tickets query
  const ticketsQ = useQuery({
    queryKey: ["support_tickets_by_trip", card.trip_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, code, title, status, priority, created_at")
        .eq("trip_id", card.trip_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create Support Ticket Mutation
  const createTicket = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: card.agency_id!,
          trip_id: card.trip_id,
          title: ticketTitle,
          description: ticketDesc || null,
          priority: ticketPriority,
          type: ticketType,
          status: "open",
          ticket_hash: "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Chamado de suporte aberto!");
      setTicketTitle("");
      setTicketDesc("");
      setShowTicketForm(false);
      qc.invalidateQueries({ queryKey: ["support_tickets_by_trip", card.trip_id] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao abrir chamado"),
  });

  const triggerEmergency = useMutation({
    mutationFn: async (kind: "delay" | "cancellation") => {
      const title =
        kind === "delay"
          ? `EMERGÊNCIA: Voo Atrasado (PNR: ${pnr || "Pendente"})`
          : `EMERGÊNCIA: Voo Cancelado (PNR: ${pnr || "Pendente"})`;
      const description =
        `Alerta gerado automaticamente pelo portal do passageiro.\n` +
        `Informações do voo:\n` +
        `- Cia Aérea: ${airline || "Não informada"}\n` +
        `- Ref interna: ${card.internal_ref || "Não informada"}\n` +
        `- Passageiro gerou o alerta de ${kind === "delay" ? "atraso" : "cancelamento"}.`;

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: card.agency_id!,
          trip_id: card.trip_id,
          title,
          description,
          priority: "urgent",
          type: "trip",
          status: "open",
          ticket_hash: "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables === "delay"
          ? "Notificação de atraso enviada para a agência!"
          : "Notificação de cancelamento enviada para a agência!",
        { description: "Nossa equipe de suporte foi alertada em caráter de urgência." },
      );
      qc.invalidateQueries({ queryKey: ["support_tickets_by_trip", card.trip_id] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar alerta de emergência"),
  });

  const PRESET_TAGS = [
    "Passaporte vencendo",
    "Visto pendente",
    "Bagagem especial",
    "Menor desacompanhado",
    "Necessita cadeira",
    "Check-in prioritário",
    "Seguro pendente",
  ];

  const daysToDeparture = departureDate
    ? Math.ceil((new Date(departureDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;

  const urgencyColor =
    daysToDeparture !== null
      ? daysToDeparture <= 0
        ? "text-danger bg-danger/10 border-danger/30"
        : daysToDeparture <= 3
          ? "text-danger bg-danger/10 border-danger/30"
          : daysToDeparture <= 7
            ? "text-warning bg-warning-bg/50 border-warning/30"
            : "text-success bg-success/10 border-success/20"
      : "";

  // Query for tickets
  const ticketsCardQ = useQuery({
    queryKey: ["boarding_tickets", card.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_tickets")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function saveInlineEdits() {
    setEditSaving(true);
    try {
      await updateBoardingCard(card.id, {
        pnr: pnr || null,
        airline: airline || null,
        departure_date: departureDate || null,
        notes: notes || null,
        tags,
        briefing_date: briefingDate || null,
        briefing_url: briefingUrl || null,
      });
      // Save operational fields via direct update
      const { error: opErr } = await supabase
        .from("boarding_cards")
        .update({
          hotel_name: hotelName || null,
          hotel_address: hotelAddress || null,
          hotel_checkin: hotelCheckin || null,
          hotel_checkout: hotelCheckout || null,
          hotel_phone: hotelPhone || null,
          transfer_provider: transferProvider || null,
          transfer_time: transferTime || null,
          guide_name: guideName || null,
          guide_phone: guidePhone || null,
          emergency_phone: emergencyPhone || null,
          destination: destination || null,
          destination_type: destinationType || null,
        })
        .eq("id", card.id);
      if (opErr) throw opErr;
      toast.success("Card atualizado!");
      setEditDirty(false);
      setIsEditing(false);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleItem(i: number) {
    const next = checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const next = [...checklist, { label: newItem.trim(), done: false }];
    setChecklist(next);
    setNewItem("");
    await updateBoardingCardChecklist(card.id, next);
  }

  async function removeItem(i: number) {
    const next = checklist.filter((_, j) => j !== i);
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setNewTag("");
    setEditDirty(true);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    setEditDirty(true);
  }

  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <div className="font-mono text-sm font-bold text-foreground">
              {pnr || "Sem Localizador"}
            </div>
            <div className="text-xs text-muted-foreground">{airline || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {editDirty && (
              <button
                type="button"
                onClick={saveInlineEdits}
                disabled={editSaving}
                className="flex items-center gap-1.5 h-7 rounded-full bg-brand text-brand-foreground px-3 text-xs font-semibold"
              >
                {editSaving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
            <button
              type="button"
              onClick={exportGuiaPdf}
              className="flex items-center gap-1.5 h-7 rounded border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors"
              title="Gerar Guia de Embarque PDF"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>PDF Guia</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded border border-border p-1 hover:bg-surface-alt ${isEditing ? "bg-brand/10 border-brand text-brand" : ""}`}
              title={isEditing ? "Visualizar Informações" : "Editar Informações"}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border p-1 hover:bg-surface-alt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Section toggle */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveSection("main")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeSection === "main"
                ? "border-b-2 border-brand text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Operacional
          </button>
          <button
            onClick={() => setActiveSection("tickets")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeSection === "tickets"
                ? "border-b-2 border-brand text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bilhetes{" "}
            {ticketsCardQ.data && ticketsCardQ.data.length > 0 && `(${ticketsCardQ.data.length})`}
          </button>
          <button
            onClick={() => setActiveSection("rooming")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeSection === "rooming"
                ? "border-b-2 border-brand text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rooming List
          </button>
        </div>
        {/* ── SECTION: TICKETS ── */}
        {activeSection === "tickets" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bilhetes / Ingressos</h3>
              <button
                onClick={() => ticketFileRef.current?.click()}
                className="flex items-center gap-1.5 h-7 border border-border rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-alt transition-colors"
              >
                <Upload className="h-3 w-3" /> Upload Bilhete
              </button>
              <input
                ref={ticketFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !card.agency_id) return;
                  const path = `${card.agency_id}/${card.id}/${Date.now()}_${file.name}`;
                  const { error: upErr } = await supabase.storage
                    .from("boarding-tickets")
                    .upload(path, file, { upsert: true });
                  if (upErr) {
                    toast.error(upErr.message);
                    return;
                  }
                  const {
                    data: { publicUrl },
                  } = supabase.storage.from("boarding-tickets").getPublicUrl(path);
                  const { error: dbErr } = await supabase.from("boarding_tickets").insert({
                    card_id: card.id,
                    agency_id: card.agency_id!,
                    kind: "other",
                    passenger_name: "—",
                    file_url: publicUrl,
                    file_path: path,
                    status: "pending",
                  });
                  if (dbErr) toast.error(dbErr.message);
                  else {
                    toast.success("Bilhete enviado");
                    qc.invalidateQueries({ queryKey: ["boarding_tickets", card.id] });
                  }
                }}
              />
            </div>

            {ticketsCardQ.data?.length === 0 && (
              <div className="text-center py-8 border border-dashed rounded-[24px] text-sm text-muted-foreground">
                Nenhum bilhete. Envie bilhetes aéreos, ingressos ou vouchers de transfer.
              </div>
            )}

            <div className="space-y-2">
              {ticketsCardQ.data?.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-[24px] border border-border bg-white p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.passenger_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.kind} {t.ticket_code ? `· ${t.ticket_code}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {t.file_url && (
                      <a
                        href={t.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Ver
                      </a>
                    )}
                    <button
                      onClick={async () => {
                        await supabase.from("boarding_tickets").delete().eq("id", t.id);
                        qc.invalidateQueries({ queryKey: ["boarding_tickets", card.id] });
                      }}
                      className="text-muted-foreground hover:text-danger p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── SECTION: ROOMING LIST ── */}
        {activeSection === "rooming" && (
          <div className="p-5 space-y-4">
            <RoomingList
              cardId={card.id}
              agencyId={card.agency_id ?? ""}
              defaultHotel={card.hotel_name ?? ""}
            />
          </div>
        )}
        {/* ── SECTION: MAIN OPERATIONAL ── */}
        {activeSection === "main" && (
          <div className="p-5 space-y-5">
            {/* Trip info */}
            {card.trip_title && (
              <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 text-xs">
                <div className="font-semibold text-foreground">{card.trip_title}</div>
                {card.trip_destination && (
                  <div className="text-muted-foreground">{card.trip_destination}</div>
                )}
              </div>
            )}

            {/* Proposta Original Vincular */}
            {card.proposal_details && (
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Proposta Original
                </div>
                <div className="text-xs font-bold text-foreground">
                  {card.proposal_details.title}
                </div>

                {/* Voos da Proposta */}
                {card.proposal_details.flights && card.proposal_details.flights.length > 0 && (
                  <div className="space-y-2 border-t border-border/40 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Voos Propostos:
                    </div>
                    {card.proposal_details.flights.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs rounded border border-border/50 p-2 bg-surface-alt/10"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            {f.origin} ➔ {f.destination}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {f.airline} · {f.flight_number || "Sem nº"} ·{" "}
                            {f.date ? new Date(f.date).toLocaleDateString("pt-BR") : "S/Data"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAirline(f.airline ?? "");
                            setDepartureDate(f.date ? f.date.split("T")[0] : "");
                            setEditDirty(true);
                            toast.success(
                              "Dados do voo importados! Clique em 'Salvar alterações' no topo para registrar.",
                            );
                          }}
                          className="h-6 rounded bg-brand/10 text-brand text-[10px] font-bold px-2 hover:bg-brand/20 transition-colors shrink-0"
                        >
                          Importar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hotéis da Proposta */}
                {card.proposal_details.hotels && card.proposal_details.hotels.length > 0 && (
                  <div className="space-y-2 border-t border-border/40 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Hotéis Propostos:
                    </div>
                    {card.proposal_details.hotels.map((h: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs rounded border border-border/50 p-2 bg-surface-alt/10"
                      >
                        <div className="font-semibold text-foreground">
                          {h.name} ({h.city})
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Check-in:{" "}
                          {h.checkin ? new Date(h.checkin).toLocaleDateString("pt-BR") : "—"} ·
                          Check-out:{" "}
                          {h.checkout ? new Date(h.checkout).toLocaleDateString("pt-BR") : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prazo de embarque */}
            {daysToDeparture !== null && (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${urgencyColor}`}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {daysToDeparture <= 0
                    ? "⚠ EMBARQUE HOJE ou PASSADO!"
                    : `Embarque em ${daysToDeparture} dia${daysToDeparture !== 1 ? "s" : ""}`}
                </div>
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand border-b border-border pb-2">
                  Dados do Voo & Briefing
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Localizador da Reserva</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {pnr || "Pendente"}
                      </span>
                      {tags.includes("auto_dispatch_enabled") && (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-full">
                          Auto-Release
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Cia / Operadora</span>
                    <span className="font-semibold text-foreground">{airline || "Pendente"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Data de Embarque</span>
                    <span className="font-semibold text-foreground">
                      {departureDate
                        ? new Date(departureDate + "T00:00:00").toLocaleDateString("pt-BR")
                        : "Pendente"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Reunião de Briefing</span>
                    <span className="font-semibold text-foreground">
                      {briefingDate
                        ? new Date(briefingDate).toLocaleString("pt-BR")
                        : "Não agendada"}
                    </span>
                  </div>
                  {briefingUrl && (
                    <div className="flex justify-between items-center py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Link da Reunião</span>
                      <a
                        href={briefingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline font-semibold"
                      >
                        {briefingUrl}
                      </a>
                    </div>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Tags / Alertas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 text-[11px] font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Edição inline: PNR, Cia, Data */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Dados do Voo
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Localizador da Reserva
                      </label>
                      <input
                        type="text"
                        value={pnr}
                        onChange={(e) => {
                          setPnr(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="ABC123"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Cia / Operadora
                      </label>
                      <input
                        type="text"
                        value={airline}
                        onChange={(e) => {
                          setAirline(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="LATAM, GOL…"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                  </div>
                  {/* Fase 7 — Links de Check-in Contextual por Companhia Aérea */}
                  {pnr &&
                    airline &&
                    (() => {
                      const airlineNorm = airline.toLowerCase();
                      const isLatam = airlineNorm.includes("latam") || airlineNorm.includes("la");
                      const isGol = airlineNorm.includes("gol") || airlineNorm.includes("g3");
                      const isAzul = airlineNorm.includes("azul") || airlineNorm.includes("ad");
                      const checkinLinks: Array<{ label: string; url: string; color: string }> = [];
                      if (isLatam) {
                        checkinLinks.push({
                          label: "Check-in LATAM",
                          url: `https://www.latamairlines.com/br/pt/check-in?recordLocator=${encodeURIComponent(pnr)}`,
                          color: "text-red-600 border-red-200 bg-red-50 hover:bg-red-100",
                        });
                      }
                      if (isGol) {
                        checkinLinks.push({
                          label: "Check-in GOL",
                          url: `https://www.voegol.com.br/check-in?pnr=${encodeURIComponent(pnr)}`,
                          color:
                            "text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100",
                        });
                      }
                      if (isAzul) {
                        checkinLinks.push({
                          label: "Check-in Azul",
                          url: `https://www.voeazul.com.br/check-in?locator=${encodeURIComponent(pnr)}`,
                          color: "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100",
                        });
                      }
                      // Generic fallback
                      if (checkinLinks.length === 0) {
                        checkinLinks.push({
                          label: `Check-in (PNR: ${pnr})`,
                          url: `https://www.google.com/search?q=${encodeURIComponent(airline + " check-in " + pnr)}`,
                          color: "text-brand border-brand/20 bg-brand/5 hover:bg-brand/10",
                        });
                      }
                      return (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {checkinLinks.map((link) => (
                            <a
                              key={link.url}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded px-2.5 py-1 transition-colors ${link.color}`}
                              title={`Abrir ${link.label}`}
                            >
                              <Globe className="h-3 w-3" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      );
                    })()}

                  {/* Botões de Emergência (Fase 7) */}
                  <div className="mt-3 p-3 rounded-2xl border border-red-200 bg-red-50/50 space-y-2">
                    <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4" /> Emergência no Aeroporto
                    </div>
                    <p className="text-[10px] text-red-600">
                      Seu voo atrasou ou foi cancelado? Clique abaixo para alertar nossa agência
                      instantaneamente.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={triggerEmergency.isPending}
                        onClick={() => {
                          if (confirm("Confirmar alerta de atraso de voo para a agência?")) {
                            triggerEmergency.mutate("delay");
                          }
                        }}
                        className="flex-1 py-1.5 px-3 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-none transition-colors disabled:opacity-50"
                      >
                        Meu Voo Atrasou
                      </button>
                      <button
                        type="button"
                        disabled={triggerEmergency.isPending}
                        onClick={() => {
                          if (confirm("Confirmar alerta de cancelamento de voo para a agência?")) {
                            triggerEmergency.mutate("cancellation");
                          }
                        }}
                        className="flex-1 py-1.5 px-3 rounded border border-red-600 hover:bg-red-100 text-red-700 text-[11px] font-bold shadow-none transition-colors disabled:opacity-50 bg-white"
                      >
                        Voo Cancelado
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Data de Embarque
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => {
                        setDepartureDate(e.target.value);
                        setEditDirty(true);
                      }}
                      className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Reunião de Briefing
                      </label>
                      <input
                        type="datetime-local"
                        value={briefingDate ? briefingDate.slice(0, 16) : ""}
                        onChange={(e) => {
                          setBriefingDate(e.target.value);
                          setEditDirty(true);
                        }}
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Link da Reunião
                      </label>
                      <input
                        type="text"
                        value={briefingUrl}
                        onChange={(e) => {
                          setBriefingUrl(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="https://meet.google.com/..."
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <label className="flex items-start gap-2 cursor-pointer text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 rounded border-border text-brand focus:ring-brand"
                        checked={tags.includes("auto_dispatch_enabled")}
                        onChange={(e) => {
                          const newTags = e.target.checked
                            ? [...tags, "auto_dispatch_enabled"]
                            : tags.filter((t) => t !== "auto_dispatch_enabled");
                          setTags(newTags);
                          setEditDirty(true);
                        }}
                      />
                      <div>
                        <div>Disparo Automático (Liberar embarque automático)</div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">
                          Se ativado, o sistema liberará os vouchers e localizadores automaticamente
                          assim que a IA/OCR conciliar o pagamento. Desative para revisão manual
                          (erros de loc, pendências).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Operational edit fields */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Dados Operacionais
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Destino
                      </label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => {
                          setDestination(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="ex: Cancún, México"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Tipo</label>
                      <select
                        value={destinationType}
                        onChange={(e) => {
                          setDestinationType(e.target.value);
                          setEditDirty(true);
                        }}
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      >
                        <option value="national">Nacional</option>
                        <option value="international">Internacional</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Hotel</label>
                      <input
                        type="text"
                        value={hotelName}
                        onChange={(e) => {
                          setHotelName(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="Nome do hotel"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Telefone Hotel
                      </label>
                      <input
                        type="text"
                        value={hotelPhone}
                        onChange={(e) => {
                          setHotelPhone(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="+1 555 000 0000"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Check-in Hotel
                      </label>
                      <input
                        type="date"
                        value={hotelCheckin}
                        onChange={(e) => {
                          setHotelCheckin(e.target.value);
                          setEditDirty(true);
                        }}
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Check-out Hotel
                      </label>
                      <input
                        type="date"
                        value={hotelCheckout}
                        onChange={(e) => {
                          setHotelCheckout(e.target.value);
                          setEditDirty(true);
                        }}
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Empresa de Transfer
                      </label>
                      <input
                        type="text"
                        value={transferProvider}
                        onChange={(e) => {
                          setTransferProvider(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="ex: GiraTur Transfer"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Horário Transfer
                      </label>
                      <input
                        type="datetime-local"
                        value={transferTime ? transferTime.slice(0, 16) : ""}
                        onChange={(e) => {
                          setTransferTime(e.target.value);
                          setEditDirty(true);
                        }}
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Nome do Guia
                      </label>
                      <input
                        type="text"
                        value={guideName}
                        onChange={(e) => {
                          setGuideName(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="ex: Carlos Matos"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Telefone Guia
                      </label>
                      <input
                        type="text"
                        value={guidePhone}
                        onChange={(e) => {
                          setGuidePhone(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="55 99999-0000"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-muted-foreground font-medium">
                        📞 Telefone de Emergência
                      </label>
                      <input
                        type="text"
                        value={emergencyPhone}
                        onChange={(e) => {
                          setEmergencyPhone(e.target.value);
                          setEditDirty(true);
                        }}
                        placeholder="0800 123 456"
                        className="mt-1 h-8 w-full rounded-full border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Tags / Alertas
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 text-[11px] font-semibold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-danger"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {PRESET_TAGS.filter((t) => !tags.includes(t))
                      .slice(0, 5)
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="rounded-full border border-border bg-surface-alt px-2 py-0.5 text-[10px] text-muted-foreground hover:border-warning hover:text-warning transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newTag);
                        }
                      }}
                      placeholder="Nova tag personalizada…"
                      className="h-8 flex-1 rounded-full border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(newTag)}
                      className="h-8 rounded-full border border-border px-2.5 text-xs hover:bg-surface-alt text-foreground"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Web Check-in Link */}
            <PrimaryButton
              className="w-full h-9 text-xs gap-2 font-bold uppercase tracking-widest bg-brand/10 text-brand hover:bg-brand/20 border-none"
              onClick={() => {
                const url = `${window.location.origin}/m/checkin/${card.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link copiado para a área de transferência!");
              }}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Link Web Check-in (Cliente)
            </PrimaryButton>

            {/* CHECKLIST */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Checklist operacional
                </h3>
                {checklist.length > 0 && (
                  <span
                    className={`text-[11px] font-semibold ${
                      done === checklist.length ? "text-success" : "text-warning"
                    }`}
                  >
                    {done}/{checklist.length} concluídos
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 group/item">
                    <button type="button" onClick={() => toggleItem(i)} className="shrink-0">
                      {item.done ? (
                        <CheckSquare className="h-4 w-4 text-success" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm text-foreground ${item.done ? "line-through text-muted-foreground" : ""}`}
                    >
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Novo item…"
                  className="h-8 flex-1 rounded-full border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="h-8 rounded-full border border-border px-2.5 text-xs hover:bg-surface-alt text-foreground"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Notas livres */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Notas do Operador
              </div>
              {!isEditing ? (
                <p className="text-xs text-foreground/80 leading-relaxed bg-surface-alt/30 p-2.5 rounded-2xl border border-border/40 whitespace-pre-line">
                  {notes || "Nenhuma observação cadastrada."}
                </p>
              ) : (
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setEditDirty(true);
                  }}
                  placeholder="Observações internas sobre este embarque…"
                  rows={3}
                  className="w-full rounded-full border border-border bg-surface-alt px-3 py-2 text-xs outline-none focus:border-border-strong resize-none text-foreground"
                />
              )}
            </div>

            {/* Alerts do sistema */}
            {card.alerts && card.alerts.length > 0 && (
              <div className="rounded-2xl border border-warning/30 bg-warning-bg p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Alertas do Sistema
                </div>
                {card.alerts.map((a, i) => (
                  <div key={i} className="text-xs text-warning">
                    {a}
                  </div>
                ))}
              </div>
            )}

            {/* Passageiros */}
            {(card.passengers_count ?? 0) > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" /> Passageiros
                </div>
                <div className="text-2xl font-bold text-foreground">{card.passengers_count}</div>
              </div>
            )}

            {/* Suporte / Chamados */}
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Chamados de Suporte
                </div>
                {!showTicketForm && (
                  <button
                    type="button"
                    onClick={() => setShowTicketForm(true)}
                    className="text-[10px] font-bold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                  >
                    + Abrir Chamado
                  </button>
                )}
              </div>

              {showTicketForm && (
                <div className="rounded-[24px] border border-border p-3 space-y-3 bg-surface-alt/20 text-xs">
                  <div className="font-semibold text-foreground">Abrir Novo Chamado</div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      placeholder="Título do chamado (ex: Atraso no voo)"
                      className="h-8 w-full rounded-full border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong text-foreground"
                    />
                    <textarea
                      rows={2}
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      placeholder="Descrição / Detalhes..."
                      className="w-full rounded-full border border-border bg-surface px-2.5 py-1 text-xs outline-none focus:border-border-strong resize-none text-foreground"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                        className="h-8 rounded-full border border-border bg-surface text-xs px-2 text-foreground"
                      >
                        <option value="trip">Viagem</option>
                        <option value="financial">Financeiro</option>
                        <option value="complaint">Reclamação</option>
                        <option value="refund">Reembolso</option>
                      </select>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value)}
                        className="h-8 rounded-full border border-border bg-surface text-xs px-2 text-foreground"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      disabled={createTicket.isPending || !ticketTitle}
                      onClick={() => createTicket.mutate()}
                      className="h-7 rounded bg-brand text-brand-foreground text-xs font-semibold px-3 hover:bg-brand/95"
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTicketForm(false);
                        setTicketTitle("");
                        setTicketDesc("");
                      }}
                      className="h-7 rounded border border-border text-xs px-3 hover:bg-surface-alt text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {ticketsQ.isLoading && (
                <p className="text-[10px] text-muted-foreground">Carregando chamados...</p>
              )}

              {ticketsQ.data && ticketsQ.data.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {ticketsQ.data.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between border border-border/60 rounded-2xl p-2.5 text-xs bg-surface-alt/10"
                    >
                      <div>
                        <div className="font-mono text-[9px] text-muted-foreground">{t.code}</div>
                        <Link
                          to="/agency/$slug/support/$ticket_id"
                          params={{ slug: slug!, ticket_id: t.id }}
                          className="font-semibold text-foreground hover:text-brand hover:underline"
                        >
                          {t.title}
                        </Link>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            t.status === "resolved"
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {t.status === "resolved" ? "Resolvido" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Nenhum chamado de suporte aberto para esta viagem.
                </p>
              )}
            </div>

            {/* Atividades Timeline */}
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Atividades / Histórico
              </div>

              {activitiesQ.isLoading && (
                <p className="text-[10px] text-muted-foreground">Carregando histórico...</p>
              )}

              {activitiesQ.data && activitiesQ.data.length > 0 ? (
                <div className="relative border-l border-border/60 pl-3.5 space-y-3.5 ml-1.5 max-h-52 overflow-y-auto">
                  {activitiesQ.data.map((act: any) => (
                    <div key={act.id} className="relative text-[10px] text-foreground/80">
                      <div className="absolute -left-[20px] top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" />
                      <div className="font-semibold text-foreground">{act.description}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                        {new Date(act.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Nenhuma atividade registrada ainda.
                </p>
              )}
            </div>
          </div>
        )}{" "}
        {/* end activeSection === main */}
      </div>
    </div>
  );
}
