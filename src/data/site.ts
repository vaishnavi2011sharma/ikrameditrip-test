export const site = {
  name: "Ikra Meditrip",
  tagline: "Your Medical Advisor",
  email: "Contactus@ikrameditrip.com",
  phone: "+91 8282068810",
  phoneHref: "+918282068810",
  address: "Saket, New Delhi, India",
  url: "https://ikrameditrip.com",
  /** WhatsApp click-to-chat link; same number the client lists as "Phone / WhatsApp". */
  whatsappHref: "https://wa.me/918282068810",
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61578806793072",
    instagram: "https://www.instagram.com/ikrameditrp/",
    linkedin: "https://www.linkedin.com/company/linkedin-ikrameditrip/",
    youtube: "https://www.youtube.com/@Ikrameditrip",
  },
};

export const specialties = [
  "Cardiology",
  "Orthopedic & Joint Replacement",
  "Neurology",
  "Haemato Oncology",
  "Oncology",
  "Spine & Scoliosis Surgery",
  "Pediatric Cardiac Care",
  "Ophthalmology",
  "Urology & Kidney Transplant",
  "Liver Transplant, GI & HPB Surgery",
  "Cardio Thoracic & Vascular Surgery",
  "ENT & Cochlear Implant",
  "Dentistry",
  "IVF & Reproductive Medicine",
  "Obstetrics & Gynaecology",
  "Neurointerventional Surgery",
  "Neurosurgery",
];

export const journeySteps = [
  {
    title: "Provide us reports",
    text: "Share your medical reports securely and our team reviews them with the right specialists.",
  },
  {
    title: "Know your treatment cost",
    text: "Receive a clear, itemised cost estimate from multiple accredited hospitals.",
  },
  {
    title: "Visa assistance",
    text: "We arrange the hospital medical visa invitation letter and guide your application.",
  },
  {
    title: "Pre travel arrangements",
    text: "Airport pickup, accommodation near the hospital and local transport, all handled.",
  },
  {
    title: "Language translators",
    text: "Arabic, French, Bengali, Russian, Swahili, Amharic, Somali and more on request.",
  },
  {
    title: "Follow up check up",
    text: "Teleconsultations and follow-up coordination after you return home.",
  },
];

export type Hospital = {
  name: string;
  city: string;
  note?: string;
};

export const hospitals: Hospital[] = [
  { name: "Apollo Main Hospital, Greams Road", city: "Chennai", note: "All specialities" },
  { name: "Apollo Super Speciality Hospitals - Cancer Centre", city: "Chennai", note: "Oncology" },
  { name: "Apollo Fertility Centre", city: "Chennai", note: "IVF & fertility" },
  { name: "Apollo Indraprastha Hospitals", city: "Delhi", note: "All specialities" },
  { name: "Apollo Gleneagles Hospital", city: "Kolkata", note: "All specialities" },
  { name: "Fortis Escorts Heart Institute", city: "Delhi", note: "Cardiac sciences" },
  { name: "Fortis Escorts Hospital", city: "Faridabad", note: "All specialities" },
  { name: "Artemis Hospitals", city: "Gurgaon", note: "All specialities" },
  { name: "Asian Institute of Medical Sciences", city: "Faridabad", note: "All specialities" },
  { name: "Amrita Hospitals", city: "Faridabad", note: "All specialities" },
  { name: "Zemya IVF", city: "Delhi", note: "IVF & reproductive medicine" },
  { name: "Sharp Sight Eye Hospitals", city: "Delhi", note: "Ophthalmology" },
  { name: "P & O International Artificial Limb Centre", city: "Delhi", note: "Prosthetics & orthotics" },
  { name: "Desun Hospital", city: "Kolkata", note: "All specialities" },
  { name: "Nova IVF Fertility", city: "Kolkata", note: "IVF & fertility" },
  { name: "Tx Hospitals", city: "Hyderabad", note: "All specialities" },
  { name: "Manipal Hospitals", city: "Bangalore", note: "All specialities" },
  { name: "Manipal Hospitals, Electronic City", city: "Bangalore", note: "All specialities" },
  { name: "Manipal Hospitals", city: "Siliguri", note: "All specialities" },
  { name: "Kauvery Hospitals", city: "Bangalore", note: "All specialities" },
];
