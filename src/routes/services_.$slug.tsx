import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { Breadcrumbs, DoctorCard, HospitalPhoto, TextBlock } from "@/components/site/cards";
import { getDepartment } from "@/lib/data-fns";
import { canonical } from "@/lib/search";

export const Route = createFileRoute("/services_/$slug")({
  loader: async ({ params }) => {
    const department = await getDepartment({ data: { slug: params.slug } });
    if (!department) throw notFound();
    return { department };
  },
  head: ({ loaderData }) => {
    const x = loaderData?.department;
    if (!x) return {};
    const title = x.seo_title || `${x.name} Treatment in India - Doctors, Hospitals & Cost | Ikra Meditrip`;
    const desc = x.seo_description || x.summary || `${x.name} specialists and hospitals in India. Get a free treatment cost estimate from Ikra Meditrip.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 200) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
      ],
      links: [{ rel: "canonical", href: canonical(`/services/${x.slug}`) }],
    };
  },
  component: DepartmentPage,
});

function DepartmentPage() {
  const { department: x } = Route.useLoaderData();
  return (
    <>
      <Breadcrumbs items={[{ label: "Treatments", to: "/services" }, { label: x.name }]} />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{x.name}</h1>
        <div className="mt-4 max-w-3xl">
          <TextBlock text={x.body || x.summary} />
        </div>
      </section>

      {x.treatments.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Surgeries & treatments</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {x.treatments.map((t) => (
              <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-lift">
                <h3 className="font-semibold text-foreground">{t.name}</h3>
                {t.summary ? <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {x.hospitals.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Hospitals for {x.name}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {x.hospitals.map((h) => (
              <Link key={h.slug} to="/hospitals/$slug" params={{ slug: h.slug }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-lift">
                <HospitalPhoto h={{ ...h, is_placeholder_image: h.image_url ? 0 : 1 }} className="h-36 w-full" />
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground">{h.name}</h3>
                  <p className="text-xs text-muted-foreground">{h.city}, {h.country}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {x.doctors.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{x.name} doctors</h2>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {x.doctors.map((d) => (
              <DoctorCard key={d.slug} d={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-20">
        <AppointmentForm
          type="cost_enquiry"
          title={`Know your ${x.name} treatment cost`}
          subtitle="Send your reports and receive a written estimate from suitable hospitals."
          defaultTreatment={x.name}
        />
      </section>
    </>
  );
}
