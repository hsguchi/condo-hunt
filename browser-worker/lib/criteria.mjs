export const DEFAULT_CRITERIA_PROFILE = {
  id: "default-condo-mvp",
  name: "Default Condo MVP",
  sourceSite: "propertyguru.com.sg",
  maxPriceSgd: 1_500_000,
  minBedrooms: 2,
  minSqft: 900,
  districts: ["D5", "D10", "D21"],
  maxMrtDistanceM: 500,
  maxMrtWalkMins: 5,
  maxDriveMinutesToIps: 15,
  requireCompleted: false,
  allowedTenures: ["freehold", "99-year"],
  preferredMrtStations: ["buona vista", "dover", "clementi"]
};

function normalizeDistrict(value) {
  if (!value) {
    return "";
  }

  const token = String(value).trim().toUpperCase();
  const match = token.match(/(?:D|DISTRICT\s*)(\d{1,2})/i);

  if (!match) {
    return token;
  }

  return `D${Number.parseInt(match[1], 10)}`;
}

function normalizeStation(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function extractTenureYears(value) {
  if (!value) {
    return null;
  }

  const match = String(value).trim().toLowerCase().match(/(\d{2,4})\s*-\s*year|(\d{2,4})\s*year|(\d{2,4})\s*yr/);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function matchesAllowedTenure(tenure, allowedTenures) {
  const normalizedTenure = String(tenure ?? "").trim().toLowerCase();

  if (!normalizedTenure) {
    return true;
  }

  if (normalizedTenure.includes("freehold")) {
    return allowedTenures.some((entry) => String(entry).trim().toLowerCase().includes("freehold"));
  }

  const tenureYears = extractTenureYears(normalizedTenure);

  if (tenureYears !== null) {
    for (const allowed of allowedTenures) {
      const allowedYears = extractTenureYears(allowed);

      if (allowedYears !== null && tenureYears >= allowedYears) {
        return true;
      }
    }
  }

  return allowedTenures.includes(normalizedTenure);
}

function checkNumber(value, predicate) {
  return typeof value === "number" && Number.isFinite(value) ? predicate(value) : null;
}

export function mergeCriteriaProfile(profile) {
  return {
    ...DEFAULT_CRITERIA_PROFILE,
    ...profile,
    districts:
      Array.isArray(profile?.districts) && profile.districts.length > 0
        ? profile.districts.map(normalizeDistrict).filter(Boolean)
        : DEFAULT_CRITERIA_PROFILE.districts,
    allowedTenures:
      Array.isArray(profile?.allowedTenures) && profile.allowedTenures.length > 0
        ? profile.allowedTenures.map((tenure) => String(tenure).trim().toLowerCase()).filter(Boolean)
        : DEFAULT_CRITERIA_PROFILE.allowedTenures,
    preferredMrtStations:
      Array.isArray(profile?.preferredMrtStations) && profile.preferredMrtStations.length > 0
        ? profile.preferredMrtStations.map(normalizeStation).filter(Boolean)
        : DEFAULT_CRITERIA_PROFILE.preferredMrtStations
  };
}

export function evaluateListingAgainstProfile(listing, profile, options = {}) {
  const mergedProfile = mergeCriteriaProfile(profile);
  const allowMissing = options.allowMissing === true;
  const failures = [];
  const requiredMissing = [];
  const informationalMissing = [];
  const reviewReasons = [];

  const sourceSite = typeof listing.sourceSite === "string" ? listing.sourceSite.toLowerCase() : "";
  if (sourceSite && sourceSite !== mergedProfile.sourceSite) {
    failures.push("source_site");
  }

  const priceResult = checkNumber(listing.price, (value) => value <= mergedProfile.maxPriceSgd);
  if (priceResult === false) {
    failures.push("price");
  } else if (priceResult === null) {
    requiredMissing.push("price");
  }

  const bedroomResult = checkNumber(listing.bedrooms, (value) => value >= mergedProfile.minBedrooms);
  if (bedroomResult === false) {
    failures.push("bedrooms");
  } else if (bedroomResult === null) {
    requiredMissing.push("bedrooms");
  }

  const sizeResult = checkNumber(listing.sizeSqft, (value) => value >= mergedProfile.minSqft);
  if (sizeResult === false) {
    failures.push("size_sqft");
  } else if (sizeResult === null) {
    requiredMissing.push("size_sqft");
  }

  const district = normalizeDistrict(listing.district);
  if (district) {
    if (!mergedProfile.districts.includes(district)) {
      reviewReasons.push("district");
    }
  } else {
    informationalMissing.push("district");
  }

  if (typeof listing.mrtWalkMins === "number" && Number.isFinite(listing.mrtWalkMins)) {
    if (listing.mrtWalkMins > mergedProfile.maxMrtWalkMins) {
      reviewReasons.push("mrt_walk_mins");
    }
  } else if (typeof listing.mrtDistanceM === "number" && Number.isFinite(listing.mrtDistanceM)) {
    if (listing.mrtDistanceM > mergedProfile.maxMrtDistanceM) {
      reviewReasons.push("mrt_distance_m");
    }
  } else {
    informationalMissing.push("mrt_accessibility");
  }

  if (
    typeof listing.ipsDriveMins === "number" &&
    Number.isFinite(listing.ipsDriveMins) &&
    listing.ipsDriveMins > mergedProfile.maxDriveMinutesToIps
  ) {
    reviewReasons.push("ips_drive_mins");
  }

  if (mergedProfile.requireCompleted && typeof listing.topYear === "number" && listing.topYear > 0) {
    const currentYear = new Date().getFullYear();
    if (listing.topYear > currentYear) {
      reviewReasons.push("completion_status");
    }
  }

  if (mergedProfile.allowedTenures.length > 0 && listing.tenure) {
    const tenure = String(listing.tenure).trim().toLowerCase();
    if (!matchesAllowedTenure(tenure, mergedProfile.allowedTenures)) {
      reviewReasons.push("tenure");
    }
  }

  const preferredStation = normalizeStation(listing.mrtStation);
  const preferenceMatches = [];
  if (
    preferredStation &&
    mergedProfile.preferredMrtStations.some((station) => preferredStation.includes(station))
  ) {
    preferenceMatches.push(`preferred_mrt:${preferredStation}`);
  }

  let decision = "accept";

  if (failures.length > 0) {
    decision = "reject";
  } else if (requiredMissing.length > 0) {
    decision = allowMissing ? "review" : "reject";
  } else if (informationalMissing.length > 0 || reviewReasons.length > 0) {
    decision = "review";
  }

  return {
    decision,
    failures,
    missing: [...requiredMissing, ...informationalMissing],
    requiredMissing,
    informationalMissing,
    reviewReasons,
    preferenceMatches,
    profile: mergedProfile
  };
}
