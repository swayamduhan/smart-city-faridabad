import "server-only";
import { scryptSync, randomBytes } from "node:crypto";
import wardsGeo from "@/data/wards-geo.json";
import { quoteBill } from "./bills";
import type { Announcement, Application, Candidate, Database, IssueCategory, IssueEvent, IssueReport, Job, JobType, Payment, PayMethod, Project, ServiceId, User, Ward } from "./types";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(1607); // the year Faridabad was founded
const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const between = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const uid = () => Math.floor(r() * 2 ** 48).toString(16).padStart(12, "0");
const DAY = 86_400_000;

function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

// All names and parties below are invented so nobody mistakes sample data for real people.
const FIRST = ["Aarav", "Bhavna", "Chetan", "Divya", "Eshan", "Farah", "Gaurav", "Hema", "Inder", "Jyoti", "Kunal", "Lata", "Manish", "Neha", "Omkar", "Preeti", "Qasim", "Ritu", "Sahil", "Tara", "Uday", "Vandana", "Yash", "Zoya", "Anil", "Babita", "Deepak", "Geeta", "Harish", "Kamla", "Mohit", "Nisha", "Pankaj", "Rekha", "Sandeep", "Usha", "Vikram"];
const LAST = ["Adhana", "Bainsla", "Chauhan", "Dagar", "Gaur", "Hooda", "Jangid", "Kasana", "Lohia", "Mavi", "Nain", "Rana", "Saini", "Tewatia", "Vashisht", "Yadav", "Bhati", "Khan", "Kaur", "Sharma"];
const PARTIES = ["Nagrik Ekta Dal", "Aravalli Vikas Manch", "Shramik Jan Front", "Yamuna Lok Samiti", "Independent"];
const EDUCATION = ["Graduate", "Postgraduate", "Class 12", "Diploma in civil engineering", "LLB", "B.Com", "Class 10", "MBA"];
const OCCUPATIONS = ["Small business owner", "Retired teacher", "Advocate", "Social worker", "Transport contractor", "Doctor", "Factory supervisor", "Farmer", "Chartered accountant", "Homemaker"];
const PROMISES = [
  "Repair every lane within the ward in 18 months",
  "Fix the monsoon waterlogging at the main chowk",
  "Daily door-to-door garbage pickup with a public schedule",
  "LED streetlights on all internal roads",
  "A women's health clinic open on weekends",
  "Clean piped water supply for all blocks",
  "Monthly open meetings with residents",
  "Restore the neighbourhood park and add a library corner",
  "Safer crossings near schools",
  "Publish all ward spending online every quarter",
];

const WARD_GROUPS: [string, string][] = [
  ["Sarai Khawaja", "Sector 37"], ["Mewla Maharajpur", "Sector 37"], ["Sector 28", "Sector 29"], ["Sector 29", "Sector 31"], ["Sector 31", "Sector 28"],
  ["Badkhal", "Sector 21A"], ["Sector 21A", "Sector 21B"], ["Sector 21B", "Sector 21C"], ["Sector 21C", "Sector 21D"], ["Sector 21D", "Sector 46"],
  ["Sector 46", "Sector 48"], ["Sector 48", "Sector 49"], ["Sector 49", "Sainik Colony"], ["Sainik Colony", "Surajkund"], ["Surajkund", "Sector 46"],
  ["Old Faridabad", "Sector 19"], ["Sector 15", "Sector 15A"], ["Sector 15A", "Sector 16"], ["Sector 16", "Sector 16A"], ["Sector 16A", "Sector 17"],
  ["Sector 17", "Sector 18"], ["Sector 18", "Sector 19"], ["Sector 19", "Old Faridabad"], ["NIT 1", "NIT 2"], ["NIT 2", "NIT 3"],
  ["NIT 3", "NIT 5"], ["NIT 5", "Dabua Colony"], ["Ajronda", "Sector 11"], ["Sector 11", "Sector 12"], ["Sector 12", "Sector 14"],
  ["Sector 14", "Ajronda"], ["Sector 7", "Sector 8"], ["Sector 8", "Sector 9"], ["Sector 9", "Sector 10"], ["Sector 10", "Sector 7"],
  ["Dabua Colony", "Jawahar Colony"], ["Jawahar Colony", "NIT 5"], ["Sector 22", "Sector 23"], ["Sector 23", "Sector 25"], ["Sector 25", "Sector 22"],
  ["Sector 55", "Sector 56"], ["Sector 56", "Sector 62"], ["Ballabhgarh", "Sector 56"], ["Sector 62", "Ballabhgarh"], ["Tigaon", "Sector 62"], ["Ballabhgarh", "Tigaon"],
];

const geo = wardsGeo as unknown as Record<string, [number, number]>;

function buildWards(now: number): Ward[] {
  const electionDate = new Date(now + 96 * DAY).toISOString();
  return WARD_GROUPS.map(([a, b], i) => {
    const c = geo[a] ?? geo[b] ?? [28.41, 77.31];
    return {
      number: i + 1,
      name: `${a} and ${b}`,
      localities: [a, b],
      lat: c[0] + (r() - 0.5) * 0.004,
      lng: c[1] + (r() - 0.5) * 0.004,
      voters: between(21000, 44000),
      electionDate,
    };
  });
}

function buildCandidates(wards: Ward[]): Candidate[] {
  const out: Candidate[] = [];
  const name = () => `${pick(FIRST)} ${pick(LAST)}`;
  const promises = () => {
    const pool = [...PROMISES];
    return Array.from({ length: 3 }, () => pool.splice(Math.floor(r() * pool.length), 1)[0]);
  };
  for (const w of wards) {
    const elected: Candidate = {
      id: uid(), ward: w.number, name: name(), age: between(31, 66), party: pick(PARTIES), status: "elected",
      education: pick(EDUCATION), occupation: pick(OCCUPATIONS), assetsLakh: between(12, 640), promises: promises(),
      attendance: between(58, 98), fundsUsed: between(34, 94),
    };
    out.push(elected);
    const count = between(2, 4);
    for (let i = 0; i < count; i++) {
      out.push({ id: uid(), ward: w.number, name: name(), age: between(26, 68), party: pick(PARTIES), status: "standing", education: pick(EDUCATION), occupation: pick(OCCUPATIONS), assetsLakh: between(4, 720), promises: promises() });
    }
  }
  return out;
}

function buildAnnouncements(now: number): Announcement[] {
  const rows: Omit<Announcement, "id" | "publishedAt">[] = [
    { kind: "alert", title: "Water supply off in NIT 1 and NIT 2 on Saturday", body: "Pipeline repair near Neelam Chowk. Supply stops from 9 am to 4 pm. Tankers will be stationed at the NIT 1 market.", ward: 24 },
    { kind: "notice", title: "Property tax rebate ends on 15 November", body: "Pay the full year's tax by 15 November to get a 10% rebate. You can pay online from the bills page." },
    { kind: "event", title: "Plant drive at Badkhal Lake this Sunday", body: "Join the morning plant drive from 7:30 am. Saplings and tools are provided. Bring water and a hat.", ward: 6 },
    { kind: "alert", title: "GRAP restrictions in force as air quality worsens", body: "Construction dust rules apply across the city. Report open burning from the report page, and wear a mask outdoors." },
    { kind: "notice", title: "New garbage pickup timetable for Sectors 15 to 19", body: "Morning pickup moves to 6:30 am from Monday. Dry and wet waste are collected on separate vehicles.", ward: 18 },
    { kind: "event", title: "Free health camp at the Sector 8 community centre", body: "Eye, blood pressure and diabetes checks on 8 November, 10 am to 2 pm. No registration needed.", ward: 33 },
    { kind: "notice", title: "Voter list corrections are open until 30 November", body: "Check your name on the ward page. Corrections can be filed at any ward office with an ID proof." },
    { kind: "alert", title: "Diversion near Bata Chowk for drain work", body: "One lane of the service road is closed until 12 November. Buses 101 and 412 stop 200 m further south.", ward: 28 },
  ];
  return rows.map((a, i) => ({ ...a, id: uid(), publishedAt: new Date(now - i * 1.7 * DAY - between(1, 9) * 3600_000).toISOString() }));
}

function buildProjects(now: number): Project[] {
  const d = (days: number) => new Date(now + days * DAY).toISOString();
  return [
    { id: uid(), name: "Greater Faridabad link road", summary: "A six-lane connector from Sector 75 to the expressway spur, with cycle tracks and service lanes.", stage: "under_construction", progress: 62, budgetCr: 318, startDate: d(-420), endDate: d(240), locality: "Sector 75", lat: 28.3985, lng: 77.3545, agency: "Metropolitan Development Authority", category: "Roads" },
    { id: uid(), name: "Badkhal Lake revival", summary: "Treated water will refill the dry lakebed. The plan adds a walking loop, wetlands and a public ghat.", stage: "under_construction", progress: 41, budgetCr: 85, startDate: d(-300), endDate: d(420), locality: "Badkhal", lat: 28.4168, lng: 77.2758, agency: "Municipal Corporation", category: "Environment" },
    { id: uid(), name: "Neelam Chowk flyover widening", summary: "Adds two lanes each way and clears the bottleneck on the Old Faridabad to NIT stretch.", stage: "under_construction", progress: 78, budgetCr: 142, startDate: d(-510), endDate: d(90), locality: "Neelam Chowk", lat: 28.3928, lng: 77.3024, agency: "Public Works Department", category: "Roads" },
    { id: uid(), name: "Stormwater drains for NIT 1 to 5", summary: "New covered trunk drains to end monsoon flooding in the NIT blocks.", stage: "under_construction", progress: 29, budgetCr: 204, startDate: d(-160), endDate: d(600), locality: "NIT 2", lat: 28.3871, lng: 77.2995, agency: "Municipal Corporation", category: "Drainage" },
    { id: uid(), name: "Ballabhgarh multi-specialty hospital", summary: "A 300-bed public hospital with trauma, dialysis and maternity wings.", stage: "approved", progress: 8, budgetCr: 275, startDate: d(45), endDate: d(1000), locality: "Ballabhgarh", lat: 28.3415, lng: 77.3235, agency: "Health Department", category: "Health" },
    { id: uid(), name: "Electric bus depot at Sector 56", summary: "Charging for 80 electric buses, serving new routes across the city.", stage: "approved", progress: 12, budgetCr: 96, startDate: d(30), endDate: d(520), locality: "Sector 56", lat: 28.3586, lng: 77.3016, agency: "City Transport Company", category: "Transit" },
    { id: uid(), name: "Smart streetlights, phase two", summary: "About 22,000 LED lights with fault alerts across 18 wards.", stage: "under_construction", progress: 55, budgetCr: 64, startDate: d(-240), endDate: d(150), locality: "Sector 21C", lat: 28.4285, lng: 77.2958, agency: "Municipal Corporation", category: "Utilities" },
    { id: uid(), name: "Aravalli biodiversity trail", summary: "A 9 km guided trail from Surajkund into the Aravalli forest with native-species signage.", stage: "proposed", progress: 0, budgetCr: 18, startDate: d(210), endDate: d(800), locality: "Surajkund", lat: 28.4852, lng: 77.2840, agency: "Forest Department", category: "Environment" },
    { id: uid(), name: "Old Faridabad market redevelopment", summary: "Rebuilds the market with vendor stalls, parking and a pedestrian street.", stage: "proposed", progress: 0, budgetCr: 122, startDate: d(300), endDate: d(1100), locality: "Old Faridabad", lat: 28.4116, lng: 77.3119, agency: "Metropolitan Development Authority", category: "Public space" },
    { id: uid(), name: "Sector 12 sports complex upgrade", summary: "New synthetic track, indoor halls and a swimming pool. Now open to the public.", stage: "completed", progress: 100, budgetCr: 47, startDate: d(-900), endDate: d(-60), locality: "Sector 12", lat: 28.3978, lng: 77.3299, agency: "Sports Department", category: "Public space" },
  ];
}

function buildJobs(now: number): Job[] {
  const TEMPLATES: { title: string; category: string; employers: string[]; min: number; max: number; exp: string; type?: JobType; about: string }[] = [
    { title: "CNC machine operator", category: "Manufacturing", employers: ["Aravalli Auto Components", "Mujesar Precision Works"], min: 18, max: 28, exp: "2+ years", about: "Run and set CNC lathes on the day shift, check parts against drawings and keep machine logs." },
    { title: "Quality inspector", category: "Manufacturing", employers: ["Aravalli Auto Components", "Yamuna Agro Equipment"], min: 22, max: 34, exp: "3+ years", about: "Inspect tractor sub-assemblies, record defects and work with the line supervisors on fixes." },
    { title: "Welder", category: "Manufacturing", employers: ["Ballabhgarh Fabricators", "Yamuna Agro Equipment"], min: 16, max: 26, exp: "1+ years", about: "MIG and arc welding of structural frames. ITI certificate preferred." },
    { title: "ITI apprentice, fitter", category: "Manufacturing", employers: ["Mujesar Precision Works", "Ballabhgarh Fabricators"], min: 11, max: 14, exp: "Freshers", type: "Apprenticeship", about: "One-year paid apprenticeship with shop-floor training and a certificate on completion." },
    { title: "Staff nurse", category: "Healthcare", employers: ["Sector 16 Care Hospital", "Neelam Health Centre"], min: 24, max: 38, exp: "2+ years", about: "Ward duty on rotating shifts. GNM or B.Sc Nursing with state registration required." },
    { title: "Lab technician", category: "Healthcare", employers: ["Neelam Health Centre", "CityPath Diagnostics"], min: 18, max: 27, exp: "1+ years", about: "Collect samples and run routine pathology tests. DMLT required." },
    { title: "Primary school teacher", category: "Education", employers: ["Sunrise Public School", "Aravalli Vidya Niketan"], min: 22, max: 35, exp: "2+ years", about: "Teach classes 1 to 5. B.Ed and CTET preferred." },
    { title: "Maths tutor", category: "Education", employers: ["Bright Path Coaching"], min: 15, max: 25, exp: "1+ years", type: "Part-time", about: "Evening batches for classes 9 and 10, three days a week." },
    { title: "Store associate", category: "Retail", employers: ["Crown Plaza Mall Stores", "Old Market Traders"], min: 13, max: 19, exp: "Freshers", about: "Help customers, restock shelves and handle billing on a rotating weekly shift." },
    { title: "Delivery rider", category: "Logistics", employers: ["QuickDrop Faridabad", "NH19 Couriers"], min: 17, max: 28, exp: "Freshers", type: "Contract", about: "Local deliveries within 8 km. Own two-wheeler and a valid licence needed. Fuel allowance included." },
    { title: "Warehouse supervisor", category: "Logistics", employers: ["NH19 Couriers", "Prithla Logistics Park"], min: 26, max: 40, exp: "4+ years", about: "Lead a team of 15 in inbound, dispatch and inventory audits." },
    { title: "Junior web developer", category: "Technology", employers: ["FBD Digital Labs", "Sector 16 Softworks"], min: 28, max: 50, exp: "1+ years", about: "Build and maintain React apps for local manufacturers and retailers." },
    { title: "IT support technician", category: "Technology", employers: ["Sector 16 Softworks", "Aravalli Auto Components"], min: 20, max: 32, exp: "1+ years", about: "Set up laptops and networks, and resolve day-to-day support tickets on site." },
    { title: "Hotel front desk executive", category: "Hospitality", employers: ["Surajkund Garden Inn"], min: 18, max: 26, exp: "1+ years", about: "Check guests in and out, manage bookings and coordinate with housekeeping." },
    { title: "Line cook", category: "Hospitality", employers: ["Surajkund Garden Inn", "Spice Route Kitchen"], min: 16, max: 26, exp: "1+ years", about: "Prepare North Indian and tandoor dishes for a busy dinner service." },
    { title: "Sanitation supervisor", category: "City services", employers: ["City Sanitation Contractor"], min: 20, max: 30, exp: "2+ years", type: "Contract", about: "Oversee ward pickup crews, routes and attendance. Field work in Sectors 15 to 19." },
    { title: "Site engineer, civil", category: "City services", employers: ["Metro Infra Builders", "Haryana Road Contractors"], min: 32, max: 55, exp: "3+ years", about: "Supervise road and drain construction on city projects. B.Tech Civil required." },
    { title: "Bus conductor", category: "City services", employers: ["City Transport Company"], min: 16, max: 22, exp: "Freshers", type: "Contract", about: "Work on city routes on rotating shifts. Conductor licence required." },
  ];
  const LOCALITIES = ["Sector 24", "Sector 25", "NIT 1", "Sector 16", "Ballabhgarh", "Mujesar", "Sector 12", "Old Faridabad", "Prithla", "Sector 37", "Sector 59", "Badkhal"];
  const jobs: Job[] = [];
  while (jobs.length < 42) {
    const t = TEMPLATES[jobs.length % TEMPLATES.length];
    jobs.push({
      id: uid(),
      title: t.title,
      employer: pick(t.employers),
      category: t.category,
      type: t.type ?? (r() > 0.88 ? "Contract" : "Full-time"),
      locality: pick(LOCALITIES),
      salaryMin: t.min * 1000,
      salaryMax: t.max * 1000,
      experience: t.exp,
      openings: between(1, 8),
      description: t.about,
      postedAt: new Date(now - between(0, 24) * DAY - between(0, 20) * 3600_000).toISOString(),
    });
  }
  return jobs.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

const REPORT_TEXT: Record<IssueCategory, string[]> = {
  roads: ["Large pothole on the service lane, two-wheelers are swerving into traffic", "Road surface has broken up near the school gate", "Speed breaker has crumbled and exposed the rebar"],
  garbage: ["Garbage has not been picked up for four days near the market", "Overflowing bin at the corner of the park", "Construction debris dumped on the footpath"],
  streetlight: ["Three streetlights out on this stretch, very dark after 7 pm", "Streetlight stays on all day", "Pole is leaning and the wiring is exposed"],
  water: ["Water pipe leaking onto the road since yesterday", "Low water pressure for the whole block this week", "Dirty brown water from the tap in the morning"],
  drain: ["Blocked drain, sewage is backing up onto the road", "Open manhole without a cover", "Drain cover is broken near the bus stop"],
  other: ["Stray cattle blocking the road every evening", "Fallen tree branch is blocking half the lane", "Illegal hoarding is hiding the traffic signal"],
};

const CREWS = ["Road crew 4", "Sanitation team B", "Electrical team 2", "Water works team 1", "Drainage team 3"];
const NOTES = { submitted: "Report received.", acknowledged: "Verified and assigned to a field team.", in_progress: "Crew is on site.", resolved: "Work finished and closed." };

function buildReports(wards: Ward[], now: number): IssueReport[] {
  const cats = Object.keys(REPORT_TEXT) as IssueCategory[];
  const out: IssueReport[] = [];
  for (let i = 0; i < 64; i++) {
    const category = cats[Math.floor(r() ** 1.4 * cats.length)];
    const ward = pick(wards);
    const age = r() ** 1.3 * 45;
    const createdAt = now - age * DAY;
    const ladder = ["submitted", "acknowledged", "in_progress", "resolved"] as const;
    const stage = age > 20 ? (r() > 0.2 ? 3 : 2) : age > 6 ? between(1, 3) : between(0, 2);
    const events: IssueEvent[] = [];
    for (let s = 0; s <= stage; s++) {
      const at = createdAt + (s * Math.min(age, 12) * DAY) / 4;
      events.push({ status: ladder[s], at: new Date(at).toISOString(), note: NOTES[ladder[s]] });
    }
    out.push({
      id: uid(),
      ticket: `FBD-${(10234 + i * 7).toString()}`,
      userId: null,
      category,
      description: pick(REPORT_TEXT[category]),
      lat: +(ward.lat + (r() - 0.5) * 0.008).toFixed(5),
      lng: +(ward.lng + (r() - 0.5) * 0.008).toFixed(5),
      locality: ward.localities[0],
      ward: ward.number,
      status: ladder[stage],
      assignedTo: stage > 0 ? pick(CREWS) : undefined,
      createdAt: new Date(createdAt).toISOString(),
      events,
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function buildPayments(now: number, citizenId: string): Payment[] {
  const services: ServiceId[] = ["electricity", "water", "gas", "property", "waste", "broadband", "mobile"];
  const weights = [0.36, 0.2, 0.14, 0.06, 0.1, 0.08, 0.06];
  const methods: PayMethod[] = ["upi", "upi", "upi", "card", "netbanking"];
  const out: Payment[] = [];
  for (let i = 0; i < 420; i++) {
    let x = r();
    let idx = 0;
    while (x > weights[idx]) x -= weights[idx++];
    const service = services[idx];
    const when = new Date(now - r() * 90 * DAY);
    const consumerNo = String(between(10000000, 99999999));
    const bill = quoteBill(service, consumerNo, when, () => false);
    const method = pick(methods);
    out.push({
      id: uid(),
      txnRef: `SIM${when.getTime().toString(36).toUpperCase()}${i}`,
      userId: i % 60 === 0 ? citizenId : null,
      service,
      consumerNo,
      holder: bill.holder,
      period: bill.period,
      periodKey: `seed-${i}`,
      amount: bill.amount,
      method,
      methodDetail: method === "upi" ? "UPI" : method === "card" ? "Card" : "Net banking",
      status: r() > 0.04 ? "success" : "failed",
      createdAt: when.toISOString(),
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function seedDatabase(): Database {
  const now = Date.now();
  const iso = new Date(now - 200 * DAY).toISOString();
  const citizen: User = {
    id: "demo-citizen",
    name: "Asha Rawat",
    email: "citizen@faridabad.demo",
    phone: "90000 00001",
    ward: 18,
    role: "citizen",
    passwordHash: hash("demo1234"),
    createdAt: iso,
    savedPlaces: [],
    savedJobs: [],
    connections: [
      { service: "electricity", consumerNo: "4410286753", label: "Home" },
      { service: "water", consumerNo: "210094417", label: "Home" },
      { service: "gas", consumerNo: "6600152089", label: "Home" },
    ],
  };
  const admin: User = {
    id: "demo-admin",
    name: "Rohit Malik",
    email: "admin@faridabad.demo",
    ward: 1,
    role: "admin",
    passwordHash: hash("demo1234"),
    createdAt: iso,
    savedPlaces: [],
    savedJobs: [],
    connections: [],
  };
  const wards = buildWards(now);
  const jobs = buildJobs(now);
  const applications: Application[] = [{ id: uid(), jobId: jobs[3].id, userId: citizen.id, status: "shortlisted", createdAt: new Date(now - 3 * DAY).toISOString() }];
  const reports = buildReports(wards, now);
  reports.slice(4, 7).forEach((rep) => (rep.userId = citizen.id));
  return {
    users: [citizen, admin],
    payments: buildPayments(now, citizen.id),
    reports,
    announcements: buildAnnouncements(now),
    projects: buildProjects(now),
    wards,
    candidates: buildCandidates(wards),
    jobs,
    applications,
  };
}
