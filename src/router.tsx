import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { toast } from "sonner";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any) => {
        toast.error(`Erro na requisição: ${error.message || "Erro desconhecido"}`);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: any) => {
        toast.error(`Erro na operação: ${error.message || "Erro desconhecido"}`);
      },
    }),
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
