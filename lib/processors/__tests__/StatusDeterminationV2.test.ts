/**
 * StatusDeterminationV2 Test Suite
 *
 * Tests for enhanced status determination with missing timestamp handling.
 * Covers all combinations of missing timestamps and quality classifications.
 */

import { determineShiftStatusV2 } from '../StatusDeterminationV2';
import type { ShiftConfig } from '@/types/attendance';

// Mock shift configuration for testing
const mockShiftConfig: ShiftConfig = {
  name: 'A',
  displayName: 'Morning',
  checkInStart: '05:00:00',
  checkInEnd: '06:35:00',
  shiftStart: '06:00:00',
  checkInOnTimeCutoff: '06:04:59',
  checkInLateThreshold: '06:05:00',
  checkOutStart: '13:30:00',
  checkOutEnd: '16:00:00',
  checkOutExpectedTime: '14:00:00',
  breakSearchStart: '09:50:00',
  breakSearchEnd: '10:35:00',
  breakOutCheckpoint: '10:00:00',
  breakOutExpectedTime: '10:00:00',
  midpoint: '10:15:00',
  minimumBreakGapMinutes: 5,
  breakEndTime: '10:30:00',
  breakInOnTimeCutoff: '10:34:59',
  breakInLateThreshold: '10:35:00',
};

describe('StatusDeterminationV2', () => {
  describe('Complete Records (100% completeness)', () => {
    test('should handle perfect on-time record', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        '10:00:00', // On time break-out
        '10:30:00', // On time break-in
        '14:00:00', // On time check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time');
      expect(result.completenessPercentage).toBe(100);
      expect(result.dataQuality).toBe('complete');
      expect(result.requiresReview).toBe(false);
      expect(result.missingTimestamps).toHaveLength(0);
    });

    test('should handle record with deviations but complete', () => {
      const result = determineShiftStatusV2(
        '06:05:00', // Late check-in
        '09:50:00', // Leave soon break-out
        '10:35:00', // Late break-in
        '13:30:00', // Leave soon check-out
        mockShiftConfig
      );

      expect(result.status).toBe('Late Check-in, Leave Soon Break Out, Late Break In, Leave Soon Check Out');
      expect(result.completenessPercentage).toBe(100);
      expect(result.dataQuality).toBe('complete');
      expect(result.requiresReview).toBe(false);
      expect(result.missingTimestamps).toHaveLength(0);
    });
  });

  describe('Partial Records (75% completeness)', () => {
    test('should handle missing check-out only', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        '10:00:00', // On time break-out
        '10:30:00', // On time break-in
        null,        // Missing check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Check Out]');
      expect(result.completenessPercentage).toBe(75);
      expect(result.dataQuality).toBe('partial');
      expect(result.requiresReview).toBe(true); // Requires review due to missing check-out
      expect(result.missingTimestamps).toHaveLength(1);
      expect(result.missingTimestamps[0]).toEqual({
        field: 'checkOut',
        expectedTime: '14:00:00',
        severity: 'high'
      });
    });

    test('should handle missing break-out only', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        null,        // Missing break-out
        '10:30:00', // On time break-in
        '14:00:00', // On time check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Break Out]');
      expect(result.completenessPercentage).toBe(75);
      expect(result.dataQuality).toBe('partial');
      expect(result.requiresReview).toBe(false); // No review needed for just break-out
      expect(result.missingTimestamps).toHaveLength(1);
      expect(result.missingTimestamps[0]).toEqual({
        field: 'breakOut',
        expectedTime: '10:00:00',
        severity: 'low'
      });
    });

    test('should handle missing break-in only', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        '10:00:00', // On time break-out
        null,        // Missing break-in
        '14:00:00', // On time check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Break In]');
      expect(result.completenessPercentage).toBe(75);
      expect(result.dataQuality).toBe('partial');
      expect(result.requiresReview).toBe(false); // No review needed for just break-in
      expect(result.missingTimestamps).toHaveLength(1);
      expect(result.missingTimestamps[0]).toEqual({
        field: 'breakIn',
        expectedTime: '10:30:00',
        severity: 'medium'
      });
    });
  });

  describe('Critical Records (50% and 25% completeness)', () => {
    test('should handle missing two timestamps (50% completeness)', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        null,        // Missing break-out
        null,        // Missing break-in
        '14:00:00', // On time check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Break Out, Break In]');
      expect(result.completenessPercentage).toBe(50);
      expect(result.dataQuality).toBe('critical');
      expect(result.requiresReview).toBe(true); // Review required for <75% completeness
      expect(result.missingTimestamps).toHaveLength(2);
    });

    test('should handle missing three timestamps (25% completeness)', () => {
      const result = determineShiftStatusV2(
        '06:00:00', // On time check-in
        null,        // Missing break-out
        null,        // Missing break-in
        null,        // Missing check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Break Out, Break In, Check Out]');
      expect(result.completenessPercentage).toBe(25);
      expect(result.dataQuality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.missingTimestamps).toHaveLength(3);
    });

    test('should handle missing check-in (invalid record)', () => {
      const result = determineShiftStatusV2(
        null,        // Missing check-in (critical)
        '10:00:00', // On time break-out
        '10:30:00', // On time break-in
        '14:00:00', // On time check-out
        mockShiftConfig
      );

      expect(result.status).toBe('INVALID - No Check-In');
      expect(result.completenessPercentage).toBe(0);
      expect(result.dataQuality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.missingTimestamps).toHaveLength(1);
      expect(result.missingTimestamps[0].field).toBe('checkIn');
    });
  });

  describe('Mixed Scenarios', () => {
    test('should handle deviations with missing timestamps', () => {
      const result = determineShiftStatusV2(
        '06:05:00', // Late check-in
        '10:00:00', // On time break-out
        null,        // Missing break-in
        null,        // Missing check-out
        mockShiftConfig
      );

      expect(result.status).toBe('Late Check-in [Missing: Break In, Check Out]');
      expect(result.completenessPercentage).toBe(50);
      expect(result.dataQuality).toBe('critical');
      expect(result.requiresReview).toBe(true);
      expect(result.missingTimestamps).toHaveLength(2);
    });

    test('should handle empty string as null', () => {
      const result = determineShiftStatusV2(
        '06:00:00',
        '10:00:00',
        '',          // Empty break-in (treated as missing)
        null,        // Missing check-out
        mockShiftConfig
      );

      expect(result.status).toBe('On Time [Missing: Break In, Check Out]');
      expect(result.completenessPercentage).toBe(50);
      expect(result.dataQuality).toBe('critical');
      expect(result.requiresReview).toBe(true);
    });
  });

  describe('Severity Classification', () => {
    test('should assign correct severities', () => {
      const result = determineShiftStatusV2(
        '06:00:00',
        null, // Missing break-out (low severity)
        null, // Missing break-in (medium severity)
        null, // Missing check-out (high severity)
        mockShiftConfig
      );

      const severities = result.missingTimestamps.map(mt => mt.severity);
      expect(severities).toContain('low');
      expect(severities).toContain('medium');
      expect(severities).toContain('high');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string values', () => {
      const result = determineShiftStatusV2(
        '06:00:00',
        '',           // Empty break-out
        '',           // Empty break-in
        '',           // Empty check-out
        mockShiftConfig
      );

      expect(result.missingTimestamps).toHaveLength(3);
      expect(result.completenessPercentage).toBe(25);
      expect(result.dataQuality).toBe('critical');
    });

    test('should handle whitespace-only values', () => {
      const result = determineShiftStatusV2(
        '06:00:00',
        '   ',        // Whitespace break-out
        null,         // Missing break-in
        '14:00:00',
        mockShiftConfig
      );

      expect(result.missingTimestamps).toHaveLength(1);
      expect(result.missingTimestamps[0].field).toBe('breakIn');
      expect(result.completenessPercentage).toBe(75);
    });
  });

  describe('Expected Time Assignment', () => {
    test('should include expected times from shift config', () => {
      const result = determineShiftStatusV2(
        '06:00:00',
        null, // Missing break-out
        null, // Missing break-in
        null, // Missing check-out
        mockShiftConfig
      );

      const missingBreakOut = result.missingTimestamps.find(mt => mt.field === 'breakOut');
      const missingBreakIn = result.missingTimestamps.find(mt => mt.field === 'breakIn');
      const missingCheckOut = result.missingTimestamps.find(mt => mt.field === 'checkOut');

      expect(missingBreakOut?.expectedTime).toBe('10:00:00');
      expect(missingBreakIn?.expectedTime).toBe('10:30:00');
      expect(missingCheckOut?.expectedTime).toBe('14:00:00');
    });
  });
});