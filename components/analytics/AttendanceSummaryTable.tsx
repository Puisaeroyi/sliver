'use client';

import { UserStats, SummaryStats } from '@/types/attendance';
import { Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface AttendanceSummaryTableProps {
  userStats: UserStats[];
  summary: SummaryStats;
}

export default function AttendanceSummaryTable({ userStats, summary }: AttendanceSummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Summary Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 rounded-lg bg-secondary/50 p-4 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold text-foreground">{summary.totalRecords}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">On-Time %</p>
            <p className="text-2xl font-bold text-emerald-500">{summary.onTimePercentage}%</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Deviation %</p>
            <p className="text-2xl font-bold text-amber-500">{summary.deviationPercentage}%</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Avg/User</p>
            <p className="text-2xl font-bold text-primary">{summary.averageAttendance}</p>
          </div>
        </div>

        {/* User Performance Table */}
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    On Time
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Late
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Soon
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Deviation
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((user, index) => (
                  <tr
                    key={user.userName}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium text-foreground">
                      {user.userName}
                    </td>
                    <td className="p-4 text-center align-middle text-foreground">
                      {user.totalRecords}
                    </td>
                    <td className="p-4 text-center align-middle font-medium text-emerald-500">
                      {user.onTimeCount}
                    </td>
                    <td className="p-4 text-center align-middle font-medium text-destructive">
                      {user.lateCount}
                    </td>
                    <td className="p-4 text-center align-middle font-medium text-amber-500">
                      {user.soonCount}
                    </td>
                    <td className="p-4 text-center align-middle text-foreground">
                      {user.lateCount + user.soonCount}
                    </td>
                    <td className="p-4 text-center align-middle">
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
      </CardContent>
    </Card>
  );
}
