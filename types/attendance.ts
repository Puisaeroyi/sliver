/**
 * Type definitions for attendance processing system
 * Ported from Python implementation
 */

/**
 * Raw swipe record from biometric system
 */
export interface SwipeRecord {
  id: string;
  name: string;
  date: Date;
  time: string;
  timestamp: Date;
  status: string;
  type?: string;
}

/**
 * Configuration for burst detection
 */
export interface BurstDetectionConfig {
  thresholdMinutes: number;
}

/**
 * A burst is a group of consecutive swipes within the threshold time
 */
export interface BurstRecord {
  name: string;
  burstId: string;
  burstStart: Date;
  burstEnd: Date;
  swipeCount: number;
  swipes: SwipeRecord[];
}

/**
 * Shift configuration from rule.yaml (v10.1)
 */
export interface ShiftConfig {
  name: string; // "A", "B", "C"
  displayName: string; // "Morning", "Afternoon", "Night"

  // Check-in configuration
  checkInStart: string; // HH:MM:SS format
  checkInEnd: string;
  shiftStart: string; // Official shift start time
  checkInOnTimeCutoff: string; // Last second to be on-time
  checkInLateThreshold: string; // This and after = Late

  // Check-out configuration
  checkOutStart: string;
  checkOutEnd: string;
  checkOutExpectedTime: string; // Target check-out time (Leave Soon if < this)

  // Break detection configuration
  breakSearchStart: string;
  breakSearchEnd: string;
  breakOutCheckpoint: string; // Target time for Break Time Out
  breakOutExpectedTime: string; // Target break start time (Leave Soon if < this)
  midpoint: string; // Midpoint for fallback logic
  minimumBreakGapMinutes: number;
  breakEndTime: string; // Official break end time
  breakInOnTimeCutoff: string; // Last second to be on-time for break return
  breakInLateThreshold: string; // This and after = Late from break
}

/**
 * Configuration for shift detection
 */
export interface ShiftDetectionConfig {
  shifts: Record<string, ShiftConfig>;
}

/**
 * Break times detected from shift instance
 */
export interface BreakTimes {
  breakOut: string; // HH:MM:SS or empty
  breakIn: string; // HH:MM:SS or empty
  breakInTime: string | null; // Time object for status calculation
}

/**
 * Metadata for a missing timestamp field
 */
export interface MissingTimestamp {
  field: "checkIn" | "checkOut" | "breakOut" | "breakIn";
  expectedTime?: string; // From shift config (e.g., "14:00:00")
  severity: "low" | "medium" | "high";
}

/**
 * Data quality classification for attendance records
 */
export type DataQuality = "complete" | "partial" | "critical";

/**
 * A shift instance is a specific occurrence of a shift for a user
 */
export interface ShiftInstance {
  shiftCode: string;
  shiftDate: Date;
  shiftInstanceId: string;
  userName: string;
  checkIn: Date;
  checkOut?: Date;
  bursts: BurstRecord[];
}

/**
 * Final attendance record output (v10.1 + v2 extensions)
 */
export interface AttendanceRecord {
  date: Date;
  id: string;
  name: string;
  shift: string;
  checkIn: string;
  breakOut: string;
  breakIn: string;
  checkOut: string;
  status: string; // Consolidated deviation status (e.g., "On Time", "Late Check-in", "Leave Soon Break Out, Late Break In")
  totalHours?: number;
  overtime?: number;

  // v2: Missing timestamp handling (optional for backward compatibility)
  missingTimestamps?: MissingTimestamp[];
  dataQuality?: DataQuality;
  requiresReview?: boolean;
  completenessPercentage?: number;

  // New: Individual deviation columns for cell-level highlighting
  checkInLate?: string;        // "Late" or ""
  breakOutEarly?: string;      // "Early" or ""
  breakInLate?: string;        // "Late" or ""
  checkOutEarly?: string;      // "Early" or ""
  missedPunch?: string;        // Comma-separated missing fields
}

/**
 * User configuration
 */
export interface UserConfig {
  id: string;
  name: string;
  shifts: string[];
}

/**
 * Complete rule configuration
 */
export interface RuleConfig {
  statusFilter: string[];
  burstThresholdMinutes: number;
  shifts: Record<string, ShiftConfig>;
  dateFormat: string;
  timeFormat: string;
}

/**
 * Processing result with statistics
 */
export interface ProcessingResult {
  success: boolean;
  recordsProcessed: number;
  burstsDetected: number;
  shiftInstancesFound: number;
  attendanceRecordsGenerated: number;
  deviationRecordsCount?: number;
  errors: string[];
  warnings: string[];
  outputData: AttendanceRecord[];
  deviationData?: AttendanceRecord[];
}

/**
 * Analytics types for dashboard
 */
export interface UserStats {
  userName: string;
  totalRecords: number;
  lateCount: number;
  onTimeCount: number;
  soonCount: number;              // Number of "Leave Soon" occurrences
  latePercentage: number;         // Late percentage (existing)
  onTimePercentage: number;       // On Time percentage (existing)
  soonPercentage: number;          // Leave Soon percentage
  deviationPercentage: number;     // Total deviation = Late % + Soon %
}

export interface ShiftStats {
  shift: string;
  shiftName: string;
  count: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  [userName: string]: number | string; // Dynamic user fields + date
}

export interface SummaryStats {
  totalRecords: number;
  totalLate: number;
  totalOnTime: number;
  totalSoon: number;               // Total "Leave Soon" across all users
  latePercentage: number;
  onTimePercentage: number;
  soonPercentage: number;          // Overall "Leave Soon" percentage
  deviationPercentage: number;     // Overall deviation = Late % + Soon %
  averageAttendance: number;
  uniqueUsers: number;
}

export interface AnalyticsData {
  userStats: UserStats[];
  shiftDistribution: ShiftStats[];
  trends: TrendData[];
  summary: SummaryStats;
}

/**
 * API request/response types
 */
export interface ProcessAttendanceRequest {
  fileData: ArrayBuffer;
  fileName: string;
  config?: Partial<RuleConfig>;
}

export interface ProcessAttendanceResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: ProcessingResult;
  error?: string;
}
