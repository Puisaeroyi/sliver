/**
 * CompletenessCalculator Test Suite
 *
 * Tests for completeness calculation utilities and quality classification logic.
 */

import {
  calculateCompleteness,
  calculateCompletenessFromMissing,
  formatCompleteness,
  getQualityColor,
  getQualityDescription,
  determineQuality,
  requiresReviewFlag
} from '../completenessCalculator';
import type { MissingTimestamp } from '@/types/attendance';

describe('CompletenessCalculator', () => {
  describe('calculateCompleteness', () => {
    test('should calculate 100% completeness for complete record', () => {
      const result = calculateCompleteness(true, true, true, true);

      expect(result.percentage).toBe(100);
      expect(result.quality).toBe('complete');
      expect(result.requiresReview).toBe(false);
      expect(result.presentCount).toBe(4);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual([]);
    });

    test('should calculate 75% completeness for one missing timestamp', () => {
      const result = calculateCompleteness(true, true, true, false);

      expect(result.percentage).toBe(75);
      expect(result.quality).toBe('partial');
      expect(result.requiresReview).toBe(true); // Check-out missing
      expect(result.presentCount).toBe(3);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual(['checkOut']);
    });

    test('should calculate 50% completeness for two missing timestamps', () => {
      const result = calculateCompleteness(true, false, true, false);

      expect(result.percentage).toBe(50);
      expect(result.quality).toBe('critical');
      expect(result.requiresReview).toBe(true); // <75% completeness
      expect(result.presentCount).toBe(2);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual(['breakOut', 'checkOut']);
    });

    test('should calculate 25% completeness for three missing timestamps', () => {
      const result = calculateCompleteness(true, false, false, false);

      expect(result.percentage).toBe(25);
      expect(result.quality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.presentCount).toBe(1);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual(['breakOut', 'breakIn', 'checkOut']);
    });

    test('should handle no timestamps present', () => {
      const result = calculateCompleteness(false, false, false, false);

      expect(result.percentage).toBe(0);
      expect(result.quality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.presentCount).toBe(0);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual(['checkIn', 'breakOut', 'breakIn', 'checkOut']);
    });
  });

  describe('calculateCompletenessFromMissing', () => {
    const missingTimestamps: MissingTimestamp[] = [
      { field: 'breakOut', severity: 'low' },
      { field: 'checkOut', severity: 'high' }
    ];

    test('should calculate completeness from missing timestamps', () => {
      const result = calculateCompletenessFromMissing(missingTimestamps, true);

      expect(result.percentage).toBe(50); // 2 missing out of 4
      expect(result.quality).toBe('critical');
      expect(result.requiresReview).toBe(true); // <75% completeness
      expect(result.presentCount).toBe(2);
      expect(result.totalCount).toBe(4);
      expect(result.missingFields).toEqual(['breakOut', 'checkOut']);
    });

    test('should handle no missing timestamps', () => {
      const result = calculateCompletenessFromMissing([], true);

      expect(result.percentage).toBe(100);
      expect(result.quality).toBe('complete');
      expect(result.requiresReview).toBe(false);
      expect(result.missingFields).toEqual([]);
    });

    test('should handle missing check-in (invalid)', () => {
      const withMissingCheckIn: MissingTimestamp[] = [
        { field: 'checkIn', severity: 'high' }
      ];

      const result = calculateCompletenessFromMissing(withMissingCheckIn, false);

      expect(result.percentage).toBe(0);
      expect(result.quality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.missingFields).toEqual(['checkIn']);
    });

    test('should require review if check-out is missing', () => {
      const result = calculateCompletenessFromMissing(missingTimestamps, true);

      expect(result.requiresReview).toBe(true); // check-out is missing
    });

    test('should not require review if only non-critical fields are missing at 75%', () => {
      const onlyBreakOut: MissingTimestamp[] = [
        { field: 'breakOut', severity: 'low' }
      ];

      const result = calculateCompletenessFromMissing(onlyBreakOut, true);

      expect(result.percentage).toBe(75);
      expect(result.requiresReview).toBe(false); // Only break-out missing at 75%
    });
  });

  describe('determineQuality', () => {
    test('should return complete for 100%', () => {
      expect(determineQuality(100)).toBe('complete');
    });

    test('should return partial for 75%', () => {
      expect(determineQuality(75)).toBe('partial');
    });

    test('should return partial for 80%', () => {
      expect(determineQuality(80)).toBe('partial');
    });

    test('should return critical for less than 75%', () => {
      expect(determineQuality(74)).toBe('critical');
      expect(determineQuality(50)).toBe('critical');
      expect(determineQuality(0)).toBe('critical');
    });
  });

  describe('requiresReviewFlag', () => {
    test('should require review if check-in is missing', () => {
      expect(requiresReviewFlag(false, true, 100)).toBe(true);
    });

    test('should require review if check-out is missing', () => {
      expect(requiresReviewFlag(true, false, 100)).toBe(true);
    });

    test('should require review for critical quality', () => {
      expect(requiresReviewFlag(true, true, 50)).toBe(true);
    });

    test('should not require review for complete record', () => {
      expect(requiresReviewFlag(true, true, 100)).toBe(false);
    });

    test('should not require review for partial record without check-out', () => {
      expect(requiresReviewFlag(true, true, 75)).toBe(false);
    });
  });

  describe('formatCompleteness', () => {
    test('should format completeness percentage', () => {
      expect(formatCompleteness(100)).toBe('100% Complete');
      expect(formatCompleteness(75)).toBe('75% Complete');
      expect(formatCompleteness(0)).toBe('0% Complete');
    });
  });

  describe('getQualityColor', () => {
    test('should return correct colors for quality levels', () => {
      expect(getQualityColor('complete')).toBe('#10b981'); // green
      expect(getQualityColor('partial')).toBe('#f59e0b'); // yellow
      expect(getQualityColor('critical')).toBe('#ef4444'); // red
    });
  });

  describe('getQualityDescription', () => {
    test('should return correct descriptions for quality levels', () => {
      expect(getQualityDescription('complete')).toBe('All timestamps present');
      expect(getQualityDescription('partial')).toBe('Some timestamps missing, review recommended');
      expect(getQualityDescription('critical')).toBe('Critical data missing, requires immediate review');
    });
  });
});