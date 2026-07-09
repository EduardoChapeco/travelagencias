import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agency/proposals/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/agency/proposals/"!</div>
}
