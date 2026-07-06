import { createFileRoute, redirect } from "@tanstack/react-router";

// O módulo Omnichannel foi unificado na Inbox centralizada.
// Esta rota redireciona para /inbox para manter compatibilidade com links antigos.
export const Route = createFileRoute("/agency/$slug/omnichannel")({
  head: ({ context }: any) => ({ meta: [{ title: `Omnichannel · ${context?.brand?.platform_name || 'Turis'}` }] }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/agency/$slug/inbox",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
