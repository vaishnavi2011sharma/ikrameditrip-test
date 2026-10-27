import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { Breadcrumbs, TextBlock } from "@/components/site/cards";
import { getPost } from "@/lib/data-fns";
import { canonical, jsonLdScript } from "@/lib/search";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    const post = await getPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return {};
    const title = p.seo_title || `${p.title} | Ikra Meditrip`;
    const desc = p.seo_description || p.excerpt || p.title;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 200) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p.cover_image_url ? [{ property: "og:image", content: p.cover_image_url }] : []),
      ],
      links: [{ rel: "canonical", href: canonical(`/blog/${p.slug}`) }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          ...(p.published_at ? { datePublished: p.published_at } : {}),
          ...(p.author ? { author: { "@type": "Person", name: p.author } } : {}),
          ...(p.cover_image_url ? { image: p.cover_image_url } : {}),
          description: desc,
          mainEntityOfPage: canonical(`/blog/${p.slug}`),
          publisher: { "@type": "Organization", name: "Ikra Meditrip" },
        }),
      ],
    };
  },
  component: Post,
});

function Post() {
  const { post: p } = Route.useLoaderData();
  return (
    <>
      <Breadcrumbs items={[{ label: "Blog", to: "/blog" }, { label: p.title }]} />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[p.author, p.published_at?.slice(0, 10)].filter(Boolean).join(" · ")}
        </p>
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.cover_image_alt || p.title} width={800} height={450} fetchPriority="high" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
        ) : null}
        <div className="mt-8">
          <TextBlock text={p.body} />
        </div>
      </article>
      {p.related.length ? (
        <section className="mx-auto max-w-5xl px-4 pb-14" aria-labelledby="keep-reading">
          <h2 id="keep-reading" className="text-2xl font-semibold tracking-tight text-foreground">Keep reading</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {p.related.map((r) => (
              <Link key={r.slug} to="/blog/$slug" params={{ slug: r.slug }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-lift">
                {r.cover_image_url ? <img src={r.cover_image_url} alt={r.cover_image_alt || r.title} loading="lazy" className="h-40 w-full object-cover" /> : null}
                <div className="p-5">
                  <h3 className="font-semibold text-foreground">{r.title}</h3>
                  {r.excerpt ? <p className="mt-2 text-sm text-muted-foreground">{r.excerpt}</p> : null}
                  <span className="mt-3 inline-block text-sm font-medium text-primary">Read article →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <AppointmentForm type="cost_enquiry" title="Know your treatment cost" />
      </section>
    </>
  );
}
