export interface Stop {
  slug: string;
  src: string;
  width: number;
  height: number;
  name: string;
  hi: string;
  area: string;
  blurb: string;
  /** Where to keep in frame when cropping, 0 to 1 from the top-left. */
  focus: [number, number];
  cta: { label: string; href: string };
}

export const STOPS: Stop[] = [
  { slug: "palace", src: "/images/palace.jpg", width: 1800, height: 2905, name: "Nahar Singh Palace", hi: "नाहर सिंह महल", area: "Ballabhgarh", blurb: "Home of Ballabhgarh's Jat rulers. Raja Nahar Singh was executed by the British after the 1857 uprising.", focus: [0.5, 0.42], cta: { label: "Show on the map", href: "/map?q=Nahar%20Singh%20Mahal" } },
  { slug: "kund", src: "/images/kund.jpg", width: 1800, height: 1200, name: "Surajkund", hi: "सूरजकुंड", area: "Aravalli edge", blurb: "A 10th-century stone reservoir shaped like an amphitheatre, said to have been built by the Tomar king Surajpal.", focus: [0.5, 0.6], cta: { label: "Show on the map", href: "/map?q=Surajkund" } },
  { slug: "sign", src: "/images/sign.jpg", width: 1800, height: 2400, name: "Surajkund Mela", hi: "सूरजकुंड मेला", area: "Every February", blurb: "Craftspeople from across India and beyond set up stalls in the grounds for one of the country's largest crafts fairs.", focus: [0.5, 0.42], cta: { label: "See city events", href: "/city" } },
  { slug: "metro", src: "/images/metro.jpg", width: 1800, height: 1013, name: "Old Faridabad Metro", hi: "ओल्ड फरीदाबाद मेट्रो", area: "Violet Line", blurb: "The Violet Line reached the city in 2015. Eleven stations now link Faridabad to Delhi.", focus: [0.5, 0.5], cta: { label: "Check metro times", href: "/transit" } },
  { slug: "skyway", src: "/images/skyway.jpg", width: 1280, height: 720, name: "Delhi–Faridabad Skyway", hi: "दिल्ली–फरीदाबाद स्काईवे", area: "Badarpur approach", blurb: "The elevated road into the city from Badarpur, on the main highway south from Delhi.", focus: [0.5, 0.5], cta: { label: "Plan a route", href: "/map" } },
  { slug: "street", src: "/images/street.jpg", width: 1800, height: 1350, name: "A monsoon street", hi: "बारिश में एक सड़क", area: "Any neighbourhood", blurb: "Waterlogging, broken roads and missed garbage pickups are the everyday side of the city. Photograph one and send it in.", focus: [0.32, 0.55], cta: { label: "Report a problem", href: "/report" } },
  { slug: "badkhal", src: "/images/badkhal.jpg", width: 1280, height: 960, name: "Badkhal Lake", hi: "बड़खल झील", area: "Badkhal", blurb: "Once a weekend getaway, the lake had run dry by the 2000s. Follow the revival plans on the projects page.", focus: [0.5, 0.55], cta: { label: "See new projects", href: "/projects" } },
];
