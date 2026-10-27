import { createFileRoute, Link } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { PageHero } from "@/components/site/cards";
import { getDepartments, getTreatments } from "@/lib/data-fns";
import { canonical } from "@/lib/search";

export const Route = createFileRoute("/treatment-cost")({
  loader: async () => {
    const [treatments, departments] = await Promise.all([getTreatments(), getDepartments()]);
    return { treatments, departments };
  },
  head: () => ({
    meta: [
      { title: "Know Your Surgery & Treatment Cost in India | Ikra Meditrip" },
      {
        name: "description",
        content:
          "Request a written, itemised treatment cost estimate from accredited Indian hospitals. Share your reports and hear back within 24 hours.",
      },
      { property: "og:title", content: "Know Your Treatment Cost | Ikra Meditrip" },
    ],
    links: [{ rel: "canonical", href: canonical("/treatment-cost") }],
  }),
  component: TreatmentCost,
});

function TreatmentCost() {
  const { treatments, departments } = Route.useLoaderData();
  // same speciality list and order as the Doctors page filter; treatments are listed under their own department only
  const groups = departments.map((x) => ({ x, items: treatments.filter((t) => t.department_slug === x.slug) }));
  const unassigned = treatments.filter((t) => !t.department_slug || !departments.some((x) => x.slug === t.department_slug));
  return (
    <>
      <PageHero
        title="Know your surgery & treatment cost"
        intro="Costs depend on your diagnosis, the hospital, the doctor and your length of stay. Share your reports and we will send an itemised written estimate - usually within 24 hours."
      />
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-2xl font-semibold text-foreground">Browse by speciality</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The same specialities as our Doctors page. Select a treatment to request its cost estimate, or open a speciality to meet its doctors.
          We do not publish fixed prices - every estimate is written for your diagnosis and hospital.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ x, items }) => (
            <article key={x.slug} id={x.slug} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-base font-semibold text-foreground">
                <Link to="/services/$slug" params={{ slug: x.slug }} className="hover:text-primary">{x.name}</Link>
              </h3>
              {items.length ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {items.map((t) => (
                    <li key={t.slug} className="flex items-center justify-between gap-2">
                      <Link to="/treatments/$slug" params={{ slug: t.slug }} className="text-primary hover:underline">{t.name}</Link>
                      <Link to="/treatments/$slug" params={{ slug: t.slug }} hash="enquire" className="shrink-0 text-xs text-muted-foreground hover:text-primary">Enquire</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Treatment pages for this speciality are being added.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs font-medium">
                {x.doctor_count > 0 ? (
                  <Link to="/doctors" search={{ department: x.slug }} className="text-primary hover:underline">View {x.doctor_count} doctor{x.doctor_count === 1 ? "" : "s"}</Link>
                ) : null}
                <Link to="/services/$slug" params={{ slug: x.slug }} hash="enquire" className="text-primary hover:underline">Know your cost</Link>
              </div>
            </article>
          ))}
        </div>
        {unassigned.length ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-foreground">Other treatments</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {unassigned.map((t) => (
                <li key={t.slug}><Link to="/treatments/$slug" params={{ slug: t.slug }} className="text-primary hover:underline">{t.name}</Link></li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <section id="cost-enquiry" className="mx-auto max-w-3xl scroll-mt-28 px-4 py-14">
        <AppointmentForm
          type="cost_enquiry"
          title="Know your surgery / treatment cost"
          subtitle="Tell us what you need. No obligation."
          submitLabel="Know your cost"
        />
      </section>
    </>
  );
}
