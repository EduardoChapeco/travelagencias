import React from "react";
import { type Proposal } from "@/services/proposals";
import TemplateEditorialFlat from "./TemplateEditorialFlat";
import TemplateExecutivo from "./TemplateExecutivo";
import TemplateDarkPremium from "./TemplateDarkPremium";
import TemplateLandscape from "./TemplateLandscape";
import TemplateVoucher from "./TemplateVoucher";
import TemplateGroupCatalog from "./TemplateGroupCatalog";

export type ProposalTemplateId =
  | "editorial-flat"
  | "executivo-b2b"
  | "dark-premium"
  | "landscape-presentation"
  | "voucher-pre"
  | "group-catalog";

export interface TemplateDefinition {
  id: ProposalTemplateId;
  label: string;
  description: string;
  formats: string[];         // which canvas formats this template supports
  previewBg: string;         // bg color for thumbnail
}

export const PROPOSAL_TEMPLATES: TemplateDefinition[] = [
  {
    id: "editorial-flat",
    label: "Editorial Premium",
    description: "Capa full-bleed, seções de voos, hotéis, roteiro e financeiro",
    formats: ["a4-portrait"],
    previewBg: "#f1f5f9",
  },
  {
    id: "executivo-b2b",
    label: "Executivo B2B",
    description: "Clean, corporativo, focado em tabelas limpas — ideal para empresas",
    formats: ["a4-portrait"],
    previewBg: "#ffffff",
  },
  {
    id: "dark-premium",
    label: "Dark Premium",
    description: "Fundo escuro dramático, estilo oficial e exclusivo",
    formats: ["a4-portrait"],
    previewBg: "#0f172a",
  },
  {
    id: "landscape-presentation",
    label: "Apresentação Guiada",
    description: "Formato paisagem focado em fotos, ideal para apresentações ao vivo e reuniões",
    formats: ["a4-landscape", "presentation-169"],
    previewBg: "#1e293b",
  },
  {
    id: "voucher-pre",
    label: "Voucher Pré-embarque",
    description: "Ticket e Voucher sem preços para entregar ao cliente antes da viagem.",
    formats: ["a4-portrait"],
    previewBg: "#f8fafc",
  },
  {
    id: "group-catalog",
    label: "Catálogo de Grupo",
    description: "Ideal para excursões rodoviárias, focado em chamadas de venda e fotos.",
    formats: ["a4-portrait"],
    previewBg: "#fef2f2",
  },
];

export function getProposalTemplate(templateId: string): React.ComponentType<{ proposal: Proposal; agency: any }> {
  switch (templateId) {
    case "editorial-flat":
      return TemplateEditorialFlat;
    case "executivo-b2b":
      return TemplateExecutivo;
    case "dark-premium":
      return TemplateDarkPremium;
    case "landscape-presentation":
      return TemplateLandscape;
    case "voucher-pre":
      return TemplateVoucher;
    case "group-catalog":
      return TemplateGroupCatalog;
    default:
      return TemplateEditorialFlat;
  }
}
