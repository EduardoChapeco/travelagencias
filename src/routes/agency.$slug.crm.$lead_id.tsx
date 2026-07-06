import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/crm/$lead_id")({
  head: ({ context }: any) => ({ meta: [{ title: `Detalhe do Lead · ${context?.brand?.platform_name || 'Turis'}` }] }),
});
