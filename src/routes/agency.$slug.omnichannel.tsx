import { createFileRoute, redirect } from "@tanstack/react-router";

// O módulo Omnichannel foi unificado na Inbox centralizada.
// Esta rota redireciona para /inbox para manter compatibilidade com links antigos.
export const Route = createFileRoute("/agency/$slug/omnichannel")({
  head: () => ({ meta: [{ title: "Omnichannel · TravelOS" }] }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/agency/$slug/inbox",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
