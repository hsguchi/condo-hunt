import type {
  CandidateCard,
  ExistingListingSnapshot,
  PlannedQueueResult,
  QueueItem
} from "../shared/etl-types";
import { evaluateCandidateCard } from "../shared/propertyguru-criteria";

function daysSince(timestamp?: string | null) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  const then = new Date(timestamp).getTime();

  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = Date.now() - then;
  return diffMs / (1000 * 60 * 60 * 24);
}

function createQueueItem(
  card: CandidateCard,
  existing: ExistingListingSnapshot | undefined,
  reason: QueueItem["reason"],
  priority: number,
  decision: QueueItem["decision"]
): QueueItem {
  return {
    sourceUrl: card.sourceUrl,
    reason,
    priority,
    isShortlisted: existing?.isShortlisted ?? false,
    decision,
    listingId: existing?.listingId
  };
}

export async function main({
  candidateCards = [],
  existingListings = [],
  maxDetailScrapes = 10,
  matchedRefreshDays = 3,
  shortlistedRefreshDays = 1,
  lowPriorityRefreshDays = 7,
  allowReview = false
}: {
  candidateCards?: CandidateCard[];
  existingListings?: ExistingListingSnapshot[];
  maxDetailScrapes?: number;
  matchedRefreshDays?: number;
  shortlistedRefreshDays?: number;
  lowPriorityRefreshDays?: number;
  allowReview?: boolean;
} = {}): Promise<PlannedQueueResult> {
  const existingByUrl = new Map(existingListings.map((listing) => [listing.sourceUrl, listing]));
  const queue: QueueItem[] = [];
  const skipped: PlannedQueueResult["skipped"] = [];

  for (const card of candidateCards) {
    const existing = existingByUrl.get(card.sourceUrl);
    const evaluation = evaluateCandidateCard(card);

    if (evaluation.decision === "reject") {
      skipped.push({
        sourceUrl: card.sourceUrl,
        reason: `hard_reject:${evaluation.rejectedBy.join(",") || "unknown"}`
      });
      continue;
    }

    if (evaluation.decision === "review" && !allowReview && !existing?.isShortlisted) {
      skipped.push({
        sourceUrl: card.sourceUrl,
        reason: "review_only_requires_override"
      });
      continue;
    }

    if (!existing) {
      queue.push(createQueueItem(card, existing, "new", 100, evaluation.decision));
      continue;
    }

    const ageInDays = daysSince(existing.lastImportedAt);

    if (existing.isShortlisted && ageInDays >= shortlistedRefreshDays) {
      queue.push(createQueueItem(card, existing, "shortlisted", 90, evaluation.decision));
      continue;
    }

    if (!existing.isActive) {
      skipped.push({
        sourceUrl: card.sourceUrl,
        reason: "inactive_listing"
      });
      continue;
    }

    if (evaluation.decision === "accept" && ageInDays >= matchedRefreshDays) {
      queue.push(createQueueItem(card, existing, "refresh", 70, evaluation.decision));
      continue;
    }

    if (evaluation.decision === "review" && ageInDays >= lowPriorityRefreshDays) {
      queue.push(createQueueItem(card, existing, "stale", 40, evaluation.decision));
      continue;
    }

    skipped.push({
      sourceUrl: card.sourceUrl,
      reason: "fresh_enough"
    });
  }

  queue.sort((left, right) => right.priority - left.priority || left.sourceUrl.localeCompare(right.sourceUrl));

  return {
    queue: queue.slice(0, Math.max(maxDetailScrapes, 0)),
    skipped
  };
}
