/**
 * Three original, general-information articles written for Ikra Meditrip (not copied from any source).
 * They contain no prices, statistics, success rates, hospital claims or patient stories. Anything that varies by
 * country, hospital or patient is described as "ask / check". Marked for review by the client's medical team.
 * Body mini-format (rendered safely, no HTML): "## heading", "- list item" lines, and [text](/internal-path) links.
 * Cover photographs are the client-supplied hero images (public/blog).
 */
export type SeedPost = {
  slug: string; title: string; excerpt: string; seo_title: string; seo_description: string;
  cover_image_url: string; cover_image_alt: string; body: string;
};

const NOTE = `## A note before you rely on this guide

This article is general information written by the Ikra Meditrip team. It is not medical advice and it does not replace the opinion of your own doctor. Visa rules, fees, hospital policies and treatment plans change, so please confirm every detail that matters to you with the hospital, the Indian embassy or consulate, and your doctor.`;

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "medical-travel-to-india-step-by-step-guide",
    title: "Medical Travel to India: A Step-by-Step Guide",
    excerpt: "From sharing your reports to flying home, here is how a treatment trip to India is usually organised, and what to prepare at each stage.",
    seo_title: "Medical Travel to India: A Step-by-Step Guide | Ikra Meditrip",
    seo_description: "A clear, practical guide for international patients planning treatment in India: reports, hospital choice, cost estimate, visa, travel, treatment and follow-up.",
    cover_image_url: "/media/blog/hero-doctors.webp",
    cover_image_alt: "Three doctors in white coats standing together outdoors",
    body: `Travelling abroad for treatment feels like a big decision, and it is easier when you can see the whole journey in order. The steps below are the ones most patients go through. Your own case may need extra steps, and your coordinator will tell you which.

## Step 1: Collect your medical reports

Gather the documents that describe your condition: the doctor's summary or referral letter, recent test results, scans (keep the images as well as the written reports) and a list of the medicines you take. If you have had surgery before, include the operation notes. The clearer your file, the faster a specialist can give a useful opinion.

You can send these securely through our [treatment cost enquiry form](/treatment-cost). Please send copies, never your only originals.

## Step 2: Get a specialist opinion

Our team shares your reports with suitable specialists, who may suggest a treatment plan, ask for more tests, or say that treatment abroad is not needed. A good opinion is allowed to be "you do not need to travel". You can read about the specialities we work in on our [departments page](/services), and meet some of the [doctors](/doctors) from our network.

## Step 3: Choose a hospital and doctor

Compare options on the things that matter to you: the doctor's experience with your condition, the hospital's facilities, the city, and how easy it is to reach. Browse our [partner hospitals](/hospitals) and ask us questions before deciding. If you want a second view, you can ask for opinions from more than one doctor.

## Step 4: Receive a written cost estimate

Ask for an estimate in writing that lists what it includes and what it does not. Our guide to [understanding treatment costs in India](/blog/understanding-treatment-costs-in-india) explains the questions to ask. You can start with a free [cost enquiry](/treatment-cost).

## Step 5: Arrange your medical visa

Indian authorities have a visa category for people travelling for medical treatment, and a separate arrangement for the attendants who accompany them. Which type you can use, how to apply and how long it takes depend on your nationality and change over time. Always check the official Indian government visa information or your nearest Indian embassy or consulate. The hospital normally provides a letter confirming your appointment or admission, which supports the application.

## Step 6: Plan travel and stay

Think about the length of your stay, who will travel with you, where you will stay before and after admission, airport pick-up, local transport, food that suits your needs, and language support. Ask whether the hospital or your coordinator can help with each of these. Keep your passport, visa, reports and insurance papers together in your hand luggage.

## Step 7: Arrival, consultation and treatment

On arrival you will usually meet your doctor, repeat or update some tests, and agree the final plan and consent forms. Ask the doctor to explain the procedure, the expected stay, the risks and the recovery in plain language. Do not sign anything you do not understand.

## Step 8: Recovery and follow-up

Your doctor will tell you when it is safe to fly home. Before you leave, ask for a discharge summary, copies of all reports and scans, a list of medicines with instructions, and a plan for follow-up with your doctor at home. Keep in touch with your coordinator for any questions after you return.

${NOTE}

Ready to begin? [Contact our team](/contact) or [send your reports](/treatment-cost) and we will guide you through the first step.`,
  },
  {
    slug: "understanding-treatment-costs-in-india",
    title: "Understanding Treatment Costs in India",
    excerpt: "Why two estimates for the same treatment can differ, what an estimate should include, and the questions to ask before you travel.",
    seo_title: "Understanding Treatment Costs in India | Ikra Meditrip",
    seo_description: "What affects the cost of medical treatment in India, what a good written estimate should include, and the questions to ask hospitals before you travel.",
    cover_image_url: "/media/blog/hero-consultation.webp",
    cover_image_alt: "A doctor checking a patient's blood pressure during a consultation",
    body: `"How much will it cost?" is usually the first question patients ask. The honest answer is that it depends on you, your condition and the choices you make. This guide explains what shapes the cost so you can read any estimate with confidence. We do not quote prices in articles, because a figure that is right for one patient can be wrong for the next. For a figure based on your own reports, use our [treatment cost enquiry](/treatment-cost).

## What changes the cost of treatment

- **Your diagnosis and its stage.** Two patients with the same named condition can need very different treatment.
- **The procedure chosen.** Different techniques, for example open or minimally invasive, can involve different time, equipment and implants.
- **Implants and consumables.** Devices such as joint implants or valves come in different types and grades, and the choice affects the cost.
- **The hospital and the doctor.** Facilities, room category and the experience of the team all play a part.
- **Length of stay.** Days in intensive care or in a ward add up, and recovery sometimes takes longer than planned.
- **Tests and medicines.** Investigations before and after treatment, and medicines during the stay, are often billed separately.
- **Complications or extra procedures.** If something unexpected happens, extra care may be needed. A good estimate explains how this is handled.

## What a good written estimate should show

Ask for the estimate in writing and check that it states:

- the exact procedure and the doctor's name;
- the room category and the number of days it assumes;
- what is included, such as surgeon and anaesthesia fees, operating theatre, implants, tests and medicines;
- what is not included, such as extra days, complications, physiotherapy or follow-up visits;
- how and when payments are made, and the currency;
- how the hospital handles changes to the plan.

## Costs outside the hospital bill

Remember the parts of the trip that sit outside the estimate: flights, the medical visa, accommodation before and after admission, local transport, food, interpreter support and the costs of the person travelling with you. Our [step-by-step travel guide](/blog/medical-travel-to-india-step-by-step-guide) lists the stages so you can plan each one.

## Insurance and payment

Check with your own insurer whether treatment abroad is covered, and what documents they need before you travel. Ask the hospital which payment methods it accepts and whether an advance is needed.

## Questions to ask before you decide

1. Is this a fixed estimate or a range, and what could move it?
2. What happens if I need to stay longer than planned?
3. Which implants or devices are included, and can I see the options?
4. Are follow-up checks after I return home included?
5. Who will I speak to if I have a question about the bill?

## Comparing offers fairly

When you compare two estimates, compare like with like: same procedure, same room category, same length of stay, same inclusions. A lower number is not better if it leaves out things the other one includes. You can look at the hospitals in our network on the [hospitals page](/hospitals) and the specialities we cover on our [services page](/services).

${NOTE}

Questions about your own case? [Talk to our team](/contact).`,
  },
  {
    slug: "preparing-for-surgery-in-india",
    title: "Preparing for Surgery in India",
    excerpt: "A practical checklist for the weeks before, the days around admission and your recovery, so you arrive prepared and come home safely.",
    seo_title: "Preparing for Surgery in India: A Practical Checklist | Ikra Meditrip",
    seo_description: "A practical checklist for international patients preparing for surgery in India: documents, medicines, questions for the surgeon, travel with an attendant, and recovery.",
    cover_image_url: "/media/blog/hero-surgery.webp",
    cover_image_alt: "A surgeon operating in a modern operating theatre",
    body: `Good preparation will not make surgery risk-free, but it does reduce stress and avoids avoidable problems. Use this checklist alongside the instructions from your own surgeon, which always come first.

## In the weeks before you travel

- **Finalise the plan.** Make sure you understand the procedure, the doctor and the hospital. Our guide to [medical travel to India](/blog/medical-travel-to-india-step-by-step-guide) shows the stages in order.
- **Confirm the estimate in writing.** See [understanding treatment costs in India](/blog/understanding-treatment-costs-in-india) for what it should include.
- **Sort out the visa and bookings.** Apply early, and allow some extra days in your schedule in case your treatment plan changes.
- **Talk to your own doctor.** Tell them about your plan and ask whether any of your regular medicines or health conditions need special attention.
- **Ask about medicines.** Never stop or change a medicine unless your doctor tells you to. Ask the surgical team specifically about blood thinners, diabetes medicines and supplements.
- **Ask about smoking and alcohol.** Many surgeons give clear advice about both before an operation. Follow it.

## Questions to ask your surgeon

1. What exactly will be done, and are there alternatives?
2. What are the main risks, and how are they managed?
3. How long will I be in hospital, and how long before I can fly home?
4. What help will I need at home afterwards?
5. What follow-up will I need, and who handles it once I am home?

## What to pack and carry

- passport, visa, hospital appointment letter and insurance papers;
- all reports, scans and a list of your medicines and allergies, in a folder you keep with you;
- comfortable, loose clothing and footwear that is easy to put on;
- chargers, a phone with a local or international plan, and key phone numbers written down;
- the contact details of your coordinator and your doctor at home.

## Travelling with an attendant

Many patients travel with a family member or friend. Decide who will stay with you, who will handle documents and calls, and who can help with decisions if you are unwell. Check the visa arrangements for the person travelling with you.

## Around admission

Arrive with some time to rest before your first appointment. Expect tests and a check-in conversation. Tell the team about any allergy, past reaction to anaesthesia, or change in your health since your reports were made. Read consent forms carefully and ask for them to be explained in a language you understand.

## Recovery and your trip home

- Follow the instructions you are given about movement, wound care, diet and medicines.
- Ask exactly when it is safe to fly, and whether you need to move around during the flight.
- Before you leave, collect your discharge summary, reports, scans and a written medicine plan.
- Know the warning signs the team asked you to watch for, and who to contact if you notice them.
- Book your follow-up visit with your doctor at home.

## Looking after your mind as well

Worry is normal. Write down your questions, ask for explanations, and lean on your companion. If you feel unsure, you can ask for more time or another opinion. You can browse the [doctors](/doctors) in our network or see the [specialities we cover](/services).

${NOTE}

Have a question about preparing for your own treatment? [Contact us](/contact) or [send your reports](/treatment-cost).`,
  },
];
