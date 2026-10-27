import { Link } from "@tanstack/react-router";
import { analyticsEnabled } from "@/lib/analytics";
import { setConsent, useConsent } from "@/lib/consent";

/** Opt-in banner for analytics/advertising cookies. Rendered only when a GA4 or Meta Pixel ID is configured and no choice was made yet. */
export function ConsentBanner() {
  const { consent, ready } = useConsent();
  if (!ready || consent !== null || !analyticsEnabled()) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lift sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          We use analytics and advertising cookies (Google Analytics, Meta Pixel) to understand how visitors use the site and to measure our ads.
          They stay off unless you accept. No health details you enter in our forms are sent to them. See our{" "}
          <Link to="/privacy-policy" className="font-medium text-primary underline">privacy policy</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => { setConsent("denied"); if (window.__ikraAnalytics) window.location.reload(); }}
            className="h-10 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Decline
          </button>
          <button type="button" onClick={() => setConsent("granted")}
            className="h-10 rounded-md gradient-brand px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link to change the choice later (only shown when tracking is configured). */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  const { ready } = useConsent();
  if (!ready || !analyticsEnabled()) return null;
  return (
    <button type="button" className={className}
      onClick={() => { setConsent("reset"); }}>
      Cookie settings
    </button>
  );
}
