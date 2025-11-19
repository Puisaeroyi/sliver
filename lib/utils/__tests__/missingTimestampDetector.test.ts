/**
 * MissingTimestampDetector Test Suite
 *
 * Tests for missing timestamp detection and analysis utilities.
 */

import {
  detectMissingTimestamps,
  analyzeTimestamp,
  getSeverityScore,
  calculateRiskScore,
  formatMissingTimestamp,
  getMissingSummary,
  isValidTimestampFormat
} from '../missingTimestampDetector';
import type { ShiftConfig } from '@/types/attendance';

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

describe('MissingTimestampDetector', () => {
  describe('detectMissingTimestamps', () => {
    test('should detect no missing timestamps', () => {
      const missing = detectMissingTimestamps(
        '06:00:00',
        '10:00:00',
        '10:30:00',
        '14:00:00',
        mockShiftConfig
      );

      expect(missing).toHaveLength(0);
    });

    test('should detect single missing timestamp', () => {
      const missing = detectMissingTimestamps(
        '06:00:00',
        '10:00:00',
        '10:30:00',
        null, // Missing check-out
        mockShiftConfig
      );

      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual({
        field: 'checkOut',
        expectedTime: '14:00:00',
        severity: 'high'
      });
    });

    test('should detect multiple missing timestamps', () => {
      const missing = detectMissingTimestamps(
        '06:00:00',
        null, // Missing break-out
        null, // Missing break-in
        null, // Missing check-out
        mockShiftConfig
      );

      expect(missing).toHaveLength(3);
      expect(missing.map(mt => mt.field)).toEqual(['breakOut', 'breakIn', 'checkOut']);
      expect(missing.map(mt => mt.severity)).toEqual(['low', 'medium', 'high']);
    });

    test('should detect missing check-in', () => {
      const missing = detectMissingTimestamps(
        null, // Missing check-in
        '10:00:00',
        '10:30:00',
        '14:00:00',
        mockShiftConfig
      );

      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual({
        field: 'checkIn',
        expectedTime: '06:00:00',
        severity: 'high'
      });
    });

    test('should treat empty string as missing', () => {
      const missing = detectMissingTimestamps(
        '06:00:00',
        '', // Empty break-out
        '10:30:00',
        '14:00:00',
        mockShiftConfig
      );

      expect(missing).toHaveLength(1);
      expect(missing[0].field).toBe('breakOut');
    });

    test('should treat whitespace as present', () => {
      const missing = detectMissingTimestamps(
        '06:00:00',
        '   ', // Whitespace break-out (treated as present for this test)
        '10:30:00',
        '14:00:00',
        mockShiftConfig
      );

      // Should not detect missing since whitespace after trim is not empty
      expect(missing).toHaveLength(0);
    });
  });

  describe('analyzeTimestamp', () => {
    test('should detect present timestamp', () => {
      const result = analyzeTimestamp('10:30:00', '10:00:00', 'medium');

      expect(result.isPresent).toBe(true);
      expect(result.value).toBe('10:30:00');
      expect(result.expectedTime).toBe('10:00:00');
      expect(result.severity).toBe('medium');
      expect(result.isMissing).toBe(false);
    });

    test('should detect missing timestamp (null)', () => {
      const result = analyzeTimestamp(null, '10:00:00', 'medium');

      expect(result.isPresent).toBe(false);
      expect(result.value).toBe(null);
      expect(result.expectedTime).toBe('10:00:00');
      expect(result.severity).toBe('medium');
      expect(result.isMissing).toBe(true);
    });

    test('should detect missing timestamp (undefined)', () => {
      const result = analyzeTimestamp(undefined, '10:00:00', 'medium');

      expect(result.isPresent).toBe(false);
      expect(result.isMissing).toBe(true);
    });

    test('should detect missing timestamp (empty string)', () => {
      const result = analyzeTimestamp('', '10:00:00', 'medium');

      expect(result.isPresent).toBe(false);
      expect(result.isMissing).toBe(true);
    });
  });

  describe('getSeverityScore', () => {
    test('should return correct severity scores', () => {
      expect(getSeverityScore('low')).toBe(1);
      expect(getSeverityScore('medium')).toBe(2);
      expect(getSeverityScore('high')).toBe(3);
    });
  });

  describe('calculateRiskScore', () => {
    test('should calculate 0 risk score for no missing timestamps', () => {
      const risk = calculateRiskScore([]);

      expect(risk).toBe(0);
    });

    test('should calculate risk score for single missing timestamp', () => {
      const missing = [{ field: 'checkOut', severity: 'high' as const, expectedTime: '14:00:00' }];
      const risk = calculateRiskScore(missing);

      expect(risk).toBe(5); // 3/6 * 10 = 5
    });

    test('should calculate maximum risk score for all missing', () => {
      const missing = [
        { field: 'checkOut', severity: 'high' as const, expectedTime: '14:00:00' },
        { field: 'breakIn', severity: 'medium' as const, expectedTime: '10:30:00' },
        { field: 'breakOut', severity: 'low' as const, expectedTime: '10:00:00' }
      ];
      const risk = calculateRiskScore(missing);

      expect(risk).toBe(10); // (3+2+1)/6 * 10 = 10
    });
  });

  describe('formatMissingTimestamp', () => {
    test('should format missing timestamp with expected time', () => {
      const missing = {
        field: 'checkOut',
        expectedTime: '14:00:00',
        severity: 'high' as const
      };

      const formatted = formatMissingTimestamp(missing);

      expect(formatted).toBe('Check Out (expected: 14:00:00) [HIGH]');
    });

    test('should format missing timestamp without expected time', () => {
      const missing = {
        field: 'breakOut',
        severity: 'low' as const
      };

      const formatted = formatMissingTimestamp(missing);

      expect(formatted).toBe('Break Out [LOW]');
    });

    test('should format camelCase field names', () => {
      const missing = {
        field: 'breakOut',
        expectedTime: '10:00:00',
        severity: 'low' as const
      };

      const formatted = formatMissingTimestamp(missing);

      expect(formatted).toBe('Break Out (expected: 10:00:00) [LOW]');
    });
  });

  describe('getMissingSummary', () => {
    test('should return complete summary for no missing', () => {
      const summary = getMissingSummary([]);

      expect(summary).toBe('All timestamps present');
    });

    test('should return summary with mixed severities', () => {
      const missing = [
        { field: 'checkOut', severity: 'high' as const, expectedTime: '14:00:00' },
        { field: 'breakIn', severity: 'medium' as const, expectedTime: '10:30:00' },
        { field: 'breakOut', severity: 'low' as const, expectedTime: '10:00:00' }
      ];

      const summary = getMissingSummary(missing);

      expect(summary).toBe('3 missing (1 critical, 1 medium, 1 low)');
    });

    test('should return summary for single severity', () => {
      const missing = [
        { field: 'breakOut', severity: 'low' as const, expectedTime: '10:00:00' },
        { field: 'breakIn', severity: 'low' as const, expectedTime: '10:30:00' }
      ];

      const summary = getMissingSummary(missing);

      expect(summary).toBe('2 missing (2 low)');
    });

    test('should return summary for critical only', () => {
      const missing = [
        { field: 'checkOut', severity: 'high' as const, expectedTime: '14:00:00' }
      ];

      const summary = getMissingSummary(missing);

      expect(summary).toBe('1 missing (1 critical)');
    });
  });

  describe('isValidTimestampFormat', () => {
    test('should validate correct HH:MM:SS format', () => {
      expect(isValidTimestampFormat('06:00:00')).toBe(true);
      expect(isValidTimestampFormat('23:59:59')).toBe(true);
      expect(isValidTimestampFormat('00:00:00')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(isValidTimestampFormat('6:00:00')).toBe(false); // Missing leading zero
      expect(isValidTimestampFormat('06:00')).toBe(false); // Missing seconds
      expect(isValidTimestampFormat('06:00:00:00')).toBe(false); // Extra components
      expect(isValidTimestampFormat('25:00:00')).toBe(false); // Invalid hour
      expect(isValidTimestampFormat('06:60:00')).toBe(false); // Invalid minute
      expect(isValidTimestampFormat('06:00:60')).toBe(false); // Invalid second
      expect(isValidTimestampFormat('')).toBe(false); // Empty string
      expect(isValidTimestampFormat('invalid')).toBe(false); // Invalid format
    });

    test('should handle null and undefined', () => {
      expect(isValidTimestampFormat(null)).toBe(false);
      expect(isValidTimestampFormat(undefined)).toBe(false);
    });

    test('should handle whitespace', () => {
      expect(isValidTimestampFormat(' 06:00:00 ')).toBe(true); // Trimmed
      expect(isValidTimestampFormat('\t06:00:00\n')).toBe(true); // Whitespace trimmed
    });
  });
});