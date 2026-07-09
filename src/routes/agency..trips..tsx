import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agency/trips/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/agency/trips/"!</div>
}
