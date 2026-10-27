import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { Breadcrumbs, DoctorCard, HospitalPhoto, TextBlock } from "@/components/site/cards";
import { getHospital } from "@/lib/data-fns";
import { canonical, jsonLdScript } from "@/lib/search";

export const Route = createFileRoute("/hospitals_/$slug")({
  loader: async ({ params }) => {
    const hospital = await getHospital({ data: { slug: params.slug } });
    if (!hospital) throw notFound();
    return { hospital };
  },
  head: ({ loaderData }) => {
    const h = loaderData?.hospital;
    if (!h) return {};
    const title = h.seo_title || `${h.name}, ${h.city} | Doctors, Treatments & Cost | Ikra Meditrip`;
    const desc =
      h.seo_description ||
      h.summary ||
      `${h.name} in ${h.city}, ${h.country}. Speak to Ikra Meditrip for doctors, treatment plans and cost estimates.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 200) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
        ...(h.image_url && !h.is_placeholder_image ? [{ property: "og:image", content: h.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: canonical(`/hospitals/${h.slug}`) }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Hospital",
          name: h.name,
          url: canonical(`/hospitals/${h.slug}`),
          address: {
            "@type": "PostalAddress",
            addressLocality: h.city,
            addressCountry: h.country,
            ...(h.address ? { streetAddress: h.address } : {}),
          },
        }),
      ],
    };
  },
  component: HospitalPage,
});

function HospitalPage() {
  const { hospital: h } = Route.useLoaderData();
  return (
    <>
      <Breadcrumbs items={[{ label: "Hospitals", to: "/hospitals" }, { label: h.name }]} />
      <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-10 lg:grid-cols-2">
        <HospitalPhoto h={h} className="w-full rounded-2xl shadow-card" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{h.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-secondary" />
            {[h.address, h.city, h.state, h.country].filter(Boolean).join(", ")}
          </p>
          {h.accreditations ? <p className="mt-2 text-sm text-muted-foreground">Accreditations: {h.accreditations}</p> : null}
          <a href="#enquire" className="mt-5 inline-flex h-11 items-center rounded-md gradient-brand px-6 text-sm font-semibold text-primary-foreground">Enquire now</a>
          <div className="mt-6">
            <TextBlock text={h.body || h.summary} />
          </div>
          {h.departments.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Specialities</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {h.departments.map((x) => (
                  <Link key={x.slug} to="/services/$slug" params={{ slug: x.slug }}
                    className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:underline">
                    {x.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {h.treatments.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Treatments</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {h.treatments.map((t) => (
                  <li key={t.slug}>
                    <Link to="/treatments/$slug" params={{ slug: t.slug }} className="text-primary hover:underline">{t.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {h.doctors.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Doctors at {h.name}</h2>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {h.doctors.map((d) => (
              <DoctorCard key={d.slug} d={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-20">
        <AppointmentForm
          title={`Enquire about ${h.name}`}
          subtitle="Share your reports for a doctor recommendation and cost estimate at this hospital."
          type="cost_enquiry"
          hospitalSlug={h.slug}
        />
      </section>
    </>
  );
}
