/**
 * Deviation Parser for Cell-Level Highlighting
 *
 * Parses consolidated status strings into individual deviation flags
 * for cell highlighting and deviation column population.
 */

import ExcelJS from 'exceljs';

/**
 * Individual deviation flags for each attendance point
 */
export interface DeviationFlags {
  checkInLate: boolean;
  breakOutEarly: boolean;
  breakInLate: boolean;
  checkOutEarly: boolean;
  hasMissingTimestamps: boolean;
}

/**
 * Cell styling configuration for deviation types
 */
export interface CellStyleConfig {
  backgroundColor: string;
  textColor?: string;
}

/**
 * Parse consolidated status string into individual deviation flags
 *
 * @param status - Consolidated status string from attendance processing
 * @returns DeviationFlags object with individual deviation indicators
 */
export function parseDeviations(status: string): DeviationFlags {
  const flags: DeviationFlags = {
    checkInLate: false,
    breakOutEarly: false,
    breakInLate: false,
    checkOutEarly: false,
    hasMissingTimestamps: false,
  };

  if (!status || status === 'On Time') {
    return flags;
  }

  // Check for missing timestamps
  if (status.includes('[Missing:')) {
    flags.hasMissingTimestamps = true;
  }

  // Parse individual deviations
  flags.checkInLate = status.includes('Late Check-in') || status.includes('Check-in Late');
  flags.breakOutEarly = status.includes('Leave Soon Break Out') || status.includes('Break Out Early');
  flags.breakInLate = status.includes('Late Break In') || status.includes('Break In Late');
  flags.checkOutEarly = status.includes('Leave Soon Check Out') || status.includes('Check Out Early') ||
                        (status.includes('Leave Soon') && !status.includes('Break Out') && !status.includes('Check Out') && !status.includes('Break In'));

  return flags;
}

/**
 * Get cell background color based on deviation type
 *
 * @param deviationFlags - Parsed deviation flags
 * @param timeValue - Time value to check if missing
 * @param deviationType - Type of deviation to check
 * @returns Excel background color ARGB value
 */
export function getCellBackgroundColor(
  deviationFlags: DeviationFlags,
  timeValue: string,
  deviationType: 'checkIn' | 'breakOut' | 'breakIn' | 'checkOut'
): string {
  // Missing timestamps
  if (!timeValue || timeValue.trim() === '') {
    return 'FFE0E0E0'; // Light gray
  }

  // Deviation-based coloring
  switch (deviationType) {
    case 'checkIn':
      return deviationFlags.checkInLate ? 'FFFFC7CE' : ''; // Red if late
    case 'breakOut':
      return deviationFlags.breakOutEarly ? 'FFFFFF00' : ''; // Yellow if early
    case 'breakIn':
      return deviationFlags.breakInLate ? 'FFFFC7CE' : ''; // Red if late
    case 'checkOut':
      return deviationFlags.checkOutEarly ? 'FFFFFF00' : ''; // Yellow if early
    default:
      return '';
  }
}

/**
 * Get deviation text for deviation columns
 *
 * @param deviationFlags - Parsed deviation flags
 * @param deviationType - Type of deviation to get text for
 * @returns Deviation text or empty string
 */
export function getDeviationText(
  deviationFlags: DeviationFlags,
  deviationType: 'checkIn' | 'breakOut' | 'breakIn' | 'checkOut'
): string {
  switch (deviationType) {
    case 'checkIn':
      return deviationFlags.checkInLate ? 'Late' : '';
    case 'breakOut':
      return deviationFlags.breakOutEarly ? 'Early' : '';
    case 'breakIn':
      return deviationFlags.breakInLate ? 'Late' : '';
    case 'checkOut':
      return deviationFlags.checkOutEarly ? 'Early' : '';
    default:
      return '';
  }
}

/**
 * Extract missed punch information from status string
 *
 * @param status - Consolidated status string
 * @returns Comma-separated list of missed punches with abbreviated labels
 */
export function getMissedPunch(status: string): string {
  if (!status || !status.includes('[Missing:')) {
    return '';
  }

  // Extract missing timestamps from status string
  const missingMatch = status.match(/\[Missing: ([^\]]+)\]/);
  if (missingMatch && missingMatch[1]) {
    // Trim whitespace and normalize spaces between items
    const missingItems = missingMatch[1]
      .trim()
      .split(',')
      .map(item => item.trim());

    // Convert full names to abbreviated versions
    const abbreviatedItems = missingItems.map(item => {
      switch (item) {
        case 'Check In':
          return 'CI';
        case 'Check Out':
          return 'CO';
        case 'Break Out':
          return 'BTO';
        case 'Break In':
          return 'BTI';
        default:
          return item; // Keep as-is if not recognized
      }
    });

    return abbreviatedItems.join(', ');
  }

  return '';
}

/**
 * Apply cell styling based on deviation type and value
 *
 * @param cell - ExcelJS cell object
 * @param backgroundColor - Background color ARGB value
 */
export function applyCellStyle(cell: ExcelJS.Cell, backgroundColor: string): void {
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
  };

  // Apply background color if specified
  if (backgroundColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: backgroundColor },
    };
  }
}

/**
 * Apply header styling
 *
 * @param cell - ExcelJS cell object
 */
export function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue background
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
}