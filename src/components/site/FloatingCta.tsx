import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { site } from "@/data/site";

/** Persistent mobile-friendly contact bar: WhatsApp, call, and the cost-enquiry page. */
export function FloatingCta() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 p-4">
      <Link
        to="/treatment-cost"
        className="pointer-events-auto rounded-full gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift"
      >
        Know your treatment cost
      </Link>
      <div className="pointer-events-auto flex flex-col gap-3">
        <a
          href={`tel:${site.phoneHref}`}
          aria-label={`Call ${site.phone}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift"
        >
          <Phone className="h-5 w-5" />
        </a>
        <a
          href={site.whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      </div>
    </div>
  );
}
