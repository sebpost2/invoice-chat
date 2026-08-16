// Vendor-name substring -> spending category. Heuristic, not authoritative —
// unmatched vendors fall into "other". Keys are matched case-insensitively
// against the full vendorName.
const VENDOR_CATEGORIES: Record<string, string> = {
  TOTTUS: "groceries",
  WONG: "groceries",
  TAMBO: "groceries",
  "PARDOS CHICKEN": "dining",
  BEMBOS: "dining",
  "LA LUCHA": "dining",
  SODIMAC: "home",
  INKAFARMA: "health",
  "SAGA FALABELLA": "shopping",
  FALABELLA: "shopping",
};

export function categorize(vendorName: string | null): string {
  if (!vendorName) return "other";
  const upper = vendorName.toUpperCase();
  for (const [key, category] of Object.entries(VENDOR_CATEGORIES)) {
    if (upper.includes(key)) return category;
  }
  return "other";
}
