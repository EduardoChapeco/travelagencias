import { supabase } from "@/integrations/supabase/client";

export type PolicyDoc = {
  id?: string;
  kind: string;
  title: string;
  slug: string;
  content_md: string;
  version: string;
  is_published: boolean;
  effective_at: string | null;
};

const META_MAP: Record<string, { title: string; slug: string }> = {
  privacy: { title: "Política de Privacidade", slug: "privacidade" },
  terms: { title: "Termos de Uso", slug: "termos" },
  dpa: { title: "DPA — Acordo de Processamento", slug: "dpa" },
  cookies: { title: "Política de Cookies", slug: "cookies" },
  lgpd: { title: "Termos LGPD", slug: "lgpd" },
};

const DEFAULT_DOCS: PolicyDoc[] = [
  {
    kind: "privacy",
    title: "Política de Privacidade",
    slug: "privacidade",
    version: "1.0.0",
    is_published: false,
    effective_at: null,
    content_md: `# Política de Privacidade\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\n## 1. Dados coletados\n\nColetamos os seguintes dados pessoais no uso da plataforma Turis:\n\n- Nome completo e e-mail ao criar conta\n- Dados de viagem e passageiros fornecidos pela agência\n- Dados de navegação e uso da plataforma (logs técnicos)\n\n## 2. Finalidade do tratamento\n\nOs dados são usados exclusivamente para:\n\n- Prestação dos serviços contratados\n- Comunicação de suporte e atualizações\n- Melhoria contínua da plataforma\n\n## 3. Compartilhamento\n\nNão vendemos nem compartilhamos dados com terceiros, except quando necessário para a operação do serviço (ex.: processadores de pagamento e servidores de hospedagem).\n\n## 4. Direitos do titular\n\nVocê pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pelo e-mail: dpo@turis.com.br\n\n## 5. Retenção\n\nDados são retidos pelo período necessário para a prestação do serviço e obrigações legais.\n\n## 6. Contato DPO\n\nNome: Encarregado de Dados Turis  \nE-mail: dpo@turis.com.br\n`,
  },
  {
    kind: "terms",
    title: "Termos de Uso",
    slug: "termos",
    version: "1.0.0",
    is_published: false,
    effective_at: null,
    content_md: `# Termos de Uso\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\n## 1. Aceitação\n\nAo usar o Turis, você concorda com estes Termos. Caso discorde, não utilize a plataforma.\n\n## 2. Serviço\n\nO Turis é uma plataforma SaaS para gestão de agências de viagens, fornecida mediante assinatura mensal ou anual.\n\n## 3. Obrigações do usuário\n\n- Usar a plataforma de acordo com as leis vigentes\n- Não compartilhar credenciais de acesso\n- Fornecer dados verídicos no cadastro\n- Zelar pelos dados de seus clientes e passageiros\n\n## 4. Propriedade intelectual\n\nTodo o código, marca e conteúdo do Turis pertencem à empresa desenvolvedora.\n\n## 5. Limitação de responsabilidade\n\nA plataforma é fornecida "como está". Não nos responsabilizamos por perdas indiretas decorrentes do uso.\n\n## 6. Rescisão\n\nPodemos suspender contas que violem estes termos sem aviso prévio.\n\n## 7. Foro\n\nFica eleito o foro da comarca de Chapecó/SC para dirimir controvérsias.\n`,
  },
  {
    kind: "dpa",
    title: "DPA — Acordo de Processamento de Dados",
    slug: "dpa",
    version: "1.0.0",
    is_published: false,
    effective_at: null,
    content_md: `# Data Processing Agreement (DPA)\n\n**Última atualização:** ${new Date().toLocaleDateString("pt-BR")}\n\nEste acordo regula o processamento de dados pessoais entre o Turis (Processador) e as agências cadastradas (Controladoras), em conformidade com a LGPD (Lei nº 13.709/2018).\n\n## 1. Definições\n\n- **Controlador:** A agência de viagens que coleta e determina o uso dos dados.\n- **Processador:** Turis, que processa dados em nome do Controlador.\n\n## 2. Obrigações do Processador\n\n- Processar dados apenas conforme instruções documentadas do Controlador\n- Implementar medidas técnicas e organizacionais adequadas de segurança\n- Notificar o Controlador em caso de incidente de segurança em até 48h\n\n## 3. Subprocessadores\n\nO Turis utiliza os seguintes subprocessadores aprovados:\n- Supabase (banco de dados e autenticação) — EUA / conformidade SOC 2\n- Netlify/Vercel (hospedagem) — EUA\n\n## 4. Transferência internacional\n\nDados podem ser processados em servidores fora do Brasil por subprocessadores com garantias adequadas (SCCs, adequação).\n\n## 5. Direitos dos titulares\n\nO Processador apoia o Controlador no atendimento a solicitações dos titulares de dados.\n\n## 6. Vigência\n\nEste DPA tem a mesma vigência do contrato de assinatura da plataforma.\n`,
  },
];

export { DEFAULT_DOCS, META_MAP };

export async function fetchPolicies(): Promise<PolicyDoc[]> {
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const latestMap = new Map<string, any>();
  for (const row of data || []) {
    if (!latestMap.has(row.kind)) latestMap.set(row.kind, row);
  }

  return DEFAULT_DOCS.map((def) => {
    const dbDoc = latestMap.get(def.kind);
    if (dbDoc) {
      return {
        id: dbDoc.id,
        kind: dbDoc.kind,
        title: META_MAP[dbDoc.kind]?.title || def.title,
        slug: META_MAP[dbDoc.kind]?.slug || def.slug,
        version: dbDoc.version,
        content_md: dbDoc.content_md,
        is_published: dbDoc.is_published ?? false,
        effective_at: dbDoc.effective_at,
      };
    }
    return def;
  });
}

export async function savePolicyDraft(doc: PolicyDoc): Promise<void> {
  if (doc.id) {
    const { error } = await supabase
      .from("policy_documents")
      .update({ version: doc.version, content_md: doc.content_md })
      .eq("id", doc.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("policy_documents").insert({
      kind: doc.kind,
      version: doc.version,
      content_md: doc.content_md,
      is_published: false,
    });
    if (error) throw new Error(error.message);
  }
}

export async function savePolicyNewVersion(doc: PolicyDoc, newVersion: string): Promise<void> {
  const { error } = await supabase.from("policy_documents").insert({
    kind: doc.kind,
    version: newVersion,
    content_md: doc.content_md,
    is_published: false,
  });
  if (error) throw new Error(error.message);
}

export async function publishPolicy(id: string): Promise<void> {
  const { error } = await supabase
    .from("policy_documents")
    .update({ is_published: true, effective_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function unpublishPolicy(id: string): Promise<void> {
  const { error } = await supabase
    .from("policy_documents")
    .update({ is_published: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
