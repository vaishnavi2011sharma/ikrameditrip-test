import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/AdminApp";

export const Route = createFileRoute("/admin")({
  // Client-only: nothing about the admin UI is rendered on the server or indexed.
  ssr: false,
  head: () => ({ meta: [{ title: "Admin | Ikra Meditrip" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminApp,
});
