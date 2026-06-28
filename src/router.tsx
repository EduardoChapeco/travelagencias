import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000, // 15s de dados quentes. Transições de abas carregam o cache instantaneamente sem loading visível.
        refetchOnWindowFocus: false, // Menos requests redundantes ao alternar janelas
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Pré-carrega JS e loaders no hover dos links
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
