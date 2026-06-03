import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/portal/blog")({
  head: () => ({
    meta: [
      { title: "Blog · TravelOS" },
      { name: "description", content: "Posts do blog" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Blog" description="Posts do blog" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
