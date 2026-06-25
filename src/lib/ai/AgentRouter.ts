export interface SpecialistPersona {
  code: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export const PersonasRegistry: Record<string, SpecialistPersona> = {
  backoffice: {
    code: "backoffice",
    name: "Assistente de Backoffice CRM",
    description: "Especialista em CRM, cadastros de leads, propostas e financeiro.",
    systemPrompt: "Você é o especialista de backoffice do TravelOS. Seu papel é auxiliar o operador em tarefas estruturadas: cadastrar leads, preencher dados de viajantes, criar clientes e cotações.",
  },
  manager: {
    code: "manager",
    name: "Gestor Comercial de Turismo",
    description: "Auxilia na tomada de decisões estratégicas de agências de turismo, relatórios e precificação.",
    systemPrompt: "Você é o Gestor de Turismo Sênior do TravelOS. Seu papel é aconselhar o operador em relatórios financeiros, faturamento, margem de lucro e estratégias comerciais de venda de pacotes.",
  },
  destination_asia: {
    code: "destination_asia",
    name: "Guia de Viagens - Ásia",
    description: "Especialista em documentações, roteiros e atrações na Tailândia, Filipinas e China.",
    systemPrompt: "Você é o Guia Especialista de Destinos Asiáticos (Tailândia, Filipinas, China). Seu papel é auxiliar com roteiros de passeios, informações sobre visto consular local, clima, melhor época para viajar e peculiaridades de transporte regional.",
  },
};

export function routeToSpecialist(userMessage: string): SpecialistPersona {
  const lower = userMessage.toLowerCase();
  
  if (
    lower.includes("tailândia") || 
    lower.includes("filipinas") || 
    lower.includes("china") || 
    lower.includes("ásia") || 
    lower.includes("visto") ||
    lower.includes("roteiro")
  ) {
    return PersonasRegistry.destination_asia;
  }
  
  if (
    lower.includes("faturamento") || 
    lower.includes("relatório") || 
    lower.includes("estratégia") || 
    lower.includes("gestão") ||
    lower.includes("lucro")
  ) {
    return PersonasRegistry.manager;
  }
  
  return PersonasRegistry.backoffice;
}
