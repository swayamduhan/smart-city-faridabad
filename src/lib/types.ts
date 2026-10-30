export type Role = "citizen" | "admin";

export type ServiceId = "electricity" | "water" | "gas" | "property" | "waste" | "broadband" | "mobile";

export interface Connection {
  service: ServiceId;
  consumerNo: string;
  label: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ward: number;
  role: Role;
  passwordHash: string;
  createdAt: string;
  savedPlaces: string[];
  savedJobs: string[];
  connections: Connection[];
}

/** User without credentials, safe to send to client components. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Bill {
  service: ServiceId;
  consumerNo: string;
  holder: string;
  period: string;
  periodKey: string;
  amount: number;
  dueDate: string;
  usage: string;
  paid: boolean;
}

export type PayMethod = "upi" | "card" | "netbanking";

export interface Payment {
  id: string;
  txnRef: string;
  userId: string | null;
  service: ServiceId;
  consumerNo: string;
  holder: string;
  period: string;
  periodKey: string;
  amount: number;
  method: PayMethod;
  methodDetail: string;
  status: "success" | "failed";
  createdAt: string;
}

export type IssueCategory = "roads" | "garbage" | "streetlight" | "water" | "drain" | "other";
export type IssueStatus = "submitted" | "acknowledged" | "in_progress" | "resolved";

export interface IssueEvent {
  status: IssueStatus;
  at: string;
  note: string;
}

export interface IssueReport {
  id: string;
  ticket: string;
  userId: string | null;
  category: IssueCategory;
  description: string;
  lat: number;
  lng: number;
  locality: string;
  ward: number;
  photoId?: string;
  status: IssueStatus;
  assignedTo?: string;
  createdAt: string;
  events: IssueEvent[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: "notice" | "alert" | "event";
  publishedAt: string;
  ward?: number;
}

export type ProjectStage = "proposed" | "approved" | "under_construction" | "completed";

export interface Project {
  id: string;
  name: string;
  summary: string;
  stage: ProjectStage;
  progress: number;
  budgetCr: number;
  startDate: string;
  endDate: string;
  locality: string;
  lat: number;
  lng: number;
  agency: string;
  category: string;
}

export interface Ward {
  number: number;
  name: string;
  localities: string[];
  lat: number;
  lng: number;
  voters: number;
  electionDate: string;
}

export interface Candidate {
  id: string;
  ward: number;
  name: string;
  age: number;
  party: string;
  status: "elected" | "standing";
  education: string;
  occupation: string;
  assetsLakh: number;
  promises: string[];
  attendance?: number;
  fundsUsed?: number;
}

export type JobType = "Full-time" | "Part-time" | "Contract" | "Apprenticeship";

export interface Job {
  id: string;
  title: string;
  employer: string;
  category: string;
  type: JobType;
  locality: string;
  salaryMin: number;
  salaryMax: number;
  experience: string;
  openings: number;
  description: string;
  postedAt: string;
  externalUrl?: string;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: "applied" | "shortlisted" | "rejected";
  createdAt: string;
}

export interface Place {
  id: string;
  category: PlaceCategory;
  name: string;
  nameHi?: string;
  lat: number;
  lng: number;
  kind?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  cuisine?: string;
  emergency?: boolean;
}

export type PlaceCategory = "schools" | "hospitals" | "parks" | "cafes" | "food";

export interface Database {
  users: User[];
  payments: Payment[];
  reports: IssueReport[];
  announcements: Announcement[];
  projects: Project[];
  wards: Ward[];
  candidates: Candidate[];
  jobs: Job[];
  applications: Application[];
}
