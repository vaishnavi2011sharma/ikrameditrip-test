import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/data/site";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Ikra Meditrip" },
      {
        name: "description",
        content:
          "How Ikra Meditrip collects, uses, discloses and protects your personal and medical information when you use our website and services.",
      },
      { property: "og:title", content: "Privacy Policy | Ikra Meditrip" },
      {
        property: "og:description",
        content: "Our commitment to protecting your personal and medical information.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Information we collect",
    body: [
      "Personal information: name, email address, phone number, health details and related records.",
      "Usage data: IP address, browser type, device info, pages visited and other diagnostic data.",
      "Cookies and tracking technologies: for analytics, personalisation and improving user experience.",
    ],
  },
  {
    title: "2. How we use your information",
    body: [
      "Provide and maintain our services.",
      "Respond to inquiries or requests.",
      "Improve website performance and user experience.",
      "Send promotional or service-related communications (with your consent).",
      "Comply with legal obligations.",
    ],
  },
  {
    title: "3. How we share your information",
    body: [
      "We do not sell your personal data. We may share information with trusted third-party service providers (such as payment processors and analytics tools), with legal authorities if required by law, and in the event of a merger, acquisition or asset sale.",
    ],
  },
  {
    title: "4. Your rights and choices",
    body: [
      "Access the personal data we hold about you.",
      "Request correction or deletion of your data.",
      "Opt out of promotional communications.",
      "Withdraw consent, where applicable.",
    ],
  },
  {
    title: "5. Data security",
    body: [
      "We implement appropriate technical and organisational measures to protect your data. However, no method of transmission over the internet is 100% secure.",
    ],
  },
  {
    title: "6. Cookies and tracking",
    body: [
      "We use cookies to personalise your experience, analyse traffic and understand user behaviour. You can manage cookie preferences through your browser settings.",
      "Where Google Analytics or the Meta Pixel are enabled on this website, they are switched off until you choose Accept in the cookie banner. You can change your choice at any time with Cookie settings in the footer. We do not send names, phone numbers, email addresses, medical details or uploaded reports to these tools; they only receive page views and a general 'enquiry submitted' event.",
    ],
  },
  {
    title: "7. Third-party links",
    body: [
      "Our website may contain links to third-party websites. We are not responsible for their privacy practices.",
    ],
  },
  {
    title: "8. Children's privacy",
    body: [
      "Our services are not directed to children under 13. We do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "9. Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.",
    ],
  },
];

function PrivacyPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Privacy policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Effective date: 6 August 2025 · Last updated: 6 August 2025
      </p>
      <p className="mt-6 text-muted-foreground">
        Your privacy matters to us. This Privacy Policy explains how Ikra Meditrip collects, uses,
        discloses and protects your personal information when you visit our website or use our
        services.
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="text-lg font-semibold text-foreground">10. Contact us</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            If you have any questions about this Privacy Policy, contact us at{" "}
            <a href={`mailto:${site.email}`} className="text-primary hover:underline">
              {site.email}
            </a>{" "}
            or{" "}
            <a href={`tel:${site.phoneHref}`} className="text-primary hover:underline">
              {site.phone}
            </a>
            . {site.address}.
          </p>
        </div>
      </div>
    </section>
  );
}
