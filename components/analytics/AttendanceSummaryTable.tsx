'use client';

import { UserStats, SummaryStats } from '@/types/attendance';
import { Badge } from '@/components/ui';

interface AttendanceSummaryTableProps {
  userStats: UserStats[];
  summary: SummaryStats;
}

export default function AttendanceSummaryTable({ userStats, summary }: AttendanceSummaryTableProps) {
  return (
    <div className="bg-nb-white border-nb-4 border-nb-black shadow-nb p-nb-6">
      <h3 className="mb-nb-4 font-display text-xl font-black uppercase tracking-tight text-nb-black">
        User Performance Summary
      </h3>

      {/* Overall Summary Stats */}
      <div className="mb-nb-6 grid grid-cols-2 gap-nb-4 border-nb-4 border-nb-black bg-nb-gray-50 p-nb-4 md:grid-cols-4">
        <div>
          <p className="mb-nb-1 text-xs font-bold uppercase text-nb-gray-600">Total Records</p>
          <p className="font-display text-2xl font-black text-nb-black">{summary.totalRecords}</p>
        </div>
        <div>
          <p className="mb-nb-1 text-xs font-bold uppercase text-nb-gray-600">On-Time %</p>
          <p className="font-display text-2xl font-black text-nb-green">{summary.onTimePercentage}%</p>
        </div>
        <div>
          <p className="mb-nb-1 text-xs font-bold uppercase text-nb-gray-600">Deviation %</p>
          <p className="font-display text-2xl font-black text-nb-orange">{summary.deviationPercentage}%</p>
        </div>
        <div>
          <p className="mb-nb-1 text-xs font-bold uppercase text-nb-gray-600">Avg/User</p>
          <p className="font-display text-2xl font-black text-nb-blue">{summary.averageAttendance}</p>
        </div>
      </div>

      {/* User Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-nb-black text-nb-white">
              <th className="border-nb-2 border-nb-black p-nb-3 text-left text-xs font-black uppercase">
                User
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                Total
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                On Time
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                Late
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                Soon
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                Deviation
              </th>
              <th className="border-nb-2 border-nb-black p-nb-3 text-center text-xs font-black uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {userStats.map((user, index) => (
              <tr
                key={user.userName}
                className={index % 2 === 0 ? 'bg-nb-white' : 'bg-nb-gray-50'}
              >
                <td className="border-nb-2 border-nb-black p-nb-3 font-bold text-nb-black">
                  {user.userName}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center font-bold text-nb-black">
                  {user.totalRecords}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center font-bold text-nb-green">
                  {user.onTimeCount}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center font-bold text-nb-red">
                  {user.lateCount}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center font-bold text-nb-orange">
                  {user.soonCount}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center font-bold text-nb-black">
                  {user.lateCount + user.soonCount}
                </td>
                <td className="border-nb-2 border-nb-black p-nb-3 text-center">
                  {user.deviationPercentage === 0 ? (
                    <Badge variant="success">Perfect</Badge>
                  ) : user.deviationPercentage < 25 ? (
                    <Badge variant="warning">Good</Badge>
                  ) : (
                    <Badge variant="error">Needs Improvement</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
