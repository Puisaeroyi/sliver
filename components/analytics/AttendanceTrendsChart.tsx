'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendData } from '@/types/attendance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface AttendanceTrendsChartProps {
  data: TrendData[];
}

// Colors for user lines (Modern palette)
const USER_COLORS: Record<string, string> = {
  'Bui Duc Toan': '#3B82F6',        // Blue
  'Pham Tan Phat': '#EF4444',       // Red
  'Mac Le Duc Minh': '#10B981',     // Green
  'Nguyen Hoang Trieu': '#F59E0B',  // Amber/Orange
};

export default function AttendanceTrendsChart({ data }: AttendanceTrendsChartProps) {
  // Only show if we have multi-day data
  if (!data || data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground font-medium">
            <p>Multi-day data required for trend analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract user names from first data point (excluding 'date')
  const userNames = Object.keys(data[0] || {}).filter((key) => key !== 'date');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <XAxis
              dataKey="date"
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
                value: 'ATTENDANCE COUNT',
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
            <Legend
              wrapperStyle={{
                paddingTop: '10px',
              }}
            />
            {userNames.map((userName) => (
              <Line
                key={userName}
                type="monotone"
                dataKey={userName}
                stroke={USER_COLORS[userName] || '#8E8E93'}
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--background))', stroke: USER_COLORS[userName] || '#8E8E93', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
