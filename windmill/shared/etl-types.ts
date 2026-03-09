import type { Listing } from "../../types/models";

export type ListingDecision = "accept" | "review" | "reject";
export type RefreshReason = "new" | "shortlisted" | "stale" | "refresh";
export type ScrapeRunStatus = "running" | "completed" | "failed";

export interface ScrapeSource {
  id: string;
  sourceSite: string;
  sourceType: "search_page" | "manual_watchlist";
  entryUrl: string;
  enabled: boolean;
  refreshPriority: number;
  notes?: string;
}

export interface CandidateCard {
  sourceUrl: string;
  projectName?: string;
  price?: number;
  bedrooms?: number;
  sizeSqft?: number;
  district?: string;
  mrtWalkMins?: number;
  mrtDistanceMeters?: number;
  listedDate?: string;
}

export interface CriteriaEvaluation {
  decision: ListingDecision;
  matchedHardFilters: string[];
  rejectedBy: string[];
  notes: string[];
}

export interface ExistingListingSnapshot {
  sourceUrl: string;
  listingId?: string;
  lastImportedAt?: string | null;
  isActive: boolean;
  isShortlisted: boolean;
}

export interface QueueItem {
  sourceUrl: string;
  reason: RefreshReason;
  priority: number;
  isShortlisted: boolean;
  decision: Exclude<ListingDecision, "reject">;
  listingId?: string;
}

export interface QueueSkip {
  sourceUrl: string;
  reason: string;
}

export interface PlannedQueueResult {
  queue: QueueItem[];
  skipped: QueueSkip[];
}

export interface CandidateFilterResult {
  accepted: CandidateCard[];
  review: CandidateCard[];
  rejected: Array<{
    card: CandidateCard;
    evaluation: CriteriaEvaluation;
  }>;
}

export interface PropertyGuruDetailPayload {
  listingId?: string;
  project?: string;
  projectName?: string;
  address?: string;
  district?: string;
  price?: string | number;
  size?: string | number;
  sizeSqft?: string | number;
  psf?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  tenure?: string;
  topYear?: string | number;
  mrtStation?: string;
  mrtWalkMins?: string | number;
  ipsDriveMins?: string | number;
  agent?: string;
  agentName?: string;
  phone?: string;
  agentPhone?: string;
  notes?: string;
  floorLevel?: string;
  furnishing?: string;
  listedDate?: string;
  sourceUrl?: string;
  sourceSite?: string;
}

export interface NormalizedListingBundle {
  listing: Listing;
  fingerprint: string;
  decision: ListingDecision;
  matchedHardFilters: string[];
  preferenceMatches: string[];
  rejectedBy: string[];
  notes: string[];
}

export interface ScrapeRunSummary {
  runId: string;
  jobType: string;
  status: ScrapeRunStatus;
  startedAt: string;
  finishedAt?: string;
  sourceCount: number;
  candidateCount: number;
  queueCount: number;
  successCount: number;
  errorCount: number;
  notes?: string;
}
