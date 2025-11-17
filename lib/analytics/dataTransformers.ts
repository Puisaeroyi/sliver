/**
 * Data transformers for analytics dashboard
 * Transforms attendance records into analytics data structures
 */

import {
  AttendanceRecord,
  UserStats,
  ShiftStats,
  TrendData,
  SummaryStats,
  AnalyticsData,
} from '@/types/attendance';

/**
 * Calculate late percentages and statistics per user
 */
export function calculateUserStats(records: AttendanceRecord[]): UserStats[] {
  // Group records by user name
  const userGroups = records.reduce(
    (acc, record) => {
      if (!acc[record.name]) {
        acc[record.name] = [];
      }
      acc[record.name]!.push(record);
      return acc;
    },
    {} as Record<string, AttendanceRecord[]>
  );

  // Calculate stats for each user
  const userStats: UserStats[] = Object.entries(userGroups).map(([userName, userRecords]) => {
    const totalRecords = userRecords.length;

    // Enhanced status detection
    const lateCount = userRecords.filter(
      (r) => r.status && r.status.includes('Late')
    ).length;

    const soonCount = userRecords.filter(
      (r) => r.status && r.status.includes('Leave Soon')
    ).length;

    // On Time = remaining records
    const onTimeCount = totalRecords - lateCount - soonCount;

    // Calculate percentages
    const latePercentage = totalRecords > 0 ? (lateCount / totalRecords) * 100 : 0;
    const soonPercentage = totalRecords > 0 ? (soonCount / totalRecords) * 100 : 0;
    const onTimePercentage = totalRecords > 0 ? (onTimeCount / totalRecords) * 100 : 0;
    const deviationPercentage = latePercentage + soonPercentage;

    return {
      userName,
      totalRecords,
      lateCount,
      onTimeCount,
      soonCount,
      latePercentage: Math.round(latePercentage * 10) / 10,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
      soonPercentage: Math.round(soonPercentage * 10) / 10,
      deviationPercentage: Math.round(deviationPercentage * 10) / 10,
    };
  });

  // Sort by total records descending
  return userStats.sort((a, b) => b.totalRecords - a.totalRecords);
}

/**
 * Calculate shift distribution statistics
 */
export function calculateShiftDistribution(records: AttendanceRecord[]): ShiftStats[] {
  // Map shift codes to display names
  const shiftNames: Record<string, string> = {
    A: 'Morning',
    B: 'Afternoon',
    C: 'Night',
  };

  // Count records per shift
  const shiftCounts = records.reduce(
    (acc, record) => {
      const shift = record.shift || 'Unknown';
      acc[shift] = (acc[shift] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalRecords = records.length;

  // Transform to ShiftStats array
  const shiftStats: ShiftStats[] = Object.entries(shiftCounts).map(([shift, count]) => ({
    shift,
    shiftName: shiftNames[shift] || shift,
    count,
    percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100 * 10) / 10 : 0,
  }));

  // Sort by shift code (A, B, C)
  return shiftStats.sort((a, b) => a.shift.localeCompare(b.shift));
}

/**
 * Extract attendance trends over time (grouped by date)
 */
export function calculateTrends(records: AttendanceRecord[]): TrendData[] {
  // Group by date
  const dateGroups = records.reduce(
    (acc, record) => {
      const dateKey = (record.date instanceof Date
        ? record.date.toISOString().split('T')[0]
        : String(record.date).split('T')[0]) || '';

      if (dateKey && !acc[dateKey]) {
        acc[dateKey] = [];
      }
      if (dateKey) {
        acc[dateKey]!.push(record);
      }
      return acc;
    },
    {} as Record<string, AttendanceRecord[]>
  );

  // Calculate trends per date
  const trends: TrendData[] = Object.entries(dateGroups).map(([date, dateRecords]) => {
    // Count attendance per user for this date
    const userCounts = dateRecords.reduce(
      (acc, record) => {
        acc[record.name] = (acc[record.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      date,
      ...userCounts,
    };
  });

  // Sort by date ascending
  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate overall summary statistics
 */
export function generateSummaryStats(records: AttendanceRecord[]): SummaryStats {
  const totalRecords = records.length;

  // Enhanced status detection
  const totalLate = records.filter(
    (r) => r.status && r.status.includes('Late')
  ).length;

  const totalSoon = records.filter(
    (r) => r.status && r.status.includes('Leave Soon')
  ).length;

  const totalOnTime = totalRecords - totalLate - totalSoon;

  // Calculate percentages
  const latePercentage = totalRecords > 0
    ? Math.round((totalLate / totalRecords) * 100 * 10) / 10
    : 0;

  const soonPercentage = totalRecords > 0
    ? Math.round((totalSoon / totalRecords) * 100 * 10) / 10
    : 0;

  const onTimePercentage = totalRecords > 0
    ? Math.round((totalOnTime / totalRecords) * 100 * 10) / 10
    : 0;

  const deviationPercentage = latePercentage + soonPercentage;

  // Get unique users and calculate average attendance
  const uniqueUsers = new Set(records.map((r) => r.name)).size;
  const averageAttendance = uniqueUsers > 0
    ? Math.round((totalRecords / uniqueUsers) * 10) / 10
    : 0;

  return {
    totalRecords,
    totalLate,
    totalOnTime,
    totalSoon,
    latePercentage,
    onTimePercentage,
    soonPercentage,
    deviationPercentage,
    averageAttendance,
    uniqueUsers,
  };
}

/**
 * Transform attendance records into complete analytics data
 */
export function transformToAnalytics(records: AttendanceRecord[]): AnalyticsData {
  return {
    userStats: calculateUserStats(records),
    shiftDistribution: calculateShiftDistribution(records),
    trends: calculateTrends(records),
    summary: generateSummaryStats(records),
  };
}
