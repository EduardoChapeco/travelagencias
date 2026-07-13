export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

export interface StatusDef {
  label: string;
  tone: Tone;
}

export const CORPORATE_STATUS_MAP: Record<string, StatusDef> = {
  pending: { label: "Pendente", tone: "neutral" },
  quoting: { label: "Em cotação", tone: "warning" },
  sent_for_approval: { label: "Aguardando Aprovação", tone: "primary" },
  approved: { label: "Aprovado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
};

export const CONTRACT_STATUS_MAP: Record<string, StatusDef> = {
  draft: { label: "Rascunho", tone: "neutral" },
  sent: { label: "Enviado", tone: "info" },
  viewed: { label: "Visualizado", tone: "warning" },
  pending_signature: { label: "Aguardando assinatura", tone: "warning" },
  signed: { label: "Assinado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const TRIP_STATUS_MAP: Record<string, StatusDef> = {
  planning: { label: "Planejamento", tone: "neutral" },
  confirmed: { label: "Confirmada", tone: "info" },
  in_progress: { label: "Em andamento", tone: "warning" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export const PROPOSAL_STATUS_MAP: Record<string, StatusDef> = {
  draft: { label: "Rascunho", tone: "neutral" },
  sent: { label: "Enviada", tone: "info" },
  viewed: { label: "Visualizada", tone: "info" },
  accepted: { label: "Aceita", tone: "success" },
  converted: { label: "Convertida", tone: "success" },
  rejected: { label: "Recusada", tone: "danger" },
  expired: { label: "Expirada", tone: "warning" },
};

export const QUOTE_STATUS_MAP: Record<string, StatusDef> = {
  draft: { label: "Rascunho", tone: "neutral" },
  planning: { label: "Planejando", tone: "info" },
  searching: { label: "Buscando", tone: "warning" },
  completed: { label: "Concluído", tone: "success" },
  converted: { label: "Convertido", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const FLIGHT_ITINERARY_STATUS_MAP: Record<string, StatusDef> = {
  draft: { label: "Rascunho", tone: "neutral" },
  active: { label: "Ativo / Vigente", tone: "success" },
  archived: { label: "Arquivado", tone: "warning" },
};

export const FLIGHT_SEGMENT_STATUS_MAP: Record<string, StatusDef> = {
  HK: { label: "Confirmado (HK)", tone: "success" },
  HL: { label: "Waitlist (HL)", tone: "warning" },
  HX: { label: "Cancelado/Rejeitado (HX)", tone: "danger" },
  UN: { label: "Voo Cancelado/Indisponível (UN)", tone: "danger" },
  TK: { label: "Mudança de Horário (TK)", tone: "warning" },
  UC: { label: "Não Confirmado (UC)", tone: "danger" },
  NO: { label: "Ação Pendente (NO)", tone: "neutral" },
  RR: { label: "Reconfirmado (RR)", tone: "success" },
  SS: { label: "Vendido/Aguardando (SS)", tone: "info" },
};

export const PAYABLE_STATUS_MAP: Record<string, StatusDef> = {
  pending: { label: "Pendente", tone: "warning" },
  partial: { label: "Parcial", tone: "info" },
  paid: { label: "Pago", tone: "success" },
  late: { label: "Atrasado", tone: "danger" },
  waived: { label: "Isento", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const BLOG_STATUS_MAP: Record<string, StatusDef> = {
  draft: { label: "Rascunho", tone: "neutral" },
  scheduled: { label: "Agendado", tone: "info" },
  published: { label: "Publicado", tone: "success" },
};

export const BOARDING_STATUS_MAP: Record<string, StatusDef> = {
  pending: { label: "Pendente", tone: "warning" },
  action_needed: { label: "Atenção", tone: "danger" },
  checked_in: { label: "Check-in Emitido", tone: "info" },
  completed: { label: "Embarcado", tone: "success" },
};

export const CONFIRMATION_STATUS_MAP: Record<string, StatusDef> = {
  pending: { label: "Pendente", tone: "warning" },
  confirmed: { label: "Confirmado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

/** 
 * Helper for extracting just the label, useful for text exports
 */
export function getStatusLabel(map: Record<string, StatusDef>, status: string, fallback?: string): string {
  return map[status]?.label || fallback || status;
}

/** 
 * Helper for extracting just the tone, useful for badges
 */
export function getStatusTone(map: Record<string, StatusDef>, status: string, fallback: Tone = "neutral"): Tone {
  return map[status]?.tone || fallback;
}
