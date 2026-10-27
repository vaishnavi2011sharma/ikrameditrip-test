import { createFileRoute, Link } from "@tanstack/react-router";
import { DoctorCard, HospitalCard, PageHero } from "@/components/site/cards";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { searchSite } from "@/lib/data-fns";
import { str } from "@/lib/search";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: str(s.q), department: str(s.department), city: str(s.city) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({ results: await searchSite({ data: deps }) }),
  head: () => ({
    meta: [{ title: "Search doctors, hospitals & treatments | Ikra Meditrip" }, { name: "robots", content: "noindex, follow" }],
  }),
  component: Results,
});

function Results() {
  const { results: r } = Route.useLoaderData();
  const none = !r.doctors.rows.length && !r.hospitals.rows.length && !r.treatments.length;
  return (
    <>
      <PageHero title="Search results" intro="Doctors, hospitals and treatments matching your search." />
      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        {none ? <p className="text-muted-foreground">Nothing matched. Try fewer filters, or tell us what you need and we will find the right option.</p> : null}

        {r.treatments.length ? (
          <section>
            <h2 className="text-2xl font-semibold text-foreground">Treatments</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {r.treatments.map((t) => (
                <li key={t.slug}>
                  <Link to="/treatments/$slug" params={{ slug: t.slug }} className="block rounded-xl border border-border bg-card p-4 text-sm font-medium hover:border-primary">
                    {t.name}
                    {t.department_name ? <span className="block text-xs font-normal text-muted-foreground">{t.department_name}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {r.hospitals.rows.length ? (
          <section>
            <div className="flex items-end justify-between"><h2 className="text-2xl font-semibold text-foreground">Hospitals ({r.hospitals.total})</h2>
              <Link to="/hospitals" className="text-sm text-primary hover:underline">View all</Link></div>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{r.hospitals.rows.map((h) => <HospitalCard key={h.slug} h={h} />)}</div>
          </section>
        ) : null}

        {r.doctors.rows.length ? (
          <section>
            <div className="flex items-end justify-between"><h2 className="text-2xl font-semibold text-foreground">Doctors ({r.doctors.total})</h2>
              <Link to="/doctors" className="text-sm text-primary hover:underline">View all</Link></div>
            <div className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">{r.doctors.rows.map((d) => <DoctorCard key={d.slug} d={d} />)}</div>
          </section>
        ) : null}

        <div className="mx-auto max-w-3xl"><AppointmentForm type="cost_enquiry" title="Not finding what you need?" /></div>
      </div>
    </>
  );
}
