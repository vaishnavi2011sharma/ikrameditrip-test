/**
 * Site-wide tracking: Google Analytics 4 + Meta Pixel.
 *
 * IDs come ONLY from environment variables (set them in Vercel → Settings → Environment Variables, then redeploy — Vite
 * reads them at build time):
 *   VITE_GA_MEASUREMENT_ID   e.g. G-XXXXXXXXXX   (GA4 → Admin → Data streams → Measurement ID)
 *   VITE_META_PIXEL_ID       e.g. 1234567890     (Meta Events Manager → Data sources → Pixel ID)
 * When an ID is missing that tool is simply not loaded (nothing is sent anywhere, no placeholder IDs exist).
 *
 * Page views are sent manually, once per route change (`trackPageView`, called from <AnalyticsTracker/>); the automatic
 * page_view / PageView of both snippets is switched off so client-side navigation is never double counted.
 * Lead conversions (`trackLead`) are sent only after /api/leads accepted the form. No personal data is ever sent.
 */

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
    __ikraAnalytics?: boolean;
  }
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const clean = (v: string | undefined, re: RegExp) => (v && re.test(v.trim()) ? v.trim() : "");
/** GA4 measurement IDs look like G-ABC123; Meta pixel IDs are 8–20 digits. Anything else is ignored. */
export const GA_ID = clean(env.VITE_GA_MEASUREMENT_ID, /^G-[A-Z0-9]{4,}$/i);
export const META_PIXEL_ID = clean(env.VITE_META_PIXEL_ID, /^\d{8,20}$/);

export const analyticsEnabled = () => !!(GA_ID || META_PIXEL_ID);

/** Load the enabled tools once (browser only). Safe to call repeatedly. */
export function initAnalytics(): void {
  if (typeof window === "undefined" || window.__ikraAnalytics) return;
  window.__ikraAnalytics = true;

  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js requires the Arguments object itself, not an array
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
  }

  if (META_PIXEL_ID) {
    if (!window.fbq) {
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      } as Fbq;
      n.queue = [];
      n.loaded = true;
      n.version = "2.0";
      window.fbq = n;
      window._fbq = n;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }
    window.fbq("init", META_PIXEL_ID);
  }
}

/** One page view for a route (called once per path change). */
export function trackPageView(path: string): void {
  if (typeof window === "undefined" || !window.__ikraAnalytics) return;
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
  });
  window.fbq?.("track", "PageView");
}

/** Lead conversion: call ONLY after the server accepted the submission. `kind` = appointment | cost_enquiry | contact. */
export function trackLead(kind: string, sourcePath: string): void {
  if (typeof window === "undefined" || !window.__ikraAnalytics) return;
  window.gtag?.("event", "generate_lead", { lead_type: kind, page_path: sourcePath });
  window.fbq?.("track", "Lead", { content_name: kind });
}
