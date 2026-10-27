import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { FilterSelect, HospitalCard, PageHero, Pager } from "@/components/site/cards";
import { getFacets, getHospitals } from "@/lib/data-fns";
import { canonical, validateListSearch } from "@/lib/search";

export const Route = createFileRoute("/hospitals")({
  validateSearch: validateListSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [list, facets] = await Promise.all([getHospitals({ data: { ...deps, pageSize: 30 } }), getFacets()]);
    return { list, facets };
  },
  head: () => ({
    meta: [
      { title: "Partner Hospitals in India | Ikra Meditrip" },
      {
        name: "description",
        content:
          "Apollo, Fortis Escorts, Artemis, Manipal, Amrita, Desun, Kauvery, Tx Hospitals and more - accredited multispeciality hospitals across India.",
      },
      { property: "og:title", content: "Partner Hospitals in India | Ikra Meditrip" },
      {
        property: "og:description",
        content: "Accredited multispeciality hospitals in Delhi, Chennai, Bangalore, Kolkata and Hyderabad.",
      },
    ],
    links: [{ rel: "canonical", href: canonical("/hospitals") }],
  }),
  component: Hospitals,
});

function Hospitals() {
  const { list, facets } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q ?? "");
  const set = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page }) });
  const cities = facets.cities.filter((c) => !search.country || c.country === search.country);

  return (
    <>
      <PageHero
        title="Our partnered hospitals"
        intro="NABH and internationally accredited multispeciality hospitals across India. We match your diagnosis and budget to the right institution."
      >
        <form
          role="search"
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() || undefined });
          }}
        >
          <label className="block text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
            Search
            <input
              type="search"
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hospital or city"
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <FilterSelect label="Country" allLabel="All countries" value={search.country ?? ""}
            onChange={(v) => set({ country: v || undefined, city: undefined })}
            options={facets.countries.map((c) => ({ value: c.value, label: `${c.value} (${c.count})` }))} />
          <FilterSelect label="City" allLabel="All cities" value={search.city ?? ""}
            onChange={(v) => set({ city: v || undefined })}
            options={cities.map((c) => ({ value: c.value, label: `${c.value} (${c.count})` }))} />
          <FilterSelect label="Speciality" allLabel="All specialities" value={search.department ?? ""}
            onChange={(v) => set({ department: v || undefined })}
            options={facets.departments.map((d) => ({ value: d.value, label: d.label }))} />
          <FilterSelect label="Treatment" allLabel="All treatments" value={search.treatment ?? ""}
            onChange={(v) => set({ treatment: v || undefined })}
            options={facets.treatments} />
        </form>
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {list.rows.length} of {list.total} hospitals
        </p>
        {list.rows.length === 0 ? (
          <p className="mt-8 text-muted-foreground">No hospitals match these filters.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.rows.map((h) => (
              <HospitalCard key={h.slug} h={h} />
            ))}
          </div>
        )}
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={(p) => set({ page: p })} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <AppointmentForm
          title="Not sure which hospital fits your case?"
          subtitle="Send your reports and we will shortlist hospitals with cost estimates."
        />
      </section>
    </>
  );
}
