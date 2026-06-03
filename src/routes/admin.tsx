import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/shell/AdminShell";

export const Route = createFileRoute("/admin")({ component: AdminShell });
