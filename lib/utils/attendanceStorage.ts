/**
 * Attendance data storage utilities using localStorage
 */

export interface AttendanceRecord {
    date: string;        // Format: DD/MM/YYYY
    id: string;          // Employee ID
    name: string;        // Employee name
    shift: string;       // Shift name/code
    checkIn: string;     // Check In time (HH:MM AM/PM)
    breakOut: string;    // Break Time Out (HH:MM AM/PM)
    breakIn: string;     // Break Time In (HH:MM AM/PM)
    checkOut: string;    // Check Out time (HH:MM AM/PM)
}

export interface AttendanceData {
    records: AttendanceRecord[];
    lastUpdated: string; // ISO timestamp
}

const STORAGE_KEY = 'attendance_data';

/**
 * Get all attendance records from localStorage
 */
export function getAttendanceData(): AttendanceData {
    if (typeof window === 'undefined') {
        return { records: [], lastUpdated: new Date().toISOString() };
    }

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return { records: [], lastUpdated: new Date().toISOString() };
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading attendance data:', error);
        return { records: [], lastUpdated: new Date().toISOString() };
    }
}

/**
 * Save attendance records to localStorage
 */
export function saveAttendanceData(records: AttendanceRecord[]): void {
    if (typeof window === 'undefined') return;

    try {
        const data: AttendanceData = {
            records,
            lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving attendance data:', error);
    }
}

/**
 * Merge new records with existing ones
 * Overwrites records with the same date + id combination
 */
export function mergeAttendanceRecords(
    existing: AttendanceRecord[],
    newRecords: AttendanceRecord[]
): AttendanceRecord[] {
    const merged = [...existing];

    newRecords.forEach((newRecord) => {
        const existingIndex = merged.findIndex(
            (r) => r.date === newRecord.date && r.id === newRecord.id
        );

        if (existingIndex >= 0) {
            // Overwrite existing record
            merged[existingIndex] = newRecord;
        } else {
            // Add new record
            merged.push(newRecord);
        }
    });

    // Define shift order for sorting
    const shiftOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3 };

    // Sort by: 1) date (oldest first), 2) shift (A→B→C), 3) name (alphabetically)
    return merged.sort((a, b) => {
        // First, sort by date
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) return dateDiff;

        // If dates are the same, sort by shift
        const shiftA = shiftOrder[a.shift.toUpperCase()] || 999;
        const shiftB = shiftOrder[b.shift.toUpperCase()] || 999;
        const shiftDiff = shiftA - shiftB;
        if (shiftDiff !== 0) return shiftDiff;

        // If shifts are the same, sort by name alphabetically
        return a.name.localeCompare(b.name);
    });
}

/**
 * Filter records by month and year
 */
export function filterByMonth(
    records: AttendanceRecord[],
    month: number,
    year: number
): AttendanceRecord[] {
    return records.filter((record) => {
        const date = parseDate(record.date);
        return date.getMonth() === month && date.getFullYear() === year;
    });
}

/**
 * Parse date string in DD/MM/YYYY format
 */
export function parseDate(dateStr: string): Date {
    try {
        if (!dateStr || typeof dateStr !== 'string') {
            console.error('Invalid date string:', dateStr);
            return new Date(); // Return current date as fallback
        }

        const parts = dateStr.split('/');
        if (parts.length !== 3) {
            console.error('Date string not in DD/MM/YYYY format:', dateStr);
            return new Date();
        }

        const [day, month, year] = parts.map(Number);

        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            console.error('Invalid date components:', { day, month, year, dateStr });
            return new Date();
        }

        const date = new Date(year, month - 1, day);

        // Validate the date is valid
        if (isNaN(date.getTime())) {
            console.error('Created invalid date from:', dateStr);
            return new Date();
        }

        return date;
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
        return new Date();
    }
}

/**
 * Get unique months from records
 */
export function getAvailableMonths(records: AttendanceRecord[]): Array<{ month: number; year: number }> {
    const monthsSet = new Set<string>();

    records.forEach((record) => {
        const date = parseDate(record.date);
        const month = date.getMonth();
        const year = date.getFullYear();

        // Only add if valid
        if (!isNaN(month) && !isNaN(year)) {
            const key = `${year}-${month}`;
            monthsSet.add(key);
        }
    });

    return Array.from(monthsSet)
        .map((key) => {
            const [year, month] = key.split('-').map(Number);
            return { month, year };
        })
        .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
}
