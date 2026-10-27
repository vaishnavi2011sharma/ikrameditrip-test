import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ getDb }, { buildSitemap }] = await Promise.all([
          import("@/backend/db/client"),
          import("@/backend/lib/seo"),
        ]);
        return new Response(buildSitemap(getDb()), {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
