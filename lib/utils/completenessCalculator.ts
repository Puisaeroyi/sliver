/**
 * Completeness Calculator Utility
 *
 * Calculates data quality metrics and completeness percentages for attendance records.
 * Supports both v1 (simple) and v2 (detailed) calculations.
 */

import type { MissingTimestamp, DataQuality } from '@/types/attendance';

/**
 * Completeness calculation result
 */
export interface CompletenessResult {
  percentage: number;
  quality: DataQuality;
  requiresReview: boolean;
  presentCount: number;
  totalCount: number;
  missingFields: string[];
}

/**
 * Calculate completeness for attendance records
 *
 * @param checkInPresent - Is check-in timestamp present?
 * @param breakOutPresent - Is break-out timestamp present?
 * @param breakInPresent - Is break-in timestamp present?
 * @param checkOutPresent - Is check-out timestamp present?
 * @returns Completeness metrics
 */
export function calculateCompleteness(
  checkInPresent: boolean,
  breakOutPresent: boolean,
  breakInPresent: boolean,
  checkOutPresent: boolean
): CompletenessResult {
  const totalCount = 4;
  const presentCount = [
    checkInPresent,
    breakOutPresent,
    breakInPresent,
    checkOutPresent
  ].filter(Boolean).length;

  const percentage = Math.round((presentCount / totalCount) * 100);
  const quality = determineQuality(percentage);
  const requiresReview = requiresReviewFlag(checkInPresent, checkOutPresent, percentage);

  const missingFields = [];
  if (!checkInPresent) missingFields.push('checkIn');
  if (!breakOutPresent) missingFields.push('breakOut');
  if (!breakInPresent) missingFields.push('breakIn');
  if (!checkOutPresent) missingFields.push('checkOut');

  return {
    percentage,
    quality,
    requiresReview,
    presentCount,
    totalCount,
    missingFields
  };
}

/**
 * Calculate completeness from missing timestamps array
 *
 * @param missingTimestamps - Array of missing timestamp metadata
 * @param hasCheckIn - Whether check-in is present (required)
 * @returns Completeness metrics
 */
export function calculateCompletenessFromMissing(
  missingTimestamps: MissingTimestamp[],
  hasCheckIn: boolean = true
): CompletenessResult {
  const totalCount = 4;
  const missingCount = missingTimestamps.length;

  // If check-in is missing, it's invalid
  if (!hasCheckIn) {
    return {
      percentage: 0,
      quality: 'critical',
      requiresReview: true,
      presentCount: 0,
      totalCount,
      missingFields: ['checkIn', ...missingTimestamps.map(mt => mt.field)]
    };
  }

  const presentCount = totalCount - missingCount;
  const percentage = Math.round((presentCount / totalCount) * 100);
  const quality = determineQuality(percentage);
  const requiresReview = requiresReviewFlag(true,
    !missingTimestamps.some(mt => mt.field === 'checkOut'),
    percentage);

  return {
    percentage,
    quality,
    requiresReview,
    presentCount,
    totalCount,
    missingFields: missingTimestamps.map(mt => mt.field)
  };
}

/**
 * Determine data quality from completeness percentage
 */
export function determineQuality(percentage: number): DataQuality {
  if (percentage === 100) return 'complete';
  if (percentage >= 75) return 'partial';
  return 'critical';
}

/**
 * Determine if review is required
 */
export function requiresReviewFlag(
  hasCheckIn: boolean,
  hasCheckOut: boolean,
  percentage: number
): boolean {
  // Always require review if check-in is missing
  if (!hasCheckIn) return true;

  // Require review for critical quality (< 75%)
  if (percentage < 75) return true;

  // Require review if check-out is missing (affects hours worked)
  if (!hasCheckOut) return true;

  return false;
}

/**
 * Format completeness percentage for display
 */
export function formatCompleteness(percentage: number): string {
  return `${percentage}% Complete`;
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(quality: DataQuality): string {
  switch (quality) {
    case 'complete': return '#10b981'; // green
    case 'partial': return '#f59e0b'; // yellow
    case 'critical': return '#ef4444'; // red
    default: return '#6b7280'; // gray
  }
}

/**
 * Get quality description
 */
export function getQualityDescription(quality: DataQuality): string {
  switch (quality) {
    case 'complete': return 'All timestamps present';
    case 'partial': return 'Some timestamps missing, review recommended';
    case 'critical': return 'Critical data missing, requires immediate review';
    default: return 'Unknown quality';
  }
}