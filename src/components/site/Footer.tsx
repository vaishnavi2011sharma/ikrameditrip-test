import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { site } from "@/data/site";
import { CookieSettingsButton } from "@/components/site/ConsentBanner";
import type { NavData } from "@/lib/types";

/** Official brand colours: Facebook blue, Instagram gradient, LinkedIn blue, YouTube red. Only platforms with a configured profile URL are shown. */
const social = [
  { href: site.socials.facebook, label: "Facebook", Icon: Facebook, background: "#1877F2" },
  { href: site.socials.instagram, label: "Instagram", Icon: Instagram, background: "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)" },
  { href: site.socials.linkedin, label: "LinkedIn", Icon: Linkedin, background: "#0A66C2" },
  { href: site.socials.youtube, label: "YouTube", Icon: Youtube, background: "#FF0000" },
].filter((x) => !!x.href);
const linkCls = "text-muted-foreground transition-colors hover:text-primary";

export function Footer({ nav }: { nav: NavData }) {
  return (
    <footer className="border-t border-border bg-accent/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/brand/ikra-logo-badge.webp" alt="Ikra Meditrip - Your Medical Advisor" width={172} height={172} loading="lazy" className="h-20 w-20 rounded-xl bg-white object-contain p-1 shadow-sm" />
            <span className="text-base font-semibold text-foreground">Ikra Meditrip</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Your medical advisor for treatment in India - hospitals, doctors, visa, travel and recovery, coordinated end to end.
          </p>
          <div className="mt-5 flex gap-3">
            {social.map(({ href, label, Icon, background }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} style={{ background }}
                className="rounded-full p-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li><Link to="/about" className={linkCls}>About us</Link></li>
            <li><Link to="/doctors" className={linkCls}>Doctors</Link></li>
            <li><Link to="/blog" className={linkCls}>Blog</Link></li>
            <li><Link to="/treatment-cost" className={linkCls}>Know your treatment cost</Link></li>
            <li><Link to="/contact" className={linkCls}>Contact us</Link></li>
          </ul>
        </div>

        <nav aria-label="Best hospitals">
          <h2 className="text-sm font-semibold text-foreground">Best hospitals</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.hospitals.slice(0, 8).map((h) => (
              <li key={h.slug}>
                <Link to="/hospitals/$slug" params={{ slug: h.slug }} className={linkCls}>{h.name}, {h.city}</Link>
              </li>
            ))}
            <li><Link to="/hospitals" className="font-medium text-primary hover:underline">All hospitals →</Link></li>
          </ul>
        </nav>

        <nav aria-label="Surgery and treatments">
          <h2 className="text-sm font-semibold text-foreground">Surgery & treatments</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.departments.slice(0, 8).map((d) => (
              <li key={d.slug}>
                <Link to="/services/$slug" params={{ slug: d.slug }} className={linkCls}>{d.name}</Link>
              </li>
            ))}
            <li><Link to="/services" className="font-medium text-primary hover:underline">All treatments →</Link></li>
          </ul>
        </nav>

        <div>
          <nav aria-label="Medical destinations">
            <h2 className="text-sm font-semibold text-foreground">Medical destinations</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {nav.cities.map((c) => (
                <li key={c.value}>
                  <Link to="/hospitals" search={{ city: c.value }} className={linkCls}>{c.value}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-secondary" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-secondary" /><a href={`tel:${site.phoneHref}`}>{site.phone}</a></li>
            <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 text-secondary" /><a href={site.whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a></li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-secondary" />{site.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-16 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Ikra Meditrip. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <CookieSettingsButton className="hover:text-primary" />
            <Link to="/privacy-policy" className="hover:text-primary">Privacy policy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
