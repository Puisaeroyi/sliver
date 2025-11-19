/**
 * Download API Route
 * POST /api/v1/processor/download
 * Generates and downloads Excel file from processed attendance data
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { parseDeviations, getCellBackgroundColor, applyCellStyle, applyHeaderStyle } from '@/lib/utils/deviationParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate and download Excel file from attendance records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected array of attendance records.' },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data to export' },
        { status: 400 }
      );
    }

    // Create new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Records');

    // Define headers with new column structure
    const headers = [
      'Date',
      'ID',
      'Name',
      'Shift',
      'CI',
      'BTO',
      'BTI',
      'CO',
      'CI Late',
      'BTO Early',
      'BTI Late',
      'CO Early',
      'Missed Punch'
    ];

    // Add header row
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      applyHeaderStyle(cell);
    });

    // Add data rows with cell highlighting
    data.forEach((record) => {
      // Parse deviations for cell styling
      const deviationFlags = parseDeviations(record.status || '');

      // Build row data with new deviation columns
      const rowData = [
        record.date ? new Date(record.date).toLocaleDateString('en-CA') : '', // YYYY-MM-DD format
        record.id || '',
        record.name || '',
        record.shift || '',
        record.checkIn || '',
        record.breakOut || '',
        record.breakIn || '',
        record.checkOut || '',
        record.checkInLate || '',
        record.breakOutEarly || '',
        record.breakInLate || '',
        record.checkOutEarly || '',
        record.missedPunch || ''
      ];

      const row = worksheet.addRow(rowData);

      // Apply cell-level styling with highlighting
      row.eachCell((cell, colNum) => {
        let backgroundColor = '';

        // Apply highlighting to time columns based on deviations
        switch (colNum) {
          case 5: // Check In column
            backgroundColor = getCellBackgroundColor(deviationFlags, record.checkIn || '', 'checkIn');
            break;
          case 6: // Break Out column
            backgroundColor = getCellBackgroundColor(deviationFlags, record.breakOut || '', 'breakOut');
            break;
          case 7: // Break In column
            backgroundColor = getCellBackgroundColor(deviationFlags, record.breakIn || '', 'breakIn');
            break;
          case 8: // Check Out column
            backgroundColor = getCellBackgroundColor(deviationFlags, record.checkOut || '', 'checkOut');
            break;
          case 13: // Missed Punch column - light gray for missing punches
            if (record.missedPunch) {
              backgroundColor = 'FFE0E0E0'; // Light gray
            }
            break;
        }

        applyCellStyle(cell, backgroundColor);
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 12 }, // Date
      { width: 10 }, // ID
      { width: 20 }, // Name
      { width: 12 }, // Shift
      { width: 12 }, // Check In
      { width: 12 }, // Break Out
      { width: 12 }, // Break In
      { width: 12 }, // Check Out
      { width: 15 }, // Check-in Late
      { width: 18 }, // Break Time Out Early
      { width: 15 }, // Break Time In Late
      { width: 15 }, // Check-Out Early
      { width: 20 }  // Missed Punch (wider for multiple missing fields)
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // File name
    const fileName = `attendance_records_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save to server directory (if configured)
    const outputDir = process.env.EXCEL_OUTPUT_DIR;
    if (outputDir) {
      const fullPath = path.join(outputDir, fileName);

      try {
        // Validate path is within allowed directory
        const resolvedPath = path.resolve(fullPath);
        const resolvedDir = path.resolve(outputDir);
        if (!resolvedPath.startsWith(resolvedDir)) {
          throw new Error('Invalid file path - path traversal detected');
        }

        await fs.writeFile(fullPath, buffer as unknown as Buffer);
        console.log(`✅ Main Excel saved to: ${fullPath}`);
      } catch (error) {
        console.error(`❌ Failed to save Excel to ${fullPath}:`, error);
        // Continue with browser download even if save fails
      }
    }

    // Return Excel file as response (browser download)
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}