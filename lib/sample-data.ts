import type { Agent, DashboardMetric, Listing } from "@/types/models";

export const sampleListings: Listing[] = [
  {
    id: "1",
    listingId: "L-001",
    projectName: "Meyer Crest",
    address: "Meyer Road",
    district: "D15",
    price: 2480000,
    sizeSqft: 915,
    psf: 2710,
    bedrooms: 2,
    bathrooms: 2,
    tenure: "Freehold",
    topYear: 2025,
    mrtStation: "Katong Park",
    mrtWalkMins: 7,
    ipsDriveMins: 15,
    sourceUrl: "https://example.com/meyer-crest",
    sourceSite: "PropertyGuru",
    agentName: "John Tan",
    agentPhone: "+6591234567",
    status: "shortlisted",
    notes: "Quiet stack facing greenery."
  },
  {
    id: "2",
    listingId: "L-002",
    projectName: "The Continuum",
    address: "Thiam Siew Avenue",
    district: "D15",
    price: 3190000,
    sizeSqft: 1227,
    psf: 2600,
    bedrooms: 3,
    bathrooms: 2,
    tenure: "Freehold",
    topYear: 2027,
    mrtStation: "Tanjong Katong",
    mrtWalkMins: 9,
    ipsDriveMins: 18,
    sourceUrl: "https://example.com/the-continuum",
    sourceSite: "99.co",
    agentName: "Sarah Lim",
    agentPhone: "+6587654321",
    status: "new",
    notes: "Strong family layout with generous kitchen."
  },
  {
    id: "3",
    listingId: "L-003",
    projectName: "Grand Dunman",
    address: "Dunman Road",
    district: "D15",
    price: 2860000,
    sizeSqft: 1066,
    psf: 2683,
    bedrooms: 3,
    bathrooms: 2,
    tenure: "99-year",
    topYear: 2028,
    mrtStation: "Dakota",
    mrtWalkMins: 3,
    ipsDriveMins: 14,
    sourceUrl: "https://example.com/grand-dunman",
    sourceSite: "EdgeProp",
    agentName: "John Tan",
    agentPhone: "+6591234567",
    status: "viewed",
    notes: "Very efficient layout, stronger transport access."
  }
];

export const sampleAgents: Agent[] = [
  {
    id: "1",
    agentId: "A-001",
    agentName: "John Tan",
    phone: "+6591234567",
    agency: "PropNex",
    notes: "Fast replies and usually shares floor plans first.",
    contacted: true,
    listingCount: 2
  },
  {
    id: "2",
    agentId: "A-002",
    agentName: "Sarah Lim",
    phone: "+6587654321",
    agency: "Huttons",
    notes: "Helpful on caveats and launch incentives.",
    contacted: false,
    listingCount: 1
  }
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Tracked listings",
    value: "28",
    hint: "Across D10, D11 and D15 focus zones"
  },
  {
    label: "Shortlisted",
    value: "11",
    hint: "Best fit for budget and commute"
  },
  {
    label: "Viewed",
    value: "6",
    hint: "Physical or virtual walkthroughs done"
  },
  {
    label: "Average PSF",
    value: "$2,661",
    hint: "Based on current shortlist"
  }
];
