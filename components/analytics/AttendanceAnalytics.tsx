'use client';

import { AttendanceRecord } from '@/types/attendance';
import { transformToAnalytics } from '@/lib/analytics/dataTransformers';
import DeviationAnalysisChart from './DeviationAnalysisChart';
import AttendanceSummaryTable from './AttendanceSummaryTable';

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
    <div className="mt-nb-12">
      <div className="mb-nb-8 text-center">
        <div className="mb-nb-4 inline-block rounded-nb bg-nb-blue p-nb-4 border-nb-4 border-nb-black shadow-nb">
          <svg
            className="h-12 w-12 text-nb-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h2 className="mb-nb-3 font-display text-3xl font-black uppercase tracking-tight text-nb-black">
          Analytics Dashboard
        </h2>
        <p className="text-lg text-nb-gray-600">
          Visual insights from your attendance data
        </p>
      </div>

      {/* Summary Table - Full Width */}
      <div className="mb-nb-8">
        <AttendanceSummaryTable userStats={analytics.userStats} summary={analytics.summary} />
      </div>

      {/* Deviation Analysis Chart - Single chart below table */}
      <div className="mb-nb-8">
        <DeviationAnalysisChart data={analytics.userStats} />
      </div>
    </div>
  );
}
