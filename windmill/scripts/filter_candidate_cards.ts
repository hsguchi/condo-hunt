import type { CandidateCard, CandidateFilterResult } from "../shared/etl-types";
import { evaluateCandidateCard } from "../shared/propertyguru-criteria";

export async function main({
  cards = []
}: {
  cards?: CandidateCard[];
} = {}): Promise<CandidateFilterResult> {
  const accepted: CandidateCard[] = [];
  const review: CandidateCard[] = [];
  const rejected: CandidateFilterResult["rejected"] = [];

  for (const card of cards) {
    const evaluation = evaluateCandidateCard(card);

    if (evaluation.decision === "accept") {
      accepted.push(card);
      continue;
    }

    if (evaluation.decision === "review") {
      review.push(card);
      continue;
    }

    rejected.push({ card, evaluation });
  }

  return {
    accepted,
    review,
    rejected
  };
}
