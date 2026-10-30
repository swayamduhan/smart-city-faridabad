export type RoadArrow = "up" | "up-right" | "right" | "up-left" | "left";

export interface NavItem {
  href: string;
  label: string;
  hi: string;
  arrow: RoadArrow;
}

export const NAV: NavItem[] = [
  { href: "/map", label: "Map", hi: "नक्शा", arrow: "up-left" },
  { href: "/pay", label: "Pay bills", hi: "बिल भरें", arrow: "up" },
  { href: "/report", label: "Report a problem", hi: "शिकायत करें", arrow: "up-right" },
  { href: "/transit", label: "Bus and metro", hi: "बस और मेट्रो", arrow: "right" },
  { href: "/places", label: "Places", hi: "जगहें", arrow: "up-left" },
  { href: "/jobs", label: "Jobs", hi: "नौकरियां", arrow: "up" },
  { href: "/wards", label: "Ward candidates", hi: "वार्ड प्रत्याशी", arrow: "up-right" },
  { href: "/projects", label: "New projects", hi: "नई परियोजनाएं", arrow: "right" },
  { href: "/city", label: "City info", hi: "शहर की जानकारी", arrow: "left" },
];
