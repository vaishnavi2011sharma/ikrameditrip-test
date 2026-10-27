/**
 * DEMONSTRATION ONLY - not real patients, not real reviews.
 * These placeholders exist so the layout can be reviewed. They are shown ONLY while the admin panel has no published,
 * consent-confirmed testimonial, they are always labelled "Demo", and they carry no names, countries, ratings or
 * medical claims. They disappear automatically once the first genuine testimonial is published in the admin panel.
 */
export const demoTestimonials = [
  { id: "demo-1", quote: "Demo text: a patient's own words about how the coordination, communication and care felt will appear here." },
  { id: "demo-2", quote: "Demo text: a short, genuine experience shared with written consent, with the patient's name and country, will appear here." },
  { id: "demo-3", quote: "Demo text: feedback about the journey, from the first enquiry to the flight home, will appear here." },
] as const;
