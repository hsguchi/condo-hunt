export interface FirecrawlListingPayload {
  price?: string | number;
  size?: string | number;
  bedrooms?: string | number;
  address?: string;
  project?: string;
  agent?: string;
  phone?: string;
}

const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");

export function normalizePhone(phone?: string): string {
  if (!phone) {
    return "";
  }

  const digits = digitsOnly(phone);
  if (digits.startsWith("65") && digits.length === 10) {
    return `+${digits}`;
  }

  if (digits.length === 8) {
    return `+65${digits}`;
  }

  return phone.trim();
}

export function normalizeCurrency(value?: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(digitsOnly(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeNumber(value?: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

export function normalizeListingPayload(payload: FirecrawlListingPayload) {
  return {
    projectName: payload.project?.trim() ?? "",
    address: payload.address?.trim() ?? "",
    price: normalizeCurrency(payload.price),
    sizeSqft: normalizeNumber(payload.size),
    bedrooms: normalizeNumber(payload.bedrooms),
    agentName: payload.agent?.trim() ?? "",
    agentPhone: normalizePhone(payload.phone)
  };
}
