'use client';

import { AttendanceRecord } from '@/types/attendance';
import { transformToAnalytics } from '@/lib/analytics/dataTransformers';
import DeviationAnalysisChart from './DeviationAnalysisChart';
import AttendanceSummaryTable from './AttendanceSummaryTable';
import { BarChart3 } from 'lucide-react';

interface AttendanceAnalyticsProps {
  data: AttendanceRecord[];
}

export default function AttendanceAnalytics({ data }: AttendanceAnalyticsProps) {
  // Return null if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Transform attendance records into analytics data
  const analytics = transformToAnalytics(data);

  return (
    <div className="mt-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Analytics Dashboard
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Visual insights from your attendance data
        </p>
      </div>

      {/* Summary Table - Full Width */}
      <div className="w-full">
        <AttendanceSummaryTable userStats={analytics.userStats} summary={analytics.summary} />
      </div>

      {/* Deviation Analysis Chart - Single chart below table */}
      <div className="w-full">
        <DeviationAnalysisChart data={analytics.userStats} />
      </div>
    </div>
  );
}
