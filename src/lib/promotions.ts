export const PROMO_CODES = {
  SW10: 10,
} as const;

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

export function getPromoPercentage(code: string) {
  const normalized = normalizePromoCode(code);
  return PROMO_CODES[normalized as keyof typeof PROMO_CODES] ?? 0;
}

export function calculatePromoDiscount(amount: number, percentage: number) {
  if (!Number.isFinite(amount) || amount <= 0 || percentage <= 0) return 0;
  return Math.round((amount * percentage) / 100);
}

export function applyPromoCode(amount: number, code: string) {
  const normalizedCode = normalizePromoCode(code);
  const percentage = getPromoPercentage(normalizedCode);
  const discount = calculatePromoDiscount(amount, percentage);

  return {
    code: normalizedCode,
    percentage,
    discount,
    total: Math.max(0, amount - discount),
  };
}
