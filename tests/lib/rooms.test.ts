import { describe, it, expect } from 'vitest';
import {
  parseBooleanFilter,
  toNumberOrUndefined,
  roomHasAnyVacantBed,
  getRoomCounts
} from '@/lib/rooms';
import { BedStatus, Gender, ResidentStatus, SharingType } from '@prisma/client';

describe('lib/rooms', () => {
  describe('parseBooleanFilter', () => {
    it('returns true for "true"', () => {
      expect(parseBooleanFilter('true')).toBe(true);
    });

    it('returns false for "false"', () => {
      expect(parseBooleanFilter('false')).toBe(false);
    });

    it('returns undefined for null, empty string, "any", "1", "yes", or invalid values', () => {
      expect(parseBooleanFilter(null)).toBeUndefined();
      expect(parseBooleanFilter('')).toBeUndefined();
      expect(parseBooleanFilter('any')).toBeUndefined();
      expect(parseBooleanFilter('1')).toBeUndefined();
      expect(parseBooleanFilter('yes')).toBeUndefined();
      expect(parseBooleanFilter('invalid')).toBeUndefined();
    });
  });

  describe('toNumberOrUndefined', () => {
    it('returns undefined for null or empty string', () => {
      expect(toNumberOrUndefined(null)).toBeUndefined();
      expect(toNumberOrUndefined('')).toBeUndefined();
    });

    it('returns parsed number for valid number string', () => {
      expect(toNumberOrUndefined('100')).toBe(100);
      expect(toNumberOrUndefined('0')).toBe(0);
      expect(toNumberOrUndefined('-50')).toBe(-50);
    });

    it('returns undefined for invalid number string', () => {
      expect(toNumberOrUndefined('abc')).toBeUndefined();
    });
  });

  describe('room occupancy logic', () => {
    // Helper to create a mock room with given beds
    const createMockRoom = (beds: Array<{ status: string; allocations?: any[] }>) => ({
      id: "room-1",
      roomNumber: "101",
      sharingType: SharingType.DOUBLE,
      status: "ACTIVE",
      genderRestriction: "ANY" as any,
      basePrice: null,
      attributes: null,
      floor: {
        id: "floor-1",
        floorNumber: 1,
        label: "Floor 1"
      },
      electricityMeter: null,
      beds: beds.map((b, i) => ({
        id: `bed-${i}`,
        bedNumber: `A${i}`,
        status: b.status as any,
        allocations: b.allocations || []
      }))
    });

    describe('roomHasAnyVacantBed', () => {
      it('returns true if any bed is AVAILABLE and has no allocations', () => {
        const room = createMockRoom([
          { status: 'OCCUPIED', allocations: [{ id: 'alloc-1' }] },
          { status: 'AVAILABLE', allocations: [] }
        ]);
        expect(roomHasAnyVacantBed(room)).toBe(true);
      });

      it('returns false if no bed is AVAILABLE', () => {
        const room = createMockRoom([
          { status: 'OCCUPIED', allocations: [{ id: 'alloc-1' }] },
          { status: 'MAINTENANCE', allocations: [] }
        ]);
        expect(roomHasAnyVacantBed(room)).toBe(false);
      });

      it('returns false if room has no beds', () => {
        const room = createMockRoom([]);
        expect(roomHasAnyVacantBed(room)).toBe(false);
      });
    });

    describe('getRoomCounts', () => {
      it('correctly counts total, occupied, and vacant beds', () => {
        const room = createMockRoom([
          { status: 'OCCUPIED', allocations: [{ id: 'alloc-1' }] },
          { status: 'AVAILABLE', allocations: [{ id: 'alloc-2' }] }, // Available but allocated? (Rare but status isn't the only check)
          { status: 'AVAILABLE', allocations: [] },
          { status: 'MAINTENANCE', allocations: [] }
        ]);
        
        const counts = getRoomCounts(room);
        expect(counts).toEqual({
          totalBeds: 4,
          occupiedBeds: 2,
          vacantBeds: 1
        });
      });

      it('returns zeros for room with no beds', () => {
        const room = createMockRoom([]);
        const counts = getRoomCounts(room);
        expect(counts).toEqual({
          totalBeds: 0,
          occupiedBeds: 0,
          vacantBeds: 0
        });
      });
    });
  });
});
