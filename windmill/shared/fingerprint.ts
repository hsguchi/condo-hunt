import type { Listing } from "../../types/models";

export function buildListingFingerprint(listing: Listing) {
  return JSON.stringify({
    listingId: listing.listingId,
    projectName: listing.projectName,
    address: listing.address,
    district: listing.district,
    price: listing.price,
    sizeSqft: listing.sizeSqft,
    psf: listing.psf,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    tenure: listing.tenure,
    topYear: listing.topYear,
    mrtStation: listing.mrtStation,
    mrtWalkMins: listing.mrtWalkMins,
    ipsDriveMins: listing.ipsDriveMins,
    sourceUrl: listing.sourceUrl,
    sourceSite: listing.sourceSite,
    agentName: listing.agentName,
    agentPhone: listing.agentPhone,
    status: listing.status,
    notes: listing.notes
  });
}
