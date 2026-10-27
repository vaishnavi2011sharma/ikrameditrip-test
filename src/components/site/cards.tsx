import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Award, Briefcase, Building2, ChevronRight, MapPin, MessageCircle } from "lucide-react";
import hospitalPlaceholder from "@/assets/hospital-generic.jpg";
import { site } from "@/data/site";
import type { DoctorCardData, HospitalCardData } from "@/lib/types";

export function PageHero({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="gradient-soft">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-primary">Home</Link>
        </li>
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5">
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            {it.to ? (
              <a href={it.to} className="hover:text-primary">{it.label}</a>
            ) : (
              <span aria-current="page" className="text-foreground">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function initials(name: string) {
  return name.replace(/^dr\.?\s*/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function DoctorPhoto({ name, src, alt, className = "" }: { name: string; src: string | null; alt?: string | null; className?: string }) {
  if (!src)
    return (
      <div role="img" aria-label={`${name} (photo to be supplied)`} className={`flex items-center justify-center bg-accent text-2xl font-semibold text-primary ${className}`}>
        {initials(name)}
      </div>
    );
  return <img src={src} alt={alt || name} loading="lazy" className={`bg-accent object-cover ${className}`} />;
}

/** Client-supplied photo if present; otherwise the bundled placeholder, clearly labelled. */
export function HospitalPhoto({ h, className = "" }: { h: Pick<HospitalCardData, "name" | "city" | "image_url" | "image_alt" | "is_placeholder_image">; className?: string }) {
  const real = !!h.image_url && !h.is_placeholder_image;
  return (
    <div className="relative">
      <img
        src={real ? h.image_url! : hospitalPlaceholder}
        alt={h.image_alt || `${h.name}, ${h.city}`}
        width={1024}
        height={768}
        loading="lazy"
        onError={(e) => {
          // a missing file falls back to the labelled placeholder (never to another hospital's picture)
          const img = e.currentTarget;
          if (img.src !== new URL(hospitalPlaceholder, window.location.href).href) img.src = hospitalPlaceholder;
        }}
        className={`object-cover ${className}`}
      />
      {!real ? (
        <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Representative image
        </span>
      ) : null}
    </div>
  );
}

export function DoctorCard({ d, showSummary = false, showAction = false }: { showSummary?: boolean; showAction?: boolean; d: Pick<DoctorCardData, "slug" | "name" | "designation" | "image_url" | "image_alt" | "city" | "summary"> & { hospitals?: DoctorCardData["hospitals"]; departments?: DoctorCardData["departments"] } }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link to="/doctors/$slug" params={{ slug: d.slug }} className="block flex-1">
        <DoctorPhoto name={d.name} src={d.image_url} alt={d.image_alt} className="aspect-4/5 w-full" />
        <div className="p-4">
          <h2 className="text-sm font-semibold text-foreground">{d.name}</h2>
          {d.departments?.length ? (
            <p className="mt-1 text-xs font-medium text-primary">{d.departments.map((x) => x.name).join(", ")}</p>
          ) : null}
          {d.designation ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d.designation}</p> : null}
          {showSummary && d.summary ? (
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{d.summary}</p>
          ) : null}
          {d.hospitals?.[0] ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-secondary" />
              {d.hospitals[0].name}, {d.hospitals[0].city}
            </p>
          ) : d.city ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-secondary" />
              {d.city}
            </p>
          ) : null}
        </div>
      </Link>
      {showAction ? (
        <div className="p-4 pt-0">
          <Link
            to="/doctors/$slug"
            params={{ slug: d.slug }}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg gradient-brand px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-card transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See details &amp; book
          </Link>
        </div>
      ) : null}
    </article>
  );
}

/** WhatsApp click-to-chat for one doctor. The number comes from site.whatsappHref (the client's "Phone / WhatsApp" number). */
export function doctorWhatsappHref(name: string) {
  const text = `Hello Ikra Meditrip, I would like to enquire about an appointment with ${name}.`;
  return `${site.whatsappHref}${site.whatsappHref.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
}

const BIO_PREVIEW_CHARS = 230;
const plainBio = (t: string) => t.replace(/^#{1,3} /gm, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

/**
 * Doctors directory card: photo left, details centre, Book Appointment + WhatsApp right, divider, then the
 * biography clamped to a preview with a working Show more / Show less control. Stacks on phones.
 * Only real data is shown: no verified badge or ratings exist in the data, so none are rendered.
 */
export function DoctorListCard({ d }: { d: DoctorCardData }) {
  const [open, setOpen] = useState(false);
  const bioId = useId();
  const bio = (d.body || d.summary || "").trim();
  const plain = plainBio(bio);
  const long = plain.length > BIO_PREVIEW_CHARS;
  const hosp = d.hospitals?.[0];
  const where = hosp ? `${hosp.city}, ${hosp.country}` : d.city || null;
  const speciality = d.departments?.[0]?.name;
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Link to="/doctors/$slug" params={{ slug: d.slug }} className="mx-auto block w-40 shrink-0 sm:mx-0 sm:w-36" aria-label={`${d.name} profile`}>
          <DoctorPhoto name={d.name} src={d.image_url} alt={d.image_alt} className="aspect-4/5 w-full rounded-xl" />
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-primary">
            <Link to="/doctors/$slug" params={{ slug: d.slug }} className="hover:underline">{d.name}</Link>
          </h2>
          {speciality ? (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {d.departments.slice(0, 2).map((x) => (
                <span key={x.slug} className="rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">{x.name}</span>
              ))}
            </p>
          ) : null}
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {where ? <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{where}</li> : null}
            {d.experience_years ? <li className="flex items-start gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0" />{d.experience_years}+ years of experience</li> : null}
            {d.designation ? <li className="flex items-start gap-2"><Award className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{d.designation}</span></li> : null}
            {hosp ? (
              <li className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">Works at{" "}
                  <Link to="/hospitals/$slug" params={{ slug: hosp.slug }} className="font-medium text-primary hover:underline">{hosp.name}, {hosp.city}</Link>
                </span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-48">
          <Link
            to="/doctors/$slug" params={{ slug: d.slug }} hash="enquire"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white shadow-card transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Book Appointment
          </Link>
          <a
            href={doctorWhatsappHref(d.name)} target="_blank" rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-bold text-white shadow-card transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp Us
          </a>
        </div>
      </div>

      {bio ? (
        <div className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          {open ? <div id={bioId}><TextBlock text={bio} /></div> : <p id={bioId} className={long ? "line-clamp-3" : ""}>{plain}</p>}
          {long ? (
            <button
              type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={bioId}
              className="mt-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {open ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Compact hospital card for the homepage slider: photo, name, city and a KNOW MORE button - no description. */
export function HomeHospitalCard({ h }: { h: HospitalCardData }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link to="/hospitals/$slug" params={{ slug: h.slug }} className="block flex-1" aria-label={`${h.name}, ${h.city}`}>
        <HospitalPhoto h={h} className="h-48 w-full" />
        <div className="p-5">
          <h3 className="text-base font-semibold text-foreground">{h.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-secondary" />
            {h.city}, {h.country}
          </p>
        </div>
      </Link>
      <div className="p-5 pt-0">
        <Link
          to="/hospitals/$slug"
          params={{ slug: h.slug }}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg gradient-brand px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-card transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Know more
        </Link>
      </div>
    </article>
  );
}

export function HospitalCard({ h }: { h: HospitalCardData }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link to="/hospitals/$slug" params={{ slug: h.slug }} className="block">
        <HospitalPhoto h={h} className="h-44 w-full" />
        <div className="p-5">
          <h2 className="text-base font-semibold text-foreground">{h.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-secondary" />
            {h.city}, {h.country}
          </p>
          {h.summary ? <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{h.summary}</p> : null}
        </div>
      </Link>
    </article>
  );
}

/** Shared select used by the doctor / hospital filter bars. */
export function FilterSelect({ label, value, onChange, options, allLabel }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; allLabel: string;
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-md border border-border px-4 py-2 disabled:opacity-40">
        Previous
      </button>
      <span className="text-muted-foreground">Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-md border border-border px-4 py-2 disabled:opacity-40">
        Next
      </button>
    </nav>
  );
}

/** Inline [text](url) links. Only site-relative paths ("/…") and http(s) URLs become links; anything else stays text. */
function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[3]) parts.push(<strong key={m.index} className="font-semibold text-foreground">{m[3]}</strong>);
    else {
      const href = m[2]!;
      if (/^\/(?!\/)/.test(href)) parts.push(<a key={m.index} href={href} className="font-medium text-primary underline-offset-2 hover:underline">{m[1]}</a>);
      else if (/^https?:\/\//i.test(href)) parts.push(<a key={m.index} href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline-offset-2 hover:underline">{m[1]}</a>);
      else parts.push(m[1]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Renders stored text safely (no HTML): "## heading", "- bullets", "1. numbered", [links](/path), **bold**, paragraphs. */
export function TextBlock({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div className="space-y-4 text-muted-foreground">
      {text.split(/\n{2,}/).map((para, i) => {
        const lines = para.split("\n");
        if (para.startsWith("## ")) return <h2 key={i} className="pt-4 text-2xl font-semibold text-foreground">{para.slice(3)}</h2>;
        if (lines.every((l) => /^- /.test(l)))
          return <ul key={i} className="list-disc space-y-2 pl-6 leading-relaxed marker:text-primary">{lines.map((l, k) => <li key={k}><Inline text={l.slice(2)} /></li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l)))
          return <ol key={i} className="list-decimal space-y-2 pl-6 leading-relaxed marker:font-semibold marker:text-primary">{lines.map((l, k) => <li key={k}><Inline text={l.replace(/^\d+\. /, "")} /></li>)}</ol>;
        return <p key={i} className="whitespace-pre-line leading-relaxed"><Inline text={para} /></p>;
      })}
    </div>
  );
}
