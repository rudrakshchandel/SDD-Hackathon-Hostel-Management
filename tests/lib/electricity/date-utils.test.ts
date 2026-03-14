import { describe, it, expect } from 'vitest';
import { calculateOverlapDays } from '@/lib/electricity/date-utils';

describe('calculateOverlapDays', () => {
  it('should return 0 if there is no overlap', () => {
    const pStart = new Date('2024-01-01');
    const pEnd = new Date('2024-01-31');
    const sStart = new Date('2024-02-01');
    const sEnd = new Date('2024-02-28');
    expect(calculateOverlapDays(pStart, pEnd, sStart, sEnd)).toBe(0);
  });

  it('should return full period if stay covers entire period', () => {
    const pStart = new Date('2024-01-01');
    const pEnd = new Date('2024-01-31');
    const sStart = new Date('2023-12-01');
    const sEnd = new Date('2024-12-31');
    // Jan 1 to Jan 31 is 31 days
    expect(calculateOverlapDays(pStart, pEnd, sStart, sEnd)).toBe(31);
  });

  it('should return correct days for partial overlap at start', () => {
    const pStart = new Date('2024-01-01');
    const pEnd = new Date('2024-01-31');
    const sStart = new Date('2023-12-15');
    const sEnd = new Date('2024-01-10');
    // Jan 1 to Jan 10 is 10 days
    expect(calculateOverlapDays(pStart, pEnd, sStart, sEnd)).toBe(10);
  });

  it('should return correct days for partial overlap at end', () => {
    const pStart = new Date('2024-01-01');
    const pEnd = new Date('2024-01-31');
    const sStart = new Date('2024-01-20');
    const sEnd = new Date('2024-02-15');
    // Jan 20 to Jan 31 is 12 days
    expect(calculateOverlapDays(pStart, pEnd, sStart, sEnd)).toBe(12);
  });

  it('should return correct days for stay entirely within period', () => {
    const pStart = new Date('2024-01-01');
    const pEnd = new Date('2024-01-31');
    const sStart = new Date('2024-01-10');
    const sEnd = new Date('2024-01-20');
    // Jan 10 to Jan 20 is 11 days
    expect(calculateOverlapDays(pStart, pEnd, sStart, sEnd)).toBe(11);
  });
});
