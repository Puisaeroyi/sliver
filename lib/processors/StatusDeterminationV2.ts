/**
 * Status Determination v2 - Missing Timestamp Handling
 *
 * Enhanced algorithm that gracefully handles missing timestamps while maintaining
 * data integrity and providing quality indicators.
 *
 * Key improvements over v1:
 * - Nullable timestamp support (checkOut, breakOut, breakIn)
 * - Data quality classification
 * - Missing timestamp tracking
 * - Completeness percentage calculation
 * - HR review flags
 */

import type { ShiftConfig, MissingTimestamp, DataQuality } from '@/types/attendance';

/**
 * Status determination result with v2 extensions
 */
export interface StatusDeterminationResultV2 {
  status: string; // Consolidated deviation status
  missingTimestamps: MissingTimestamp[];
  requiresReview: boolean;
  completenessPercentage: number;
  dataQuality: DataQuality;
}

/**
 * Determine consolidated status for all 4 attendance points with missing timestamp support
 *
 * @param checkInTime - HH:MM:SS format (REQUIRED)
 * @param breakOutTime - HH:MM:SS format or null
 * @param breakInTime - HH:MM:SS format or null
 * @param checkOutTime - HH:MM:SS format or null
 * @param shiftConfig - Shift configuration with thresholds
 * @returns Enhanced status determination result with quality indicators
 */
export function determineShiftStatusV2(
  checkInTime: string,
  breakOutTime: string | null,
  breakInTime: string | null,
  checkOutTime: string | null,
  shiftConfig: ShiftConfig
): StatusDeterminationResultV2 {
  const deviations: string[] = [];
  const missingTimestamps: MissingTimestamp[] = [];

  // 1. Check-in validation (REQUIRED - cannot be missing)
  if (!checkInTime) {
    return {
      status: "INVALID - No Check-In",
      missingTimestamps: [{
        field: "checkIn",
        expectedTime: shiftConfig.shiftStart,
        severity: "high"
      }],
      requiresReview: true,
      completenessPercentage: 0,
      dataQuality: "critical"
    };
  }

  // 2. Check-in deviation check (if present)
  if (checkInTime >= shiftConfig.checkInLateThreshold) {
    deviations.push('Late Check-in');
  }

  // 3. Break Out (optional)
  if (breakOutTime === null || breakOutTime === '') {
    missingTimestamps.push({
      field: "breakOut",
      expectedTime: shiftConfig.breakOutExpectedTime,
      severity: "low" // Missing break-out is informational
    });
  } else {
    // Check deviation if present
    if (breakOutTime < shiftConfig.breakOutExpectedTime) {
      deviations.push('Leave Soon Break Out');
    }
  }

  // 4. Break In (optional)
  if (breakInTime === null || breakInTime === '') {
    missingTimestamps.push({
      field: "breakIn",
      expectedTime: shiftConfig.breakEndTime,
      severity: "medium" // Missing break-in affects compliance
    });
  } else {
    // Check deviation if present
    if (breakInTime >= shiftConfig.breakInLateThreshold) {
      deviations.push('Late Break In');
    }
  }

  // 5. Check Out (optional)
  if (checkOutTime === null || checkOutTime === '') {
    missingTimestamps.push({
      field: "checkOut",
      expectedTime: shiftConfig.checkOutExpectedTime,
      severity: "high" // Missing check-out affects hours worked
    });
  } else {
    // Check deviation if present
    if (checkOutTime < shiftConfig.checkOutExpectedTime) {
      deviations.push('Leave Soon Check Out');
    }
  }

  // 6. Build status string with missing indicators
  let status = deviations.length > 0 ? deviations.join(', ') : 'On Time';

  // Add missing timestamp indicators to status
  if (missingTimestamps.length > 0) {
    const missingFields = missingTimestamps.map(mt =>
      mt.field.charAt(0).toUpperCase() + mt.field.slice(1).replace(/([A-Z])/g, ' $1')
    ).join(', ');
    status += ` [Missing: ${missingFields}]`;
  }

  // 7. Calculate completeness percentage
  const totalTimestamps = 4; // checkIn, breakOut, breakIn, checkOut
  const presentTimestamps = totalTimestamps - missingTimestamps.length;
  const completenessPercentage = Math.round((presentTimestamps / totalTimestamps) * 100);

  // 8. Determine data quality classification
  let dataQuality: DataQuality;
  let requiresReview: boolean;

  if (completenessPercentage === 100) {
    dataQuality = "complete";
    requiresReview = false;
  } else if (completenessPercentage >= 75) {
    dataQuality = "partial";
    // Require review if check-out is missing (affects hours worked)
    requiresReview = missingTimestamps.some(mt => mt.field === 'checkOut');
  } else {
    dataQuality = "critical";
    requiresReview = true;
  }

  return {
    status,
    missingTimestamps,
    requiresReview,
    completenessPercentage,
    dataQuality
  };
}

/**
 * Helper function to calculate completeness percentage
 */
export function calculateCompletenessPercentage(
  missingCount: number,
  totalCount: number = 4
): number {
  return Math.round(((totalCount - missingCount) / totalCount) * 100);
}

/**
 * Helper function to determine data quality from completeness
 */
export function determineDataQuality(completenessPercentage: number): DataQuality {
  if (completenessPercentage === 100) return "complete";
  if (completenessPercentage >= 75) return "partial";
  return "critical";
}

/**
 * Helper function to check if review is required
 */
export function requiresReview(missingTimestamps: MissingTimestamp[], completenessPercentage: number): boolean {
  // Always require review for critical quality
  if (completenessPercentage < 75) return true;

  // Require review if critical field (check-out) is missing
  return missingTimestamps.some(mt => mt.field === 'checkOut');
}