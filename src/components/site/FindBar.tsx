import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Facets } from "@/lib/types";

type Target = "doctors" | "hospitals";

const sel =
  "mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * "Find the right doctor / hospital" filter bar (Country · City · Speciality · Treatment · Hospital).
 * Submitting opens the existing /doctors or /hospitals list with the chosen filters in the URL, so the lists, paging and
 * back-button keep working exactly as before. Used on the homepage; the list pages carry the same filters in their own forms.
 */
export function FindBar({ facets, initial = "doctors" }: { facets: Facets; initial?: Target }) {
  const navigate = useNavigate();
  const [target, setTarget] = useState<Target>(initial);
  const [v, setV] = useState({ country: "", city: "", department: "", treatment: "", hospital: "" });
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val, ...(k === "country" ? { city: "" } : {}) }));
  const applied = Object.values(v).filter(Boolean).length;
  const cities = facets.cities.filter((c) => !v.country || c.country === v.country);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const f = {
      country: v.country || undefined, city: v.city || undefined,
      department: v.department || undefined, treatment: v.treatment || undefined,
    };
    if (target === "doctors") navigate({ to: "/doctors", search: { ...f, hospital: v.hospital || undefined } });
    else navigate({ to: "/hospitals", search: f });
  };

  const field = (label: string, key: keyof typeof v, all: string, options: { value: string; label: string }[]) => (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <select value={v[key]} onChange={(e) => set(key, e.target.value)} className={sel}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <section aria-label="Find a doctor or hospital" className="relative z-10 mx-auto -mt-4 max-w-6xl px-4">
      <form onSubmit={submit} role="search" className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-5 py-3 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            {target === "doctors" ? "Find the right doctor" : "Find the right hospital"}
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Search for" className="flex rounded-full bg-primary-foreground/15 p-0.5 text-xs font-semibold">
              {(["doctors", "hospitals"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={target === t} onClick={() => setTarget(t)}
                  className={`rounded-full px-3 py-1 capitalize ${target === t ? "bg-background text-primary" : "text-primary-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            {applied ? <span className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium">{applied} filter{applied > 1 ? "s" : ""} applied</span> : null}
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {field("Country", "country", "All countries", facets.countries.map((c) => ({ value: c.value, label: c.value })))}
          {field("City", "city", "All cities", cities.map((c) => ({ value: c.value, label: c.value })))}
          {field("Speciality", "department", "All specialities", facets.departments)}
          {field("Treatment", "treatment", "All treatments", facets.treatments)}
          {target === "doctors"
            ? field("Hospital", "hospital", "All hospitals", facets.hospitals.map((h) => ({ value: h.value, label: `${h.label} · ${h.city}` })))
            : <div className="hidden lg:block" aria-hidden />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
          <button type="button" onClick={() => setV({ country: "", city: "", department: "", treatment: "", hospital: "" })}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /> Clear filters
          </button>
          <Button type="submit" size="lg" className="gradient-brand text-primary-foreground">
            <Search className="mr-2 h-4 w-4" /> Search {target === "doctors" ? "doctors" : "hospitals"}
          </Button>
        </div>
      </form>
    </section>
  );
}
