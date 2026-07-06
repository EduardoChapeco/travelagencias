import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/group-tours/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Excursão · ${context?.brand?.platform_name || 'Turis'}` }] }),
});
