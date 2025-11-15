/**
 * Shift Detection Algorithm
 * Ported from Python processor.py _detect_shift_instances method
 *
 * A "shift instance" is one complete attendance record created when:
 * 1. Employee checks in (swipe in check-in range)
 * 2. All subsequent swipes within activity window belong to this instance
 * 3. Night shifts crossing midnight stay as single records
 */

import type {
  BurstRecord,
  ShiftInstance,
  ShiftConfig,
  ShiftDetectionConfig,
} from '@/types/attendance';

export class ShiftDetector {
  private config: ShiftDetectionConfig;
  private shiftCheckInRanges: Map<string, { start: string; end: string }>;

  constructor(config: ShiftDetectionConfig) {
    this.config = config;
    // Pre-compute shift check-in ranges for O(1) lookup
    this.shiftCheckInRanges = new Map();
    for (const [code, cfg] of Object.entries(config.shifts)) {
      this.shiftCheckInRanges.set(code, {
        start: cfg.checkInStart.substring(0, 5),
        end: cfg.checkInEnd.substring(0, 5)
      });
    }
  }

  /**
   * Detect shift instances from burst records (with progress logging)
   *
   * Algorithm:
   * 1. Group bursts by user
   * 2. For each user, find check-in bursts (shift starts)
   * 3. Assign subsequent bursts to shift instance within activity window
   * 4. Handle midnight-crossing shifts
   *
   * @param bursts - Array of burst records
   * @returns Array of shift instances
   */
  detectShifts(bursts: BurstRecord[]): ShiftInstance[] {
    if (bursts.length === 0) {
      return [];
    }

    console.log(`ShiftDetection: Starting with ${bursts.length} bursts`);

    // Group bursts by user
    const userGroups = this.groupByUser(bursts);
    const userCount = Object.keys(userGroups).length;
    console.log(`ShiftDetection: Grouped into ${userCount} users`);

    const allShiftInstances: ShiftInstance[] = [];
    let instanceIdCounter = 0;
    let userIndex = 0;

    // Process each user's bursts independently
    for (const [userName, userBursts] of Object.entries(userGroups)) {
      userIndex++;
      console.log(`ShiftDetection: Processing user ${userIndex}/${userCount}: ${userName} (${userBursts.length} bursts)`);

      // Sort by burst start time
      userBursts.sort((a, b) => a.burstStart.getTime() - b.burstStart.getTime());

      const userShifts = this.detectUserShifts(userName, userBursts, instanceIdCounter);
      allShiftInstances.push(...userShifts);
      instanceIdCounter += userShifts.length;

      console.log(`ShiftDetection: User ${userName} processed - found ${userShifts.length} shifts`);
    }

    // Sort all shift instances by start time
    allShiftInstances.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());

    console.log(`ShiftDetection: Complete - found ${allShiftInstances.length} total shifts`);
    return allShiftInstances;
  }

  /**
   * Group bursts by user name
   */
  private groupByUser(bursts: BurstRecord[]): Record<string, BurstRecord[]> {
    return bursts.reduce(
      (groups, burst) => {
        const name = burst.name;
        if (!groups[name]) {
          groups[name] = [];
        }
        groups[name]!.push(burst);
        return groups;
      },
      {} as Record<string, BurstRecord[]>
    );
  }

  /**
   * Detect shift instances for a single user
   */
  private detectUserShifts(
    userName: string,
    bursts: BurstRecord[],
    startingInstanceId: number
  ): ShiftInstance[] {
    const shiftInstances: ShiftInstance[] = [];
    let instanceId = startingInstanceId;
    let i = 0;

    while (i < bursts.length) {
      const currentBurst = bursts[i]!;
      const swipeTime = this.extractTime(currentBurst.burstStart);

      // Check if this burst is a valid check-in (shift start)
      const shiftCode = this.findShiftCode(swipeTime);

      if (shiftCode) {
        // Found a shift start - create new shift instance
        const shiftConfig = this.config.shifts[shiftCode]!;
        const shiftDate = this.extractDate(currentBurst.burstStart);

        // Determine activity window end
        const windowEnd = this.calculateActivityWindowEnd(shiftDate, shiftCode, shiftConfig);

        // Assign this burst and all subsequent bursts within activity window
        const assignedBursts: BurstRecord[] = [];
        let j = i;

        while (j < bursts.length) {
          const candidateBurst = bursts[j]!;
          const candidateTime = this.extractTime(candidateBurst.burstStart);

          // Check if burst is within activity window
          if (candidateBurst.burstStart <= windowEnd) {
            // Check if in current shift's check-out range (highest priority)
            const inCurrentCheckout = this.isTimeInRange(
              candidateTime,
              shiftConfig.checkOutStart,
              shiftConfig.checkOutEnd
            );

            // Check if would start a DIFFERENT shift type (optimized)
            let wouldStartDifferentShift = false;
            if (!inCurrentCheckout && j > i) {
              // Use pre-computed ranges for O(1) lookup instead of O(n) iteration
              const candidateTimeNormalized = candidateTime.substring(0, 5);
              for (const [code, range] of this.shiftCheckInRanges.entries()) {
                if (code !== shiftCode && this.isTimeInNormalizedRange(candidateTimeNormalized, range.start, range.end)) {
                  wouldStartDifferentShift = true;
                  break;
                }
              }
            }

            if (wouldStartDifferentShift) {
              // This burst starts a different shift type and not in checkout, stop
              break;
            }

            // Assign to current instance
            assignedBursts.push(candidateBurst);
            j++;
          } else {
            // Outside activity window, stop
            break;
          }
        }

        // Create shift instance
        if (assignedBursts.length > 0) {
          const checkOut = this.findLatestCheckOut(assignedBursts, shiftConfig);

          shiftInstances.push({
            shiftCode,
            shiftDate,
            shiftInstanceId: `shift_${instanceId}`,
            userName,
            checkIn: assignedBursts[0]!.burstStart,
            checkOut,
            bursts: assignedBursts,
          });

          instanceId++;
        }

        i = j; // Move to next unprocessed burst
      } else {
        // Not a check-in burst, skip (orphan)
        i++;
      }
    }

    return shiftInstances;
  }

  /**
   * Find shift code for a given time (optimized with pre-computed ranges)
   * Returns the shift code if time is in check-in range, null otherwise
   */
  private findShiftCode(time: string): string | null {
    const timeNormalized = time.substring(0, 5);

    for (const [code, range] of this.shiftCheckInRanges.entries()) {
      if (this.isTimeInNormalizedRange(timeNormalized, range.start, range.end)) {
        return code;
      }
    }
    return null;
  }

  /**
   * Check if time is in shift's check-in range (optimized)
   */
  private isTimeInCheckInRange(time: string, shiftConfig: ShiftConfig): boolean {
    return this.isTimeInRange(time, shiftConfig.checkInStart, shiftConfig.checkInEnd);
  }

  /**
   * Optimized time range check with pre-normalized values
   */
  private isTimeInNormalizedRange(time: string, start: string, end: string): boolean {
    if (start <= end) {
      // Normal range (e.g., 09:50 to 10:35)
      return time >= start && time <= end;
    } else {
      // Midnight-spanning range (e.g., 21:30 to 06:35)
      return time >= start || time <= end;
    }
  }

  /**
   * Calculate activity window end for a shift instance
   */
  private calculateActivityWindowEnd(
    shiftDate: Date,
    shiftCode: string,
    shiftConfig: ShiftConfig
  ): Date {
    const windowEndTime = shiftConfig.checkOutEnd;

    // For night shift, window extends to next day
    if (shiftCode === 'C') {
      const nextDay = new Date(shiftDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return this.combineDateTime(nextDay, windowEndTime);
    }

    // For other shifts, window ends same day
    return this.combineDateTime(shiftDate, windowEndTime);
  }

  /**
   * Find latest check-out timestamp within check-out range
   */
  private findLatestCheckOut(
    bursts: BurstRecord[],
    shiftConfig: ShiftConfig
  ): Date | undefined {
    let latestCheckOut: Date | undefined;

    for (const burst of bursts) {
      const burstEndTime = this.extractTime(burst.burstEnd);

      if (
        this.isTimeInRange(burstEndTime, shiftConfig.checkOutStart, shiftConfig.checkOutEnd)
      ) {
        if (!latestCheckOut || burst.burstEnd > latestCheckOut) {
          latestCheckOut = burst.burstEnd;
        }
      }
    }

    return latestCheckOut;
  }

  /**
   * Check if time is in range (handles midnight crossing)
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    // Normalize to HH:MM for comparison
    const timeNormalized = time.substring(0, 5);
    const startNormalized = start.substring(0, 5);
    const endNormalized = end.substring(0, 5);

    if (startNormalized <= endNormalized) {
      // Normal range (e.g., 09:50 to 10:35)
      return timeNormalized >= startNormalized && timeNormalized <= endNormalized;
    } else {
      // Midnight-spanning range (e.g., 21:30 to 06:35)
      return timeNormalized >= startNormalized || timeNormalized <= endNormalized;
    }
  }

  /**
   * Extract time string from Date (HH:MM:SS)
   */
  private extractTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Extract date portion from Date (returns midnight in local timezone)
   */
  private extractDate(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  /**
   * Combine date and time string into Date
   */
  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes, seconds = '0'] = time.split(':');
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      parseInt(hours!, 10),
      parseInt(minutes!, 10),
      parseInt(seconds, 10)
    );
  }

  /**
   * Get statistics about shift detection
   */
  getShiftStatistics(shifts: ShiftInstance[]): {
    totalShifts: number;
    shiftsByType: Record<string, number>;
    userCount: number;
    averageBurstsPerShift: number;
  } {
    const uniqueUsers = new Set(shifts.map((s) => s.userName));
    const shiftsByType: Record<string, number> = {};
    let totalBursts = 0;

    for (const shift of shifts) {
      shiftsByType[shift.shiftCode] = (shiftsByType[shift.shiftCode] || 0) + 1;
      totalBursts += shift.bursts.length;
    }

    return {
      totalShifts: shifts.length,
      shiftsByType,
      userCount: uniqueUsers.size,
      averageBurstsPerShift: shifts.length > 0 ? totalBursts / shifts.length : 0,
    };
  }
}
