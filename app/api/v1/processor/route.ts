/**
 * Attendance Processing API Route
 * POST /api/v1/processor/process
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { BurstDetector } from '@/lib/processors/BurstDetector';
import { ShiftDetector } from '@/lib/processors/ShiftDetector';
import { BreakDetector } from '@/lib/processors/BreakDetector';
import { parseSwipeRecord, validateRequiredColumns } from '@/lib/utils/dataParser';
import { loadCombinedConfig, createUserMapper, convertYamlToShiftConfigs } from '@/lib/config/yamlLoader';
import { FEATURES } from '@/lib/config/features';
import { determineShiftStatusV2 } from '@/lib/processors/StatusDeterminationV2';
import { parseDeviations, getDeviationText, getMissedPunch } from '@/lib/utils/deviationParser';
import type {
  ProcessingResult,
  SwipeRecord,
  RuleConfig,
  ShiftConfig,
  AttendanceRecord,
  MissingTimestamp,
  DataQuality,
} from '@/types/attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Security: File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Default shift configurations from rule.yaml v10.1
// Updated: Extended check-in range (1hr before) and check-out range (2hrs after)
// Added: Expected time fields for early departure detection
const DEFAULT_SHIFT_CONFIGS: Record<string, ShiftConfig> = {
  A: {
    name: 'A',
    displayName: 'Morning',
    checkInStart: '05:00:00',        // Extended: 1 hour before shift start (was 05:30:00)
    checkInEnd: '06:35:00',
    shiftStart: '06:00:00',
    checkInOnTimeCutoff: '06:04:59',
    checkInLateThreshold: '06:05:00',
    checkOutStart: '13:30:00',
    checkOutEnd: '16:00:00',         // Extended: 2 hours after shift end (was 14:35:00)
    checkOutExpectedTime: '14:00:00', // Target check-out time (Leave Soon if < this)
    breakSearchStart: '09:50:00',
    breakSearchEnd: '10:35:00',
    breakOutCheckpoint: '10:00:00',
    breakOutExpectedTime: '10:00:00', // Target break start time (Leave Soon if < this)
    midpoint: '10:15:00',
    minimumBreakGapMinutes: 5,
    breakEndTime: '10:30:00',
    breakInOnTimeCutoff: '10:34:59',
    breakInLateThreshold: '10:35:00',
  },
  B: {
    name: 'B',
    displayName: 'Afternoon',
    checkInStart: '13:00:00',        // Extended: 1 hour before shift start (was 13:30:00)
    checkInEnd: '14:35:00',
    shiftStart: '14:00:00',
    checkInOnTimeCutoff: '14:04:59',
    checkInLateThreshold: '14:05:00',
    checkOutStart: '21:30:00',
    checkOutEnd: '00:00:00',         // Extended: 2 hours after shift end (was 22:35:00, now midnight)
    checkOutExpectedTime: '22:00:00', // Target check-out time (Leave Soon if < this)
    breakSearchStart: '17:50:00',
    breakSearchEnd: '18:35:00',
    breakOutCheckpoint: '18:00:00',
    breakOutExpectedTime: '18:00:00', // Target break start time (Leave Soon if < this)
    midpoint: '18:15:00',
    minimumBreakGapMinutes: 5,
    breakEndTime: '18:30:00',
    breakInOnTimeCutoff: '18:34:59',
    breakInLateThreshold: '18:35:00',
  },
  C: {
    name: 'C',
    displayName: 'Night',
    checkInStart: '21:00:00',        // Extended: 1 hour before shift start (was 21:30:00)
    checkInEnd: '22:35:00',
    shiftStart: '22:00:00',
    checkInOnTimeCutoff: '22:04:59',
    checkInLateThreshold: '22:05:00',
    checkOutStart: '05:30:00',
    checkOutEnd: '08:00:00',         // Extended: 2 hours after shift end (was 06:35:00)
    checkOutExpectedTime: '06:00:00', // Target check-out time (Leave Soon if < this)
    breakSearchStart: '01:50:00',
    breakSearchEnd: '02:50:00',
    breakOutCheckpoint: '02:00:00',
    breakOutExpectedTime: '02:00:00', // Target break start time (Leave Soon if < this)
    midpoint: '02:22:30',
    minimumBreakGapMinutes: 5,
    breakEndTime: '02:45:00',
    breakInOnTimeCutoff: '02:49:59',
    breakInLateThreshold: '02:50:00',
  },
};

/**
 * Determine consolidated status for all 4 attendance points
 * Detects late arrivals (Check-in, Break In) and early departures (Break Out, Check Out)
 *
 * @param checkInTime - HH:MM:SS format
 * @param breakOutTime - HH:MM:SS format
 * @param breakInTime - HH:MM:SS format
 * @param checkOutTime - HH:MM:SS format
 * @param shiftConfig - Shift configuration with thresholds
 * @returns Comma-separated deviations or "On Time"
 *
 * @example
 * determineShiftStatus('06:05:40', '09:52:00', '10:28:00', '14:05:00', config)
 * // Returns: "Late Check-in, Leave Soon Break Out"
 */
function determineShiftStatus(
  checkInTime: string,
  breakOutTime: string,
  breakInTime: string,
  checkOutTime: string,
  shiftConfig: ShiftConfig
): string {
  const deviations: string[] = [];

  // 1. Late Check-in: actual_time >= late_threshold
  if (checkInTime && checkInTime >= shiftConfig.checkInLateThreshold) {
    deviations.push('Late Check-in');
  }

  // 2. Leave Soon Break Out: actual_time < expected_time
  if (breakOutTime && breakOutTime < shiftConfig.breakOutExpectedTime) {
    deviations.push('Leave Soon Break Out');
  }

  // 3. Late Break In: actual_time >= late_threshold
  if (breakInTime && breakInTime >= shiftConfig.breakInLateThreshold) {
    deviations.push('Late Break In');
  }

  // 4. Leave Soon Check Out: actual_time < expected_time
  if (checkOutTime && checkOutTime < shiftConfig.checkOutExpectedTime) {
    deviations.push('Leave Soon Check Out');
  }

  return deviations.length > 0 ? deviations.join(', ') : 'On Time';
}

/**
 * Process attendance data from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Security: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Security: Validate MIME type and file extension
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.xls', '.xlsx'];

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    // Check MIME type (fallback to empty string if not provided)
    const mimeType = file.type || '';
    const hasValidMimeType = allowedMimeTypes.includes(mimeType);

    if (!hasValidExtension && !hasValidMimeType) {
      return NextResponse.json(
        { error: 'Invalid file type. Only Excel files (.xls, .xlsx) are allowed' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse Excel file with ExcelJS (optimized performance)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 });
    }

    // Optimized JSON conversion - reduce iterations and memory usage
    const rawData: Record<string, unknown>[] = [];
    let headerRow: string[] = [];

    // Get header row efficiently
    const firstRow = worksheet.getRow(1);
    headerRow = firstRow.values as string[];
    headerRow.shift(); // Remove first empty element from row.values

    // Pre-check for empty data
    if (worksheet.rowCount <= 1) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 });
    }

    // Process rows more efficiently - direct iteration without nested eachRow calls
    const totalRows = worksheet.rowCount;
    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // Skip completely empty rows
      const rowValues = row.values as (string | number | undefined)[];
      if (!rowValues || rowValues.length <= 1) continue;

      const rowData: Record<string, unknown> = {};

      // Direct cell access - O(n) instead of O(n²)
      for (let colNumber = 1; colNumber < headerRow.length + 1; colNumber++) {
        const header = headerRow[colNumber - 1];
        if (header) {
          const cellValue = rowValues[colNumber];
          if (cellValue !== undefined && cellValue !== null) {
            rowData[header] = cellValue;
          }
        }
      }

      // Only add non-empty rows
      if (Object.keys(rowData).length > 0) {
        rawData.push(rowData);
      }
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 });
    }

    // Validate required columns
    const requiredColumns = ['ID', 'Name', 'Date', 'Time', 'Status'];
    validateRequiredColumns(rawData, requiredColumns);

    // Load YAML configurations
    let combinedConfig;
    try {
      combinedConfig = loadCombinedConfig();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Configuration loading failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Parse configuration (if provided)
    const configStr = formData.get('config') as string;
    const config: Partial<RuleConfig> = configStr ? JSON.parse(configStr) : {};

    // Set defaults from rule.yaml or fallback to 2 minutes
    const burstThresholdMinutes = config.burstThresholdMinutes ||
      (combinedConfig.rules.burst_threshold_minutes as number) || 2;
    const statusFilter = config.statusFilter ||
      (combinedConfig.rules.status_filter as string[]) || ['Success'];

    // Create user mapper function
    const mapUser = createUserMapper(combinedConfig.users);

    // Get list of allowed users from users.yaml and rule.yaml
    const allowedUsers = new Set([
      ...Object.keys(combinedConfig.users.operators || {}),
      ...(combinedConfig.rules.operators?.valid_users || [])
    ]);

    console.log('Allowed users:', Array.from(allowedUsers));

    // Parse swipe records (optimized with batching and progress)
    const swipes: SwipeRecord[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let filteredByStatus = 0;
    let filteredByUser = 0;

    // Process in batches to improve memory efficiency and allow progress tracking
    const parseBatchSize = 500;
    const totalBatches = Math.ceil(rawData.length / parseBatchSize);

    for (let batchStart = 0; batchStart < rawData.length; batchStart += parseBatchSize) {
      const batchEnd = Math.min(batchStart + parseBatchSize, rawData.length);
      const currentBatch = Math.floor(batchStart / parseBatchSize) + 1;

      // Log progress for large files
      if (rawData.length > 1000) {
        console.log(`Processing batch ${currentBatch}/${totalBatches} (${batchEnd}/${rawData.length} records)`);
      }

      // Process current batch
      for (let i = batchStart; i < batchEnd; i++) {
        try {
          const swipe = parseSwipeRecord(rawData[i]!, i);

          // Filter by status first
          if (!statusFilter.includes(swipe.status)) {
            filteredByStatus++;
            continue;
          }

          // Then filter by allowed users
          if (!allowedUsers.has(swipe.name)) {
            filteredByUser++;
            if (rawData.length <= 100) { // Only log details for small files
              console.log(`Filtered out unauthorized user: ${swipe.name} (ID: ${swipe.id})`);
            }
            continue;
          }

          // Only add swipe if it passes both filters
          swipes.push(swipe);
        } catch (error) {
          // Log but don't fail on individual row errors
          warnings.push(
            `Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Optional: Allow event loop to breathe for very large files
      if (rawData.length > 5000 && currentBatch % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (swipes.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid records found after filtering',
          details: {
            totalRows: rawData.length,
            filteredByStatus,
            filteredByUser,
            invalidRows: warnings.length,
            allowedUsers: Array.from(allowedUsers),
            statusFilter,
            warnings: warnings.slice(0, 10), // Show first 10 warnings
          },
        },
        { status: 400 }
      );
    }

    // STEP 1: Process bursts (with progress logging)
    console.log('STEP 1: Detecting bursts from', swipes.length, 'swipes...');
    const burstDetector = new BurstDetector({ thresholdMinutes: burstThresholdMinutes });
    const bursts = burstDetector.detectBursts(swipes);
    console.log('STEP 1: Found', bursts.length, 'bursts');

    // Load shift configurations from YAML
    const yamlShiftConfigs = convertYamlToShiftConfigs(combinedConfig.rules);
    const shiftConfigs = { ...DEFAULT_SHIFT_CONFIGS, ...yamlShiftConfigs };

    // STEP 2: Detect shift instances (with progress logging)
    console.log('STEP 2: Detecting shifts from', bursts.length, 'bursts...');
    const shiftDetector = new ShiftDetector({ shifts: shiftConfigs });
    const shiftInstances = shiftDetector.detectShifts(bursts);
    console.log('STEP 2: Found', shiftInstances.length, 'shift instances');

    // STEP 3: Detect breaks and generate attendance records (with batching and progress)
    console.log('STEP 3: Processing', shiftInstances.length, 'shift instances for breaks and attendance...');
    console.log('Feature Flag - Missing Timestamp Handling:', FEATURES.MISSING_TIMESTAMP_HANDLING ? 'ENABLED (v2)' : 'DISABLED (stable)');

    const breakDetector = new BreakDetector();
    const attendanceRecords: AttendanceRecord[] = [];

    // Process shifts in batches for better performance with large datasets
    const shiftBatchSize = 100;
    for (let i = 0; i < shiftInstances.length; i += shiftBatchSize) {
      const batchEnd = Math.min(i + shiftBatchSize, shiftInstances.length);

      if (shiftInstances.length > 200) {
        console.log(`Processing shifts ${i + 1}-${batchEnd} of ${shiftInstances.length}...`);
      }

      for (let j = i; j < batchEnd; j++) {
        const shift = shiftInstances[j];
        if (!shift) continue; // Skip undefined shifts
        const shiftConfig = shiftConfigs[shift.shiftCode] || DEFAULT_SHIFT_CONFIGS[shift.shiftCode]!;

        // Detect breaks for this shift
        const breakTimes = breakDetector.detectBreak(shift.bursts, shiftConfig);

        // Extract check-in and check-out times
        const checkInTime = shift.checkIn.toTimeString().substring(0, 8);
        const checkOutTime = shift.checkOut ? shift.checkOut.toTimeString().substring(0, 8) : '';

        // Map user using users.yaml configuration
        const mappedUser = mapUser(shift.userName);

        // Determine consolidated status using appropriate algorithm
        let status: string;
        let v2Metadata: {
          missingTimestamps?: MissingTimestamp[];
          dataQuality?: DataQuality;
          requiresReview?: boolean;
          completenessPercentage?: number;
        } = {};

        if (FEATURES.MISSING_TIMESTAMP_HANDLING) {
          // Use v2 algorithm with missing timestamp support
          const v2Result = determineShiftStatusV2(
            checkInTime,
            breakTimes.breakOut || null,
            breakTimes.breakIn || null,
            checkOutTime || null,
            shiftConfig
          );

          status = v2Result.status;
          v2Metadata = {
            missingTimestamps: v2Result.missingTimestamps,
            dataQuality: v2Result.dataQuality,
            requiresReview: v2Result.requiresReview,
            completenessPercentage: v2Result.completenessPercentage
          };
        } else {
          // Use v1 algorithm (stable)
          status = determineShiftStatus(
            checkInTime,
            breakTimes.breakOut,
            breakTimes.breakIn,
            checkOutTime,
            shiftConfig
          );
        }

        // Parse deviations for new column structure
        const deviationFlags = parseDeviations(status);

        // Create attendance record
        const attendanceRecord: AttendanceRecord = {
          date: shift.shiftDate,
          id: mappedUser.id,
          name: mappedUser.name,
          shift: shiftConfig.displayName,
          checkIn: checkInTime,
          breakOut: breakTimes.breakOut,
          breakIn: breakTimes.breakIn,
          checkOut: checkOutTime,
          status,
          // Include v2 metadata only if feature is enabled
          ...v2Metadata,
          // Add new deviation columns
          checkInLate: getDeviationText(deviationFlags, 'checkIn'),
          breakOutEarly: getDeviationText(deviationFlags, 'breakOut'),
          breakInLate: getDeviationText(deviationFlags, 'breakIn'),
          checkOutEarly: getDeviationText(deviationFlags, 'checkOut'),
          missedPunch: getMissedPunch(status)
        };

        attendanceRecords.push(attendanceRecord);
      }

      // Allow event loop to breathe for very large shift datasets
      if (shiftInstances.length > 500 && (i / shiftBatchSize) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log('STEP 3: Generated', attendanceRecords.length, 'attendance records');

    // STEP 4: Enhanced analysis for v2 algorithm
    let incompleteRecords = 0;
    let recordsRequiringReview = 0;

    if (FEATURES.MISSING_TIMESTAMP_HANDLING) {
      incompleteRecords = attendanceRecords.filter(record =>
        record.completenessPercentage && record.completenessPercentage < 100
      ).length;

      recordsRequiringReview = attendanceRecords.filter(record =>
        record.requiresReview === true
      ).length;

      console.log('STEP 4a: v2 Analysis - Incomplete:', incompleteRecords, 'Records requiring review:', recordsRequiringReview);
    }

    // STEP 5: Filter deviation records
    // Include records with:
    // - Time deviations (Late/Soon)
    // - Missing timestamps requiring review (when v2 enabled)
    const deviationRecords = attendanceRecords.filter(record => {
      const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
      const needsReview = FEATURES.MISSING_TIMESTAMP_HANDLING && record.requiresReview === true;
      return hasDeviation || needsReview;
    });
    console.log('STEP 5: Filtered', deviationRecords.length, 'deviation records (deviations + review required)');

    // Create processing result
    const result: ProcessingResult = {
      success: true,
      recordsProcessed: swipes.length,
      burstsDetected: bursts.length,
      shiftInstancesFound: shiftInstances.length,
      attendanceRecordsGenerated: attendanceRecords.length,
      deviationRecordsCount: deviationRecords.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      warnings: warnings.length > 0 ? warnings.slice(0, 10) : [],
      outputData: attendanceRecords,
      deviationData: deviationRecords,
    };

    return NextResponse.json({
      success: true,
      result,
      message: `Processed ${swipes.length} swipes → ${bursts.length} bursts → ${shiftInstances.length} shifts → ${attendanceRecords.length} attendance records`,
      debug: {
        totalRows: rawData.length,
        filteredByStatus,
        filteredByUser,
        allowedUsers: Array.from(allowedUsers),
      },
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
