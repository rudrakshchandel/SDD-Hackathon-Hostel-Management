import { describe, it, expect } from 'vitest';
import { calculateShares } from '@/lib/electricity/split';

describe('calculateShares', () => {
  it('should return equal shares when days are equal', () => {
    const totalAmount = 100;
    const stayDays = [10, 10, 10, 10];
    const shares = calculateShares(totalAmount, stayDays);
    expect(shares).toEqual([25, 25, 25, 25]);
  });

  it('should handle rounding and apply delta to the last person', () => {
    const totalAmount = 100;
    const stayDays = [1, 1, 1]; // 33.33, 33.33, 33.34
    const shares = calculateShares(totalAmount, stayDays);
    expect(shares).toEqual([33.33, 33.33, 33.34]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('should return zeros if total days is 0', () => {
    const totalAmount = 100;
    const stayDays = [0, 0];
    const shares = calculateShares(totalAmount, stayDays);
    expect(shares).toEqual([0, 0]);
  });

  it('should proportion shares correctly based on days', () => {
    const totalAmount = 300;
    const stayDays = [10, 20];
    const shares = calculateShares(totalAmount, stayDays);
    expect(shares).toEqual([100, 200]);
  });

  it('should handle small amounts and many people gracefully', () => {
    const totalAmount = 1;
    const stayDays = [10, 10, 10];
    const shares = calculateShares(totalAmount, stayDays);
    // 1 / 3 = 0.33, 0.33. Last gets 1 - 0.66 = 0.34
    expect(shares).toEqual([0.33, 0.33, 0.34]);
  });
});
