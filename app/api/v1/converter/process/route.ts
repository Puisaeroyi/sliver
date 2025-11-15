/**
 * CSV to XLSX Converter API Route
 * POST /api/v1/converter/process
 *
 * Converts CSV files to XLSX format with specific column extraction
 * Extracts columns [0, 1, 2, 3, 4, 6] and renames to:
 * ID, Name, Date, Time, Type, Status
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Column indices to extract from CSV (0-indexed)
const COLUMN_INDICES = [0, 1, 2, 3, 4, 6];

// Column names for output XLSX
const COLUMN_NAMES = ['ID', 'Name', 'Date', 'Time', 'Type', 'Status'];

/**
 * Parse CSV line with proper quote handling
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Convert CSV to XLSX with column extraction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const delimiter = (formData.get('delimiter') as string) || ',';

    // Validate file upload
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum allowed size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. ` +
                 `Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Read and parse CSV content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty CSV file' }, { status: 400 });
    }

    // Parse all lines
    const parsedLines = lines.map(line => parseCSVLine(line, delimiter));

    // Validate that CSV has enough columns
    const maxColumnIndex = Math.max(...COLUMN_INDICES);
    const firstRow = parsedLines[0];

    if (!firstRow || firstRow.length <= maxColumnIndex) {
      return NextResponse.json(
        {
          error: `CSV has only ${firstRow?.length || 0} columns, but column index ${maxColumnIndex} (column ${maxColumnIndex + 1}) is required. ` +
                 `Please ensure your CSV has at least ${maxColumnIndex + 1} columns.`
        },
        { status: 400 }
      );
    }

    // Extract specified columns from all rows
    const extractedData = parsedLines.map(row => {
      return COLUMN_INDICES.map(index => row[index] || '');
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Add header row with column names
    worksheet.addRow(COLUMN_NAMES);

    // Style header row (bold, dark background)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    extractedData.forEach((row) => {
      worksheet.addRow(row);
    });

    // Auto-fit columns efficiently
    const columnCount = extractedData[0]?.length || COLUMN_NAMES.length;
    for (let col = 1; col <= columnCount; col++) {
      let maxLength = 10;
      const headerLength = (COLUMN_NAMES[col - 1] || '').length;
      maxLength = Math.max(maxLength, headerLength);

      // Check data rows for this column
      extractedData.forEach((row) => {
        const cellValue = row[col - 1];
        if (cellValue !== undefined && cellValue !== null) {
          maxLength = Math.max(maxLength, cellValue.toString().length);
        }
      });

      // Set column width
      worksheet.getColumn(col).width = Math.min(maxLength + 2, 50);
    }

    // Generate XLSX buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create filename
    const originalName = file.name.replace('.csv', '');
    const outputFilename = `${originalName}_converted.xlsx`;

    // Return XLSX file as download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('CSV to XLSX conversion error:', error);
    return NextResponse.json(
      {
        error: 'Conversion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
