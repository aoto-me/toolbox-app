import { describe, expect, it } from 'vitest';
import { calcDiscount, calcTax, isValidDiscountRate, isValidPrice, parsePrice } from './price';

describe('parsePrice', () => {
  it('数値文字列をパースする', () => {
    expect(parsePrice('1000')).toBe(1000);
  });

  it('カンマ区切りの文字列をパースする', () => {
    expect(parsePrice('1,000')).toBe(1000);
    expect(parsePrice('1,000,000')).toBe(1000000);
  });

  it('小数を含む文字列をパースする', () => {
    expect(parsePrice('1234.5')).toBe(1234.5);
  });

  it('空文字列はNaNを返す', () => {
    expect(parsePrice('')).toBeNaN();
  });

  it('数値以外の文字列はNaNを返す', () => {
    expect(parsePrice('abc')).toBeNaN();
  });
});

describe('isValidPrice', () => {
  it('正の数はtrueを返す', () => {
    expect(isValidPrice(100)).toBe(true);
    expect(isValidPrice(0.5)).toBe(true);
  });

  it('0はfalseを返す', () => {
    expect(isValidPrice(0)).toBe(false);
  });

  it('負の数はfalseを返す', () => {
    expect(isValidPrice(-100)).toBe(false);
  });

  it('NaNはfalseを返す', () => {
    expect(isValidPrice(NaN)).toBe(false);
  });
});

describe('isValidDiscountRate', () => {
  it('0より大きく100未満の値はtrueを返す', () => {
    expect(isValidDiscountRate(10)).toBe(true);
    expect(isValidDiscountRate(50)).toBe(true);
    expect(isValidDiscountRate(99.9)).toBe(true);
  });

  it('0はfalseを返す', () => {
    expect(isValidDiscountRate(0)).toBe(false);
  });

  it('100はfalseを返す', () => {
    expect(isValidDiscountRate(100)).toBe(false);
  });

  it('100を超える値はfalseを返す', () => {
    expect(isValidDiscountRate(150)).toBe(false);
  });

  it('負の値はfalseを返す', () => {
    expect(isValidDiscountRate(-10)).toBe(false);
  });

  it('NaNはfalseを返す', () => {
    expect(isValidDiscountRate(NaN)).toBe(false);
  });
});

describe('calcTax', () => {
  it('8%の税込み価格と税額を計算する', () => {
    expect(calcTax(1000, 8)).toEqual({ tax: 80, taxed: 1080 });
  });

  it('10%の税込み価格と税額を計算する', () => {
    expect(calcTax(1000, 10)).toEqual({ tax: 100, taxed: 1100 });
  });

  it('端数を四捨五入する', () => {
    expect(calcTax(999, 8)).toEqual({ tax: 80, taxed: 1079 });
    expect(calcTax(101, 10)).toEqual({ tax: 10, taxed: 111 });
  });

  it('小数の金額でも正しく計算する', () => {
    expect(calcTax(1234.5, 10)).toEqual({ tax: 123, taxed: 1358 });
  });
});

describe('calcDiscount', () => {
  it('割引後金額と割引額を計算する', () => {
    expect(calcDiscount(1000, 20)).toEqual({ discounted: 800, saving: 200 });
  });

  it('50%割引を正しく計算する', () => {
    expect(calcDiscount(1000, 50)).toEqual({ discounted: 500, saving: 500 });
  });

  it('端数を四捨五入する', () => {
    expect(calcDiscount(999, 15)).toEqual({ discounted: 849, saving: 150 });
  });

  it('小さい割引率でも正しく計算する', () => {
    expect(calcDiscount(10000, 3)).toEqual({ discounted: 9700, saving: 300 });
  });
});
