import { describe, it, expect } from 'vitest';
import { evaluateReading, calculatePeriodUnits, recomputeReadingChain } from '@/lib/electricity/readings';

describe('readings logic', () => {
  describe('evaluateReading', () => {
    it('should calculate units for valid readings', () => {
      const result = evaluateReading(200, 150);
      expect(result).toEqual({ status: 'VALID', units: 50 });
    });

    it('should return RESET_REVIEW if reading is lower than previous', () => {
      const result = evaluateReading(100, 150);
      expect(result).toEqual({ status: 'RESET_REVIEW', units: null });
    });
  });

  describe('calculatePeriodUnits', () => {
    it('should calculate units correctly with valid baseline', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');
      const readings = [
        { readingDate: new Date('2023-12-31'), currentReading: 100, status: 'VALID' as const },
        { readingDate: new Date('2024-01-15'), currentReading: 150, status: 'VALID' as const },
        { readingDate: new Date('2024-01-31'), currentReading: 200, status: 'VALID' as const }
      ];
      expect(calculatePeriodUnits(readings, periodStart, periodEnd)).toBe(100);
    });

    it('should return 0 if no reading exists before period start', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');
      const readings = [
        { readingDate: new Date('2024-01-01'), currentReading: 100, status: 'VALID' as const }
      ];
      expect(calculatePeriodUnits(readings, periodStart, periodEnd)).toBe(0);
    });
  });

  describe('recomputeReadingChain', () => {
    it('should recompute units and status for a chain of readings', () => {
      const input = {
        previousReading: 100,
        readings: [
          { id: 'r1', readingDate: new Date('2024-01-01'), currentReading: 150 },
          { id: 'r2', readingDate: new Date('2024-01-02'), currentReading: 120 }, // Reset
          { id: 'r3', readingDate: new Date('2024-01-03'), currentReading: 200 }
        ],
        correctedId: 'r3'
      };
      const result = recomputeReadingChain(input);
      expect(result[0]).toMatchObject({ id: 'r1', unitsConsumed: 50, status: 'VALID' });
      expect(result[1]).toMatchObject({ id: 'r2', unitsConsumed: 0, status: 'RESET_REVIEW' });
      // Logic check: r2 (120) < r1 (150) so baseline remains 150 for r3.
      // r3 (200) - baseline (150) = 50 units.
      expect(result[2]).toMatchObject({ id: 'r3', unitsConsumed: 50, status: 'CORRECTED' });
    });
  });
});
