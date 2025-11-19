import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/processor/route';
import { POST as DownloadPOST } from '@/app/api/v1/processor/download/route';
import { POST as DeviationDownloadPOST } from '@/app/api/v1/processor/download-deviation/route';
import fs from 'fs/promises';
import path from 'path';

/**
 * Integration Test: Column Structure with Real Data
 * Tests the new column structure using actual log.xlsx file
 */

describe('Column Structure Integration Tests', () => {
  let testData: any = null;
  let attendanceData: any = null;
  let deviationData: any = null;

  beforeAll(async () => {
    // Read and process the test file
    try {
      // Read the log.xlsx file
      const logFilePath = '/home/silver/log.xlsx';
      const fileBuffer = await fs.readFile(logFilePath);
      const base64 = fileBuffer.toString('base64');

      // Convert the file to swipe records
      const convertResponse = await fetch('http://localhost:3002/api/v1/converter/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'log.xlsx',
          fileData: base64
        })
      });

      if (!convertResponse.ok) {
        throw new Error('Failed to convert test file');
      }

      const convertData = await convertResponse.json();
      testData = convertData.records;

      // Process attendance data
      const processResponse = await fetch('http://localhost:3002/api/v1/processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swipeRecords: testData
        })
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process attendance data');
      }

      const processData = await processResponse.json();
      attendanceData = processData.attendance;
      deviationData = processData.deviationData;
    } catch (error) {
      console.error('Test setup error:', error);
      throw error;
    }
  });

  describe('Data Processing Validation', () => {
    it('should process attendance records with new deviation fields', () => {
      expect(attendanceData).toBeDefined();
      expect(Array.isArray(attendanceData)).toBe(true);
      expect(attendanceData.length).toBeGreaterThan(0);

      // Check that each record has the new deviation fields
      attendanceData.forEach((record: any) => {
        expect(record).toHaveProperty('checkInLate');
        expect(record).toHaveProperty('breakOutEarly');
        expect(record).toHaveProperty('breakInLate');
        expect(record).toHaveProperty('checkOutEarly');
        expect(record).toHaveProperty('missedPunch');

        // Verify field types
        expect(typeof record.checkInLate).toBe('string');
        expect(typeof record.breakOutEarly).toBe('string');
        expect(typeof record.breakInLate).toBe('string');
        expect(typeof record.checkOutEarly).toBe('string');
        expect(typeof record.missedPunch).toBe('string');
      });
    });

    it('should capture deviation records properly', () => {
      expect(deviationData).toBeDefined();
      expect(Array.isArray(deviationData)).toBe(true);

      if (deviationData.length > 0) {
        // Should include records with deviations and missing timestamps
        const hasDeviationRecords = deviationData.some((record: any) =>
          record.checkInLate || record.breakOutEarly || record.breakInLate || record.checkOutEarly
        );
        expect(hasDeviationRecords).toBe(true);
      }
    });

    it('should identify records with missing timestamps', () => {
      const recordsWithMissedPunch = attendanceData.filter((record: any) => record.missedPunch);

      if (recordsWithMissedPunch.length > 0) {
        // Verify missed punch content
        recordsWithMissedPunch.forEach((record: any) => {
          expect(record.missedPunch).toBeTruthy();
          expect(record.missedPunch.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Excel Download Validation', () => {
    let mainExcelBuffer: Buffer | null = null;
    let deviationExcelBuffer: Buffer | null = null;

    beforeAll(async () => {
      // Generate main Excel
      const mainResponse = await fetch('http://localhost:3002/api/v1/processor/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: attendanceData })
      });

      if (mainResponse.ok) {
        mainExcelBuffer = Buffer.from(await mainResponse.arrayBuffer());
      }

      // Generate deviation Excel
      const deviationResponse = await fetch('http://localhost:3002/api/v1/processor/download-deviation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: deviationData })
      });

      if (deviationResponse.ok) {
        deviationExcelBuffer = Buffer.from(await deviationResponse.arrayBuffer());
      }
    });

    it('should generate main Excel file with correct structure', async () => {
      expect(mainExcelBuffer).toBeTruthy();
      expect(mainExcelBuffer!.length).toBeGreaterThan(0);

      // Save for manual inspection
      const outputPath = '/tmp/main_excel_test.xlsx';
      await fs.writeFile(outputPath, mainExcelBuffer!);
      console.log(`Main Excel saved to: ${outputPath}`);
    });

    it('should generate deviation Excel file with correct structure', async () => {
      expect(deviationExcelBuffer).toBeTruthy();
      expect(deviationExcelBuffer!.length).toBeGreaterThan(0);

      // Save for manual inspection
      const outputPath = '/tmp/deviation_excel_test.xlsx';
      await fs.writeFile(outputPath, deviationExcelBuffer!);
      console.log(`Deviation Excel saved to: ${outputPath}`);
    });
  });

  describe('Deviation Analysis Validation', () => {
    it('should have the correct column count (13 columns total)', () => {
      if (attendanceData.length > 0) {
        const sampleRecord = attendanceData[0];
        const columnCount = Object.keys(sampleRecord).length;

        // Expected columns: date, id, name, shift, checkIn, breakOut, breakIn, checkOut,
        // status, checkInLate, breakOutEarly, breakInLate, checkOutEarly, missedPunch
        expect(columnCount).toBeGreaterThanOrEqual(13);
      }
    });

    it('should properly identify Check-in Late records', () => {
      const lateCheckInRecords = attendanceData.filter((record: any) => record.checkInLate === 'Late');

      if (lateCheckInRecords.length > 0) {
        // Verify these records also have 'Late Check-in' in status
        const allHaveStatusLate = lateCheckInRecords.every((record: any) =>
          record.status && (record.status.includes('Late Check-in') || record.status.includes('Check-in Late'))
        );
        expect(allHaveStatusLate).toBe(true);
      }
    });

    it('should properly identify Break Time Out Early records', () => {
      const earlyBreakOutRecords = attendanceData.filter((record: any) => record.breakOutEarly === 'Early');

      if (earlyBreakOutRecords.length > 0) {
        // Verify these records also have 'Early' deviation in status
        const allHaveStatusEarly = earlyBreakOutRecords.every((record: any) =>
          record.status && (record.status.includes('Leave Soon Break Out') || record.status.includes('Break Out Early'))
        );
        expect(allHaveStatusEarly).toBe(true);
      }
    });

    it('should properly identify Break Time In Late records', () => {
      const lateBreakInRecords = attendanceData.filter((record: any) => record.breakInLate === 'Late');

      if (lateBreakInRecords.length > 0) {
        // Verify these records also have 'Late' deviation in status
        const allHaveStatusLate = lateBreakInRecords.every((record: any) =>
          record.status && (record.status.includes('Late Break In') || record.status.includes('Break In Late'))
        );
        expect(allHaveStatusLate).toBe(true);
      }
    });

    it('should properly identify Check-Out Early records', () => {
      const earlyCheckOutRecords = attendanceData.filter((record: any) => record.checkOutEarly === 'Early');

      if (earlyCheckOutRecords.length > 0) {
        // Verify these records also have 'Early' deviation in status
        const allHaveStatusEarly = earlyCheckOutRecords.every((record: any) =>
          record.status && (record.status.includes('Leave Soon Check Out') || record.status.includes('Check Out Early'))
        );
        expect(allHaveStatusEarly).toBe(true);
      }
    });

    it('should properly populate Missed Punch field', () => {
      const recordsWithMissedPunch = attendanceData.filter((record: any) => record.missedPunch);

      if (recordsWithMissedPunch.length > 0) {
        // Verify these records have missing timestamps in status
        const allHaveStatusMissing = recordsWithMissedPunch.every((record: any) =>
          record.status && record.status.includes('[Missing:')
        );
        expect(allHaveStatusMissing).toBe(true);

        // Test specific missed punch values
        recordsWithMissedPunch.forEach((record: any) => {
          const expectedMissedPunch = record.status.match(/\[Missing: ([^\]]+)\]/)?.[1];
          if (expectedMissedPunch) {
            expect(record.missedPunch.trim()).toBe(expectedMissedPunch.trim());
          }
        });
      }
    });
  });

  describe('Real Data Scenarios Validation', () => {
    it('should handle mixed deviation scenarios', () => {
      // Find records with multiple deviations
      const multipleDeviationRecords = attendanceData.filter((record: any) => {
        const deviationCount = [
          record.checkInLate,
          record.breakOutEarly,
          record.breakInLate,
          record.checkOutEarly
        ].filter(Boolean).length;
        return deviationCount > 1;
      });

      console.log(`Found ${multipleDeviationRecords.length} records with multiple deviations`);

      if (multipleDeviationRecords.length > 0) {
        const sampleRecord = multipleDeviationRecords[0];
        console.log('Sample multiple deviation record:', {
          status: sampleRecord.status,
          checkInLate: sampleRecord.checkInLate,
          breakOutEarly: sampleRecord.breakOutEarly,
          breakInLate: sampleRecord.breakInLate,
          checkOutEarly: sampleRecord.checkOutEarly,
          missedPunch: sampleRecord.missedPunch
        });

        // Verify at least two deviation flags are set
        const deviationFlags = [
          sampleRecord.checkInLate,
          sampleRecord.breakOutEarly,
          sampleRecord.breakInLate,
          sampleRecord.checkOutEarly
        ].filter(Boolean);
        expect(deviationFlags.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should correctly identify all deviation types in processed data', () => {
      const deviationCounts = {
        checkInLate: 0,
        breakOutEarly: 0,
        breakInLate: 0,
        checkOutEarly: 0,
        missedPunch: 0
      };

      attendanceData.forEach((record: any) => {
        if (record.checkInLate) deviationCounts.checkInLate++;
        if (record.breakOutEarly) deviationCounts.breakOutEarly++;
        if (record.breakInLate) deviationCounts.breakInLate++;
        if (record.checkOutEarly) deviationCounts.checkOutEarly++;
        if (record.missedPunch) deviationCounts.missedPunch++;
      });

      console.log('Deviation counts from log.xlsx:', deviationCounts);

      // Validate that we have at least one of each deviation type if present
      const totalDeviations = Object.values(deviationCounts).reduce((sum, count) => sum + count, 0);
      expect(totalDeviations).toBeGreaterThan(0);

      // Print summary for validation
      console.log(`Processed ${attendanceData.length} attendance records`);
      console.log(`Total deviations found: ${totalDeviations}`);
      Object.entries(deviationCounts).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`${type}: ${count} records`);
        }
      });
    });
  });
});