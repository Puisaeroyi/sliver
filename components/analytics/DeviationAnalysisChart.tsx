'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserStats } from '@/types/attendance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface DeviationAnalysisChartProps {
  data: UserStats[];
}

export default function DeviationAnalysisChart({ data }: DeviationAnalysisChartProps) {
  // Transform data for stacked Recharts
  const chartData = data.map((user) => ({
    name: user.userName,
    onTime: user.onTimePercentage,
    late: user.latePercentage,
    soon: user.soonPercentage,
    // Optional verification
    total: user.onTimePercentage + user.latePercentage + user.soonPercentage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deviation Analysis by User</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              label={{
                value: 'PERCENTAGE (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="onTime" stackId="deviation" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-ontime-${index}`} fill="#10B981" strokeWidth={0} />
              ))}
            </Bar>
            <Bar dataKey="late" stackId="deviation" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-late-${index}`} fill="#EF4444" strokeWidth={0} />
              ))}
            </Bar>
            <Bar dataKey="soon" stackId="deviation" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-soon-${index}`} fill="#F97316" strokeWidth={0} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-medium text-muted-foreground">On Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive"></div>
            <span className="text-sm font-medium text-muted-foreground">Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <span className="text-sm font-medium text-muted-foreground">Soon</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
