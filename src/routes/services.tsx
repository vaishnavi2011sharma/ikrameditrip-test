import { createFileRoute, Link } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { DeptIcon } from "@/components/site/DeptIcon";
import { PageHero } from "@/components/site/cards";
import { getDepartments, getTreatments } from "@/lib/data-fns";
import { canonical } from "@/lib/search";

export const Route = createFileRoute("/services")({
  loader: async () => {
    const [departments, treatments] = await Promise.all([getDepartments(), getTreatments()]);
    return { departments, treatments };
  },
  head: () => ({
    meta: [
      { title: "Medical Services & Specialities in India | Ikra Meditrip" },
      {
        name: "description",
        content:
          "Cardiology, orthopaedics, neurology, oncology, transplants, IVF and more. Compare doctors and hospitals across India with Ikra Meditrip.",
      },
      { property: "og:title", content: "Medical Services & Specialities | Ikra Meditrip" },
    ],
    links: [{ rel: "canonical", href: canonical("/services") }],
  }),
  component: Services,
});

function Services() {
  const { departments, treatments } = Route.useLoaderData();
  return (
    <>
      <PageHero
        title="Medical services & specialities"
        intro="From cardiac surgery and joint replacement to fertility and dental care - we connect you with India's best hospitals and specialists for every treatment."
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((s) => (
            <article key={s.slug} className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-lift">
              <Link to="/services/$slug" params={{ slug: s.slug }} className="block">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <DeptIcon name={s.icon} className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-base font-semibold text-foreground">{s.name}</h2>
                {s.summary ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary}</p> : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {s.doctor_count} doctors · {s.hospital_count} hospitals
                </p>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {treatments.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Surgeries & treatments</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {treatments.map((t) => (
              <li key={t.slug}>
                <Link to="/treatments/$slug" params={{ slug: t.slug }}
                  className="block rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary">
                  {t.name}
                  {t.department_name ? <span className="block text-xs font-normal text-muted-foreground">{t.department_name}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <AppointmentForm
          type="cost_enquiry"
          title="Get a treatment cost estimate"
          subtitle="Tell us the service you need and we will match you with the right hospital and doctor."
        />
      </section>
    </>
  );
}
