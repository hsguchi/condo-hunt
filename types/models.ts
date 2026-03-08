export type ListingStatus =
  | "new"
  | "shortlisted"
  | "viewing_booked"
  | "viewed"
  | "negotiating"
  | "dropped";

export interface Listing {
  id: string;
  listingId: string;
  projectName: string;
  address: string;
  district: string;
  price: number;
  sizeSqft: number;
  psf: number;
  bedrooms: number;
  bathrooms: number;
  tenure: string;
  topYear: number;
  mrtStation: string;
  mrtWalkMins: number;
  ipsDriveMins: number;
  sourceUrl: string;
  sourceSite: string;
  agentName: string;
  agentPhone: string;
  status: ListingStatus;
  notes: string;
}

export interface Agent {
  id: string;
  agentId: string;
  agentName: string;
  phone: string;
  agency: string;
  notes: string;
  contacted: boolean;
  listingCount: number;
}

export interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
}
