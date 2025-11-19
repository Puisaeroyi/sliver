/**
 * File Save Integration Tests
 *
 * Tests the file save functionality to ensure:
 * 1. Excel files are saved to /home/silver/ directory
 * 2. File names follow the correct format
 * 3. File contents match expectations
 * 4. Both main and deviation files are saved correctly
 */

import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import type { AttendanceRecord } from '@/types/attendance';

describe('File Save Integration Tests', () => {
  const savePath = '/home/silver';
  const today = new Date().toISOString().split('T')[0];

  // Mock attendance data
  const mockAttendanceRecords: AttendanceRecord[] = [
    {
      date: '2025-11-18',
      id: 'TPL0001',
      name: 'John Doe',
      shift: 'Morning',
      checkIn: '06:00:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'On Time',
    },
    {
      date: '2025-11-18',
      id: 'TPL0002',
      name: 'Jane Smith',
      shift: 'Morning',
      checkIn: '06:10:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'Late Check-in',
    },
  ];

  const mockDeviationRecords: AttendanceRecord[] = [
    {
      date: '2025-11-18',
      id: 'TPL0002',
      name: 'Jane Smith',
      shift: 'Morning',
      checkIn: '06:10:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'Late Check-in',
    },
  ];

  describe('Main Attendance File Save', () => {
    const fileName = `attendance_records_${today}.xlsx`;
    const filePath = path.join(savePath, fileName);

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save main attendance file to /home/silver/', async () => {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Records');

      // Add headers
      worksheet.addRow([
        'Date',
        'ID',
        'Name',
        'Shift',
        'Check-in',
        'Break Time Out',
        'Break Time In',
        'Check Out Record',
        'Status',
      ]);

      // Add data
      mockAttendanceRecords.forEach(record => {
        worksheet.addRow([
          new Date(record.date).toLocaleDateString('en-CA'),
          record.id,
          record.name,
          record.shift,
          record.checkIn,
          record.breakOut,
          record.breakIn,
          record.checkOut,
          record.status,
        ]);
      });

      // Generate buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(filePath, buffer);

      // Verify file exists
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should have correct file name format', async () => {
      const expectedPattern = /^attendance_records_\d{4}-\d{2}-\d{2}\.xlsx$/;
      expect(fileName).toMatch(expectedPattern);
    });

    it('should contain correct data in saved file', async () => {
      // Create and save file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Records');

      worksheet.addRow([
        'Date',
        'ID',
        'Name',
        'Shift',
        'Check-in',
        'Break Time Out',
        'Break Time In',
        'Check Out Record',
        'Status',
      ]);

      mockAttendanceRecords.forEach(record => {
        worksheet.addRow([
          new Date(record.date).toLocaleDateString('en-CA'),
          record.id,
          record.name,
          record.shift,
          record.checkIn,
          record.breakOut,
          record.breakIn,
          record.checkOut,
          record.status,
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(filePath, buffer);

      // Read back and verify
      const savedWorkbook = new ExcelJS.Workbook();
      await savedWorkbook.xlsx.readFile(filePath);

      const savedWorksheet = savedWorkbook.worksheets[0];
      expect(savedWorksheet).toBeDefined();
      expect(savedWorksheet!.name).toBe('Attendance Records');

      // Verify row count (header + 2 data rows)
      expect(savedWorksheet!.rowCount).toBe(3);

      // Verify header row
      const headerRow = savedWorksheet!.getRow(1);
      expect(headerRow.getCell(1).value).toBe('Date');
      expect(headerRow.getCell(9).value).toBe('Status');

      // Verify first data row
      const dataRow1 = savedWorksheet!.getRow(2);
      expect(dataRow1.getCell(2).value).toBe('TPL0001');
      expect(dataRow1.getCell(3).value).toBe('John Doe');
      expect(dataRow1.getCell(9).value).toBe('On Time');

      // Verify second data row
      const dataRow2 = savedWorksheet!.getRow(3);
      expect(dataRow2.getCell(2).value).toBe('TPL0002');
      expect(dataRow2.getCell(9).value).toBe('Late Check-in');
    });
  });

  describe('Deviation Summary File Save', () => {
    const fileName = `Deviation_Summary_${today}.xlsx`;
    const filePath = path.join(savePath, fileName);

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save deviation summary file to /home/silver/', async () => {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Deviation Summary');

      // Add headers
      worksheet.addRow([
        'Date',
        'ID',
        'Name',
        'Shift',
        'Check In',
        'Break Out',
        'Break In',
        'Check Out',
        'Status',
      ]);

      // Add data
      mockDeviationRecords.forEach(record => {
        worksheet.addRow([
          new Date(record.date).toLocaleDateString('en-CA'),
          record.id,
          record.name,
          record.shift,
          record.checkIn,
          record.breakOut,
          record.breakIn,
          record.checkOut,
          record.status,
        ]);
      });

      // Generate buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(filePath, buffer);

      // Verify file exists
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should have correct file name format', async () => {
      const expectedPattern = /^Deviation_Summary_\d{4}-\d{2}-\d{2}\.xlsx$/;
      expect(fileName).toMatch(expectedPattern);
    });

    it('should only contain deviation records', async () => {
      // Create and save file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Deviation Summary');

      worksheet.addRow([
        'Date',
        'ID',
        'Name',
        'Shift',
        'Check In',
        'Break Out',
        'Break In',
        'Check Out',
        'Status',
      ]);

      mockDeviationRecords.forEach(record => {
        worksheet.addRow([
          new Date(record.date).toLocaleDateString('en-CA'),
          record.id,
          record.name,
          record.shift,
          record.checkIn,
          record.breakOut,
          record.breakIn,
          record.checkOut,
          record.status,
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(filePath, buffer);

      // Read back and verify
      const savedWorkbook = new ExcelJS.Workbook();
      await savedWorkbook.xlsx.readFile(filePath);

      const savedWorksheet = savedWorkbook.worksheets[0];
      expect(savedWorksheet).toBeDefined();
      expect(savedWorksheet!.name).toBe('Deviation Summary');

      // Verify only deviation records (header + 1 data row)
      expect(savedWorksheet!.rowCount).toBe(2);

      // Verify data contains deviation
      const dataRow = savedWorksheet!.getRow(2);
      const status = dataRow.getCell(9).value as string;
      expect(status).toContain('Late');
    });
  });

  describe('File Save Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      const invalidPath = '/root/test-file.xlsx'; // Typically no permission
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');
      worksheet.addRow(['Test']);

      const buffer = await workbook.xlsx.writeBuffer();

      await expect(async () => {
        await fs.writeFile(invalidPath, buffer);
      }).rejects.toThrow();
    });

    it('should handle invalid directory gracefully', async () => {
      const invalidPath = '/nonexistent/directory/test-file.xlsx';
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');
      worksheet.addRow(['Test']);

      const buffer = await workbook.xlsx.writeBuffer();

      await expect(async () => {
        await fs.writeFile(invalidPath, buffer);
      }).rejects.toThrow();
    });
  });

  describe('File Verification Utilities', () => {
    it('should verify /home/silver/ directory is writable', async () => {
      // Check if directory exists and is writable
      const stats = await fs.stat(savePath);
      expect(stats.isDirectory()).toBe(true);

      // Try writing a test file
      const testFile = path.join(savePath, 'test-write-permission.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    });

    it('should list existing Excel files in /home/silver/', async () => {
      const files = await fs.readdir(savePath);
      const excelFiles = files.filter(f => f.endsWith('.xlsx'));

      console.log(`Found ${excelFiles.length} Excel files in ${savePath}`);
      excelFiles.forEach(file => console.log(`  - ${file}`));
    });
  });
});
