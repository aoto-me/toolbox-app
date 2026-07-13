'use client';

import clsx from 'clsx';
import { useState } from 'react';
import {
  calcDiscount,
  calcTax,
  isValidDiscountRate,
  isValidPrice,
  parsePrice,
  TAX_RATES,
} from '@/lib/price';
import styles from './index.module.scss';

type Mode = 'discount' | 'tax';

export default function PriceCalculator() {
  const [mode, setMode] = useState<Mode>('tax');
  const [input, setInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');

  const base = parsePrice(input);
  const discountRate = parseFloat(discountInput);
  const isValidBase = isValidPrice(base);
  const isValidDiscount = isValidDiscountRate(discountRate);

  return (
    <div className={styles.priceCalc}>
      <div className={styles.priceCalc__tabs}>
        <button
          className={clsx(styles.priceCalc__tab, {
            [styles['priceCalc__tab--active']]: mode === 'tax',
          })}
          onClick={() => {
            setMode('tax');
          }}
        >
          税込み価格
        </button>
        <button
          className={clsx(styles.priceCalc__tab, {
            [styles['priceCalc__tab--active']]: mode === 'discount',
          })}
          onClick={() => {
            setMode('discount');
          }}
        >
          割引価格
        </button>
      </div>

      <div className={styles.priceCalc__inputRow}>
        <input
          className={styles.priceCalc__input}
          inputMode="numeric"
          onChange={(e) => {
            setInput(e.target.value);
          }}
          placeholder="元金額を入力"
          type="text"
          value={input}
        />
        <span className={styles.priceCalc__unit}>円</span>
      </div>

      {mode === 'discount' && (
        <div className={styles.priceCalc__inputRow}>
          <input
            className={styles.priceCalc__input}
            inputMode="numeric"
            onChange={(e) => {
              setDiscountInput(e.target.value);
            }}
            placeholder="割引率を入力"
            type="text"
            value={discountInput}
          />
          <span className={styles.priceCalc__unit}>%</span>
        </div>
      )}

      {isValidBase && mode === 'tax' && (
        <div className={styles.priceCalc__table}>
          {TAX_RATES.map((rate) => {
            const { tax, taxed } = calcTax(base, rate);
            return (
              <div className={styles.priceCalc__row} key={rate}>
                <span className={styles.priceCalc__label}>消費税 {rate}%</span>
                <span className={styles.priceCalc__price}>
                  {taxed.toLocaleString()} 円
                  <span className={styles.priceCalc__sub}>（税 {tax.toLocaleString()} 円）</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isValidBase && isValidDiscount && mode === 'discount' && (
        <div className={styles.priceCalc__table}>
          {(() => {
            const { discounted, saving } = calcDiscount(base, discountRate);
            return (
              <div className={styles.priceCalc__row}>
                <span className={styles.priceCalc__label}>{discountRate}% OFF</span>
                <span className={styles.priceCalc__price}>
                  {discounted.toLocaleString()} 円
                  <span className={styles.priceCalc__sub}>（-{saving.toLocaleString()} 円）</span>
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
