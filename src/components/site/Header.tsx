import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Mail, Menu, MessageCircle, Phone, X } from "lucide-react";
import { site } from "@/data/site";
import { Button } from "@/components/ui/button";
import type { NavData } from "@/lib/types";

export type { NavData };

const link = "whitespace-nowrap text-sm font-medium text-foreground/80 transition-colors hover:text-primary [&.active]:text-primary";
const panel =
  "invisible absolute left-0 top-full z-50 min-w-64 translate-y-1 rounded-2xl border border-border bg-card p-2 opacity-0 shadow-lift transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100";
const MENU_LIMIT = 12; // submenu items shown before "View all"
const item = "block rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-accent-foreground";

export function Header({ nav }: { nav: NavData }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur">
      {/* utility bar */}
      <div className="hidden border-b border-border bg-primary text-primary-foreground sm:block">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 text-xs">
          <span className="opacity-90">{site.tagline} · Treatment in India for international patients</span>
          <span className="flex items-center gap-5">
            <a href={`mailto:${site.email}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="h-3.5 w-3.5" /> {site.email}
            </a>
            <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a href={`tel:${site.phoneHref}`} className="flex items-center gap-1.5 font-medium hover:underline">
              <Phone className="h-3.5 w-3.5" /> {site.phone}
            </a>
          </span>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-3" onClick={close}>
            <img src="/brand/ikra-logo-badge.webp" alt="Ikra Meditrip - Your Medical Advisor" width={172} height={172} fetchPriority="high" className="h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]" />
            <span className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight text-foreground">Ikra Meditrip</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{site.tagline}</span>
            </span>
          </Link>

          {/* desktop: multi-level menu */}
          <nav aria-label="Main" className="hidden min-w-0 items-center gap-6 xl:flex">
            <Link to="/" className={link}>Home</Link>
            <Link to="/about" className={link}>About</Link>

            <div className="group relative py-6">
              <Link to="/services" className={`${link} inline-flex items-center gap-1`}>
                Services <ChevronDown className="h-3.5 w-3.5" />
              </Link>
              <div className={`${panel} w-72`}>
                {nav.departments.slice(0, MENU_LIMIT).map((d) => (
                  <div key={d.slug} className="group/sub relative">
                    <Link to="/services/$slug" params={{ slug: d.slug }} className={`${item} flex items-center justify-between`}>
                      {d.name}
                      {d.treatments.length ? <ChevronDown className="-rotate-90 h-3.5 w-3.5 opacity-60" /> : null}
                    </Link>
                    {d.treatments.length ? (
                      <div className="invisible absolute left-full top-0 z-50 ml-1 w-72 rounded-2xl border border-border bg-card p-2 opacity-0 shadow-lift transition group-hover/sub:visible group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:opacity-100">
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Treatments</p>
                        {d.treatments.map((t) => (
                          <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }} className={item}>
                            {t.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                <Link to="/services" className={`${item} font-medium text-primary`}>View all services →</Link>
              </div>
            </div>

            <div className="group relative py-6">
              <Link to="/hospitals" className={`${link} inline-flex items-center gap-1`}>
                Hospitals <ChevronDown className="h-3.5 w-3.5" />
              </Link>
              <div className={`${panel} w-80 max-h-[calc(100vh-7rem)] overflow-y-auto`}>
                {nav.hospitals.map((h) => (
                  <Link key={h.slug} to="/hospitals/$slug" params={{ slug: h.slug }} className={item}>
                    {h.name} <span className="text-xs text-muted-foreground">· {h.city}</span>
                  </Link>
                ))}
                <Link to="/hospitals" className={`${item} font-medium text-primary`}>View all hospitals →</Link>
              </div>
            </div>

            <div className="group relative py-6">
              <Link to="/doctors" className={`${link} inline-flex items-center gap-1`}>
                Doctors <ChevronDown className="h-3.5 w-3.5" />
              </Link>
              <div className={`${panel} w-72 max-h-[calc(100vh-7rem)] overflow-y-auto`}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">By speciality</p>
                {nav.departments.slice(0, MENU_LIMIT).map((d) => (
                  <Link key={d.slug} to="/doctors" search={{ department: d.slug }} className={item}>
                    {d.name}
                  </Link>
                ))}
                <Link to="/doctors" className={`${item} font-medium text-primary`}>View all doctors →</Link>
              </div>
            </div>

            <Link to="/treatment-cost" className={link}>Treatment Cost</Link>
            <Link to="/blog" className={link}>Blog</Link>
            <Link to="/contact" className={link}>Contact</Link>
          </nav>

          <Button asChild className="hidden shrink-0 whitespace-nowrap gradient-brand text-primary-foreground xl:inline-flex">
            <Link to="/treatment-cost">Know your cost</Link>
          </Button>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile: accordion menu */}
      {open ? (
        <div className="max-h-[75vh] overflow-y-auto border-b border-border bg-background xl:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col px-4 py-3 text-sm font-medium">
            <Link to="/" onClick={close} className="py-2.5">Home</Link>
            <Link to="/about" onClick={close} className="py-2.5">About</Link>

            <details className="border-t border-border py-2.5">
              <summary className="cursor-pointer list-none py-1">Services & treatments</summary>
              <div className="mt-2 space-y-1 pl-3">
                {nav.departments.slice(0, MENU_LIMIT).map((d) => (
                  <details key={d.slug} className="py-1">
                    <summary className="cursor-pointer list-none py-1 font-normal">{d.name}</summary>
                    <div className="space-y-1 pl-3 pt-1 font-normal text-muted-foreground">
                      <Link to="/services/$slug" params={{ slug: d.slug }} onClick={close} className="block py-1 text-primary">Overview</Link>
                      {d.treatments.map((t) => (
                        <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }} onClick={close} className="block py-1">{t.name}</Link>
                      ))}
                    </div>
                  </details>
                ))}
                <Link to="/services" onClick={close} className="block py-1 font-normal text-primary">View all services</Link>
              </div>
            </details>

            <details className="border-t border-border py-2.5">
              <summary className="cursor-pointer list-none py-1">Hospitals</summary>
              <div className="mt-2 space-y-1 pl-3 font-normal text-muted-foreground">
                {nav.hospitals.map((h) => (
                  <Link key={h.slug} to="/hospitals/$slug" params={{ slug: h.slug }} onClick={close} className="block py-1">{h.name}</Link>
                ))}
                <Link to="/hospitals" onClick={close} className="block py-1 text-primary">View all hospitals</Link>
              </div>
            </details>

            <details className="border-t border-border py-2.5">
              <summary className="cursor-pointer list-none py-1">Doctors</summary>
              <div className="mt-2 space-y-1 pl-3 font-normal text-muted-foreground">
                {nav.departments.slice(0, MENU_LIMIT).map((d) => (
                  <Link key={d.slug} to="/doctors" search={{ department: d.slug }} onClick={close} className="block py-1">{d.name}</Link>
                ))}
                <Link to="/doctors" onClick={close} className="block py-1 text-primary">View all doctors</Link>
              </div>
            </details>

            <Link to="/treatment-cost" onClick={close} className="border-t border-border py-2.5">Treatment Cost</Link>
            <Link to="/blog" onClick={close} className="py-2.5">Blog</Link>
            <Link to="/contact" onClick={close} className="py-2.5">Contact</Link>
            <a href={`tel:${site.phoneHref}`} className="border-t border-border py-2.5 text-primary">{site.phone}</a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
