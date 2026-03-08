import type { Listing } from "@/types/models";

export async function createListing(listing: Partial<Listing>) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Missing Airtable configuration");
  }

  return listing;
}

export async function getListings(): Promise<Listing[]> {
  return [];
}

export async function createAgentIfMissing(agentName: string, phone: string) {
  return {
    agentName,
    phone
  };
}
