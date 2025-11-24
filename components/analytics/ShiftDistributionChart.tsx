'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShiftStats } from '@/types/attendance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface ShiftDistributionChartProps {
  data: ShiftStats[];
}

// Colors for shift types (Modern palette)
const SHIFT_COLORS: Record<string, string> = {
  A: '#FACC15', // Yellow (Morning)
  B: '#3B82F6', // Blue (Afternoon)
  C: '#8B5CF6', // Purple (Night)
};

export default function ShiftDistributionChart({ data }: ShiftDistributionChartProps) {
  // Transform data for Recharts
  const chartData = data.map((shift) => ({
    name: `Shift ${shift.shift} - ${shift.shiftName}`,
    value: shift.count,
    percentage: shift.percentage,
    shift: shift.shift,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: unknown) => {
                const data = entry as { percentage?: number };
                return data.percentage ? `${data.percentage}%` : '';
              }}
              outerRadius={90}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={SHIFT_COLORS[entry.shift] || '#8E8E93'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
              formatter={(value: number, name: string, item: unknown) => {
                const payload = item as { payload?: { percentage?: number } };
                const percentage = payload?.payload?.percentage || 0;
                return [`${value} (${percentage}%)`, name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((shift) => (
            <div key={shift.shift} className="text-center">
              <div
                className="mx-auto mb-2 h-3 w-3 rounded-full"
                style={{ backgroundColor: SHIFT_COLORS[shift.shift] }}
              ></div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Shift {shift.shift} - {shift.shiftName}</p>
              <p className="text-sm font-bold text-foreground">{shift.count}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
