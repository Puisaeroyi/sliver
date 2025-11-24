'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
    getAttendanceData,
    filterByMonth,
    getAvailableMonths,
    type AttendanceRecord,
} from '@/lib/utils/attendanceStorage';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function AttendanceDetailsTable() {
    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Load data on mount and when localStorage changes
    useEffect(() => {
        loadData();

        // Listen for storage events (when data is updated from processor page)
        const handleStorageChange = () => {
            loadData();
        };

        window.addEventListener('storage', handleStorageChange);
        // Custom event for same-tab updates
        window.addEventListener('attendanceDataUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('attendanceDataUpdated', handleStorageChange);
        };
    }, []);

    // Filter records when month/year changes
    useEffect(() => {
        const filtered = filterByMonth(allRecords, currentMonth, currentYear);
        setFilteredRecords(filtered);
    }, [allRecords, currentMonth, currentYear]);

    const loadData = () => {
        const data = getAttendanceData();
        setAllRecords(data.records);

        const months = getAvailableMonths(data.records);

        // Set to most recent month if available, otherwise use current month
        if (months.length > 0) {
            setCurrentMonth(months[0]?.month ?? new Date().getMonth());
            setCurrentYear(months[0]?.year ?? new Date().getFullYear());
        } else {
            // No data yet, use current month/year
            setCurrentMonth(new Date().getMonth());
            setCurrentYear(new Date().getFullYear());
        }
    };

    const handlePreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                        <Calendar className="h-6 w-6" />
                        Attendance Details
                    </CardTitle>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePreviousMonth}
                            className="p-2 rounded-lg hover:bg-accent transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="min-w-[140px] text-center font-semibold">
                            {MONTHS[currentMonth]} {currentYear}
                        </div>

                        <button
                            onClick={handleNextMonth}
                            className="p-2 rounded-lg hover:bg-accent transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No attendance records</p>
                        <p className="text-sm mt-2">
                            {allRecords.length === 0
                                ? 'Process an attendance file to see records here'
                                : `No records found for ${MONTHS[currentMonth]} ${currentYear}`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">ID</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Shift</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">CI</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">BTO</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">BTI</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">CO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record, index) => (
                                    <tr
                                        key={`${record.date}-${record.id}-${index}`}
                                        className="border-b border-border hover:bg-accent/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{record.date}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{record.id}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{record.name}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{record.shift}</td>
                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{record.checkIn || '---'}</td>
                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{record.breakOut || '---'}</td>
                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{record.breakIn || '---'}</td>
                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{record.checkOut || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
