export const TAX_RATES = [8, 10];

export function calcDiscount(base: number, rate: number): { discounted: number; saving: number } {
  return {
    discounted: Math.round(base * (1 - rate / 100)),
    saving: Math.round((base * rate) / 100),
  };
}

export function calcTax(base: number, rate: number): { tax: number; taxed: number } {
  return {
    tax: Math.round((base * rate) / 100),
    taxed: Math.round(base * (1 + rate / 100)),
  };
}

export function isValidDiscountRate(rate: number): boolean {
  return !isNaN(rate) && rate > 0 && rate < 100;
}

export function isValidPrice(value: number): boolean {
  return !isNaN(value) && value > 0;
}

export function parsePrice(input: string): number {
  return parseFloat(input.replace(/,/g, ''));
}
