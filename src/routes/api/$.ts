import { createFileRoute } from "@tanstack/react-router";

/**
 * Mounts the framework-independent API (src/backend/api/handler.ts) under /api/*.
 * Public read API, lead capture and the admin API all go through it.
 */
async function run({ request }: { request: Request }): Promise<Response> {
  const { handleApi } = await import("@/backend/api/handler");
  return (await handleApi(request)) ?? new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: run,
      POST: run,
      PATCH: run,
      DELETE: run,
    },
  },
});
