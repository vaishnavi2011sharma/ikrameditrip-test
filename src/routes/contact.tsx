import { createFileRoute } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { site } from "@/data/site";
import { AppointmentForm } from "@/components/site/AppointmentForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Book an Appointment | Contact Ikra Meditrip" },
      {
        name: "description",
        content:
          "Book an appointment with Ikra Meditrip. Email Contactus@ikrameditrip.com or call +91 8282068810 for treatment plans and cost estimates in India.",
      },
      { property: "og:title", content: "Book an Appointment | Ikra Meditrip" },
      {
        property: "og:description",
        content: "Send your reports for a free hospital shortlist and treatment cost estimate.",
      },
    ],
  }),
  component: Contact,
});

const socialLinks = [
  { href: site.socials.facebook, label: "Facebook", Icon: Facebook },
  { href: site.socials.instagram, label: "Instagram", Icon: Instagram },
  { href: site.socials.linkedin, label: "LinkedIn", Icon: Linkedin },
  { href: site.socials.youtube, label: "YouTube", Icon: Youtube },
];

function Contact() {
  return (
    <>
      <section className="gradient-soft">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Book an appointment
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Share your reports and preferences. A patient coordinator will respond within 24 hours
            with hospital options, doctor profiles and a cost estimate.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Reach us directly</h2>
          <ul className="mt-6 space-y-5 text-sm">
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-secondary" />
              <span>
                <span className="block font-medium text-foreground">Email</span>
                <a href={`mailto:${site.email}`} className="text-muted-foreground hover:text-primary">
                  {site.email}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-secondary" />
              <span>
                <span className="block font-medium text-foreground">Phone / WhatsApp</span>
                <a href={`tel:${site.phoneHref}`} className="text-muted-foreground hover:text-primary">
                  {site.phone}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-secondary" />
              <span>
                <span className="block font-medium text-foreground">Office</span>
                <span className="text-muted-foreground">{site.address}</span>
              </span>
            </li>
          </ul>

          <h2 className="mt-10 text-xl font-semibold text-foreground">Follow us</h2>
          <div className="mt-4 flex gap-3">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="rounded-full border border-border p-3 text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <AppointmentForm />
      </section>
    </>
  );
}
