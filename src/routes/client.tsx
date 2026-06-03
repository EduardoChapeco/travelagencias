import { createFileRoute } from "@tanstack/react-router";
import { ClientShell } from "@/components/shell/ClientShell";

export const Route = createFileRoute("/client")({ component: ClientShell });
