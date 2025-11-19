/**
 * Missing Timestamp Detector Utility
 *
 * Detects and analyzes missing timestamps in attendance records.
 * Provides severity assessment and expected time information.
 */

import type { MissingTimestamp, ShiftConfig } from '@/types/attendance';

/**
 * Timestamp detection result
 */
export interface TimestampDetectionResult {
  isPresent: boolean;
  value: string | null;
  expectedTime?: string;
  severity: 'low' | 'medium' | 'high';
  isMissing: boolean;
}

/**
 * Detect missing timestamps for a single attendance record
 *
 * @param checkInTime - Check-in timestamp (HH:MM:SS)
 * @param breakOutTime - Break-out timestamp or null/empty
 * @param breakInTime - Break-in timestamp or null/empty
 * @param checkOutTime - Check-out timestamp or null/empty
 * @param shiftConfig - Shift configuration with expected times
 * @returns Array of missing timestamp metadata
 */
export function detectMissingTimestamps(
  checkInTime: string | null,
  breakOutTime: string | null,
  breakInTime: string | null,
  checkOutTime: string | null,
  shiftConfig: ShiftConfig
): MissingTimestamp[] {
  const missing: MissingTimestamp[] = [];

  // Check-in is required, but we still handle it gracefully
  if (!checkInTime || checkInTime.trim() === '') {
    missing.push({
      field: 'checkIn',
      expectedTime: shiftConfig.shiftStart,
      severity: 'high'
    });
  }

  // Break-out (optional)
  if (!breakOutTime || breakOutTime.trim() === '') {
    missing.push({
      field: 'breakOut',
      expectedTime: shiftConfig.breakOutExpectedTime,
      severity: 'low' // Informational, less critical
    });
  }

  // Break-in (optional)
  if (!breakInTime || breakInTime.trim() === '') {
    missing.push({
      field: 'breakIn',
      expectedTime: shiftConfig.breakEndTime,
      severity: 'medium' // Affects compliance
    });
  }

  // Check-out (optional)
  if (!checkOutTime || checkOutTime.trim() === '') {
    missing.push({
      field: 'checkOut',
      expectedTime: shiftConfig.checkOutExpectedTime,
      severity: 'high' // Affects hours worked
    });
  }

  return missing;
}

/**
 * Analyze a single timestamp for presence and quality
 *
 * @param timestamp - Timestamp value or null/empty
 * @param expectedTime - Expected time from shift config
 * @param severity - Severity level if missing
 * @returns Timestamp detection result
 */
export function analyzeTimestamp(
  timestamp: string | null | undefined,
  expectedTime: string,
  severity: 'low' | 'medium' | 'high'
): TimestampDetectionResult {
  const isPresent = timestamp !== null && timestamp !== undefined && timestamp.trim() !== '';

  return {
    isPresent,
    value: isPresent ? timestamp : null,
    expectedTime,
    severity,
    isMissing: !isPresent
  };
}

/**
 * Get severity score for risk assessment
 *
 * @param severity - Severity level
 * @returns Numeric score (higher = more severe)
 */
export function getSeverityScore(severity: 'low' | 'medium' | 'high'): number {
  switch (severity) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    default: return 0;
  }
}

/**
 * Calculate overall missing timestamp risk score
 *
 * @param missingTimestamps - Array of missing timestamp metadata
 * @returns Risk score (0-10 scale)
 */
export function calculateRiskScore(missingTimestamps: MissingTimestamp[]): number {
  if (missingTimestamps.length === 0) return 0;

  const severityScores = missingTimestamps.map(mt => getSeverityScore(mt.severity));
  const totalScore = severityScores.reduce((sum, score) => sum + score, 0);

  // Normalize to 0-10 scale (max possible score is 3 for check-out + 2 for break-in + 1 for break-out)
  const maxScore = 6; // All critical fields missing
  return Math.min(Math.round((totalScore / maxScore) * 10), 10);
}

/**
 * Format missing timestamp for display
 *
 * @param missing - Missing timestamp metadata
 * @returns Human-readable string
 */
export function formatMissingTimestamp(missing: MissingTimestamp): string {
  const fieldName = missing.field.charAt(0).toUpperCase() + missing.field.slice(1)
    .replace(/([A-Z])/g, ' $1').trim();

  const expected = missing.expectedTime ? ` (expected: ${missing.expectedTime})` : '';
  const severity = missing.severity.toUpperCase();

  return `${fieldName}${expected} [${severity}]`;
}

/**
 * Get missing timestamp summary for HR review
 *
 * @param missingTimestamps - Array of missing timestamp metadata
 * @returns Summary string
 */
export function getMissingSummary(missingTimestamps: MissingTimestamp[]): string {
  if (missingTimestamps.length === 0) {
    return 'All timestamps present';
  }

  const critical = missingTimestamps.filter(mt => mt.severity === 'high').length;
  const medium = missingTimestamps.filter(mt => mt.severity === 'medium').length;
  const low = missingTimestamps.filter(mt => mt.severity === 'low').length;

  const parts = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (medium > 0) parts.push(`${medium} medium`);
  if (low > 0) parts.push(`${low} low`);

  return `${missingTimestamps.length} missing (${parts.join(', ')})`;
}

/**
 * Validate timestamp format
 *
 * @param timestamp - Timestamp string to validate
 * @returns True if format is valid HH:MM:SS
 */
export function isValidTimestampFormat(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') return false;

  // HH:MM:SS format validation
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
  return timeRegex.test(timestamp.trim());
}