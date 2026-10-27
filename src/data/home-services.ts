/**
 * The 8 services shown in "Multispeciality medical services" on the homepage (client instruction, Oct 2026), in this order.
 * `slug` = an existing department page, so links and icons keep working; `label` is the wording the client asked for.
 * "Neurology & Neurosurgery" opens the Neurology page; Neurosurgery stays reachable from All Services and the menus.
 * The full list of 25 departments is unchanged ("View all").
 */
export const HOME_SERVICES: { slug: string; label: string }[] = [
  { slug: "cardiology", label: "Cardiology" },
  { slug: "oncology", label: "Oncology" },
  { slug: "orthopedic-and-joint-replacement", label: "Orthopedic & Joint Replacement" },
  { slug: "neurology", label: "Neurology & Neurosurgery" },
  { slug: "spine-and-scoliosis-surgery", label: "Spine & Scoliosis Surgery" },
  { slug: "ivf-and-reproductive-medicine", label: "IVF & Fertility Treatment" },
  { slug: "liver-transplant-gi-and-hpb-surgery", label: "Liver Transplant, GI & HPB Surgery" },
  { slug: "ent-and-cochlear-implant", label: "ENT & Cochlear Implant" },
];

/** How many partner hospitals the homepage slider shows (first N featured, in the client's order). */
export const HOME_HOSPITAL_COUNT = 3;
