/**
 * Consent for NON-ESSENTIAL tracking (Google Analytics 4, Meta Pixel). Nothing is loaded until the visitor chooses "Accept".
 * The choice is kept in this browser only (localStorage "ikra_consent"); essential site functions never depend on it.
 * This is a technical opt-in mechanism, not legal advice - have the wording reviewed for the audiences you advertise to.
 */
import { useEffect, useState } from "react";

export type Consent = "granted" | "denied" | null;
const KEY = "ikra_consent";
const EVENT = "ikra-consent-change";

export function getConsent(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null; // storage blocked: treated as "no consent yet" so nothing loads
  }
}

export function setConsent(v: Exclude<Consent, null> | "reset"): void {
  try {
    if (v === "reset") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, v);
  } catch {
    /* ignore: the in-page event below still updates this visit */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v === "reset" ? null : v }));
}

/** Current choice. `ready` is false during SSR / first paint so the banner never causes a hydration mismatch. */
export function useConsent(): { consent: Consent; ready: boolean } {
  const [state, setState] = useState<{ consent: Consent; ready: boolean }>({ consent: null, ready: false });
  useEffect(() => {
    const read = () => setState({ consent: getConsent(), ready: true });
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return state;
}
