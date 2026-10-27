import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { Breadcrumbs, DoctorCard, TextBlock } from "@/components/site/cards";
import { getTreatment } from "@/lib/data-fns";
import { canonical } from "@/lib/search";

export const Route = createFileRoute("/treatments/$slug")({
  loader: async ({ params }) => {
    const treatment = await getTreatment({ data: { slug: params.slug } });
    if (!treatment) throw notFound();
    return { treatment };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.treatment;
    if (!t) return {};
    const title = t.seo_title || `${t.name} in India - Hospitals, Doctors & Cost | Ikra Meditrip`;
    const desc = t.seo_description || t.summary || `${t.name} in India: doctors, hospitals and a written cost estimate from Ikra Meditrip.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 200) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
      ],
      links: [{ rel: "canonical", href: canonical(`/treatments/${t.slug}`) }],
    };
  },
  component: TreatmentPage,
});

const money = (n: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

function TreatmentPage() {
  const { treatment: t } = Route.useLoaderData();
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Treatments", to: "/services" },
          ...(t.department ? [{ label: t.department.name, to: `/services/${t.department.slug}` }] : []),
          { label: t.name },
        ]}
      />
      <section className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t.name}</h1>
        {t.summary ? <p className="mt-3 text-lg text-muted-foreground">{t.summary}</p> : null}
          <a href="#enquire" className="mt-5 inline-flex h-11 items-center rounded-md gradient-brand px-6 text-sm font-semibold text-primary-foreground">Know your surgery cost</a>

        {/* Costs appear only when the client has verified them (enforced server-side). */}
        <div className="mt-8 rounded-2xl border border-border bg-accent/40 p-6">
          <h2 className="text-lg font-semibold text-foreground">Treatment cost</h2>
          {t.cost ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {money(t.cost.min, t.cost.currency)}
                {t.cost.max ? ` - ${money(t.cost.max, t.cost.currency)}` : "+"}
              </p>
              {t.cost.notes ? <p className="mt-2 text-sm text-muted-foreground">{t.cost.notes}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Indicative range{t.cost.verifiedOn ? `, verified ${t.cost.verifiedOn}` : ""}. Your final estimate
                depends on your reports, hospital, doctor and length of stay.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              The cost depends on your condition, hospital and doctor. Send your reports and we will
              give you a written estimate.
            </p>
          )}
        </div>

        {t.body ? (
          <div className="mt-8">
            <TextBlock text={t.body} />
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Detailed procedure information for {t.name} is being prepared with our medical team. Send your reports
            below and we will answer your questions personally.
          </p>
        )}

        {t.hospitals.length ? (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">{t.relatedVia === "department" ? `Partner hospitals in ${t.department?.name ?? "this speciality"}` : "Where this treatment is available"}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {t.hospitals.map((h) => (
                <li key={h.slug}>
                  <Link to="/hospitals/$slug" params={{ slug: h.slug }} className="text-primary hover:underline">{h.name}</Link>
                  <span className="text-muted-foreground"> - {h.city}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {t.doctors.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.relatedVia === "department" ? `${t.department?.name ?? "Related"} specialists` : "Specialists"}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {t.doctors.map((d) => (
              <DoctorCard key={d.slug} d={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-20">
        <AppointmentForm
          type="cost_enquiry"
          title={`Know your ${t.name} cost`}
          subtitle="Send your reports and receive a written estimate."
          treatmentSlug={t.slug}
          defaultTreatment={t.name}
          submitLabel="Know your surgery cost"
        />
      </section>
    </>
  );
}
