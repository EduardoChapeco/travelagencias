import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agency/quotes/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/agency/quotes/"!</div>
}
