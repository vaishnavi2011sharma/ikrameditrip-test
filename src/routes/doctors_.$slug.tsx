import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { MessageCircle } from "lucide-react";
import { Breadcrumbs, DoctorPhoto, TextBlock, doctorWhatsappHref } from "@/components/site/cards";
import { getDoctor } from "@/lib/data-fns";
import { canonical, jsonLdScript } from "@/lib/search";

export const Route = createFileRoute("/doctors_/$slug")({
  loader: async ({ params }) => {
    const doctor = await getDoctor({ data: { slug: params.slug } });
    if (!doctor) throw notFound();
    return { doctor };
  },
  head: ({ loaderData }) => {
    const d = loaderData?.doctor;
    if (!d) return {};
    const title = d.seo_title || `${d.name}${d.designation ? ` - ${d.designation}` : ""} | Ikra Meditrip`;
    const desc =
      d.seo_description ||
      d.summary ||
      `${d.name}${d.designation ? `, ${d.designation}` : ""}. Request an appointment through Ikra Meditrip.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 200) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
        ...(d.image_url ? [{ property: "og:image", content: d.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: canonical(`/doctors/${d.slug}`) }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Physician",
          name: d.name,
          url: canonical(`/doctors/${d.slug}`),
          ...(d.designation ? { description: d.designation } : {}),
          ...(d.image_url ? { image: d.image_url } : {}),
        }),
      ],
    };
  },
  component: DoctorPage,
});

function DoctorPage() {
  const { doctor: d } = Route.useLoaderData();
  return (
    <>
      <Breadcrumbs items={[{ label: "Doctors", to: "/doctors" }, { label: d.name }]} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[320px_1fr]">
        <DoctorPhoto name={d.name} src={d.image_url} alt={d.image_alt} className="aspect-4/5 w-full rounded-2xl shadow-card" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{d.name}</h1>
          {d.designation ? <p className="mt-2 text-lg text-muted-foreground">{d.designation}</p> : null}
          {d.city && !d.hospitals.length ? <p className="mt-1 text-sm text-muted-foreground">Location: {d.city}</p> : null}
          {d.qualifications ? <p className="mt-1 text-sm text-muted-foreground">{d.qualifications}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#enquire" className="inline-flex h-11 items-center rounded-md gradient-brand px-6 text-sm font-semibold text-primary-foreground">Book appointment</a>
            <a
              href={doctorWhatsappHref(d.name)} target="_blank" rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#25D366] px-6 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp Us
            </a>
          </div>
          {d.experience_years ? (
            <p className="mt-1 text-sm text-muted-foreground">{d.experience_years} years of experience</p>
          ) : null}

          {d.hospitals.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Practises at</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {d.hospitals.map((h) => (
                  <li key={h.slug}>
                    <Link to="/hospitals/$slug" params={{ slug: h.slug }} className="text-primary hover:underline">
                      {h.name}
                    </Link>{" "}
                    <span className="text-muted-foreground"> - {h.city}, {h.country}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {d.departments.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Speciality</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {d.departments.map((x) => (
                  <Link
                    key={x.slug}
                    to="/services/$slug"
                    params={{ slug: x.slug }}
                    className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:underline"
                  >
                    {x.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <TextBlock text={d.body || d.summary} />
          </div>

          {d.profile_card_url ? (
            <figure className="mt-8">
              <img src={d.profile_card_url} alt={`Profile card for ${d.name}`} loading="lazy" className="w-full max-w-md rounded-xl border border-border shadow-card" />
              <figcaption className="mt-2 text-xs text-muted-foreground">Profile card supplied by the hospital.</figcaption>
            </figure>
          ) : null}

          {d.treatments.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Treatments</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {d.treatments.map((t) => (
                  <li key={t.slug}>
                    <Link to="/treatments/$slug" params={{ slug: t.slug }} className="text-primary hover:underline">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-20">
        <AppointmentForm
          title={`Request an appointment with ${d.name}`}
          subtitle="Share your reports and a coordinator will confirm availability and a cost estimate."
          doctorSlug={d.slug}
          defaultTreatment={d.departments[0]?.name}
        />
      </section>
    </>
  );
}
