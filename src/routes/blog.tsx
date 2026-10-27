import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHero, Pager } from "@/components/site/cards";
import { getPosts } from "@/lib/data-fns";
import { canonical, posInt } from "@/lib/search";

export const Route = createFileRoute("/blog")({
  validateSearch: (s: Record<string, unknown>) => ({ page: posInt(s.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => ({ posts: await getPosts({ data: { page: deps.page } }) }),
  head: () => ({
    meta: [
      { title: "Medical Travel Blog | Ikra Meditrip" },
      { name: "description", content: "Guides and updates on medical treatment in India for international patients." },
      { property: "og:title", content: "Medical Travel Blog | Ikra Meditrip" },
    ],
    links: [{ rel: "canonical", href: canonical("/blog") }],
  }),
  component: Blog,
});

function Blog() {
  const { posts } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <>
      <PageHero title="Blog" intro="Guides and updates for patients planning treatment in India." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        {posts.rows.length === 0 ? (
          <p className="text-muted-foreground">Articles are coming soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.rows.map((p) => (
              <article key={p.slug} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="block">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.cover_image_alt || p.title} loading="lazy" className="h-44 w-full object-cover" />
                  ) : null}
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
                    {p.excerpt ? <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p> : null}
                    {p.published_at ? <p className="mt-3 text-xs text-muted-foreground">{p.published_at.slice(0, 10)}</p> : null}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
        <Pager page={posts.page} pageSize={posts.pageSize} total={posts.total} onPage={(page) => navigate({ search: { page } })} />
      </section>
    </>
  );
}
