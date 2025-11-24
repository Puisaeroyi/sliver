'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AttendanceDetailsTable } from '@/components/dashboard/AttendanceDetailsTable';
import { FileText, Upload, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your attendance processing.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/processor">
            <Button className="bg-primary hover:bg-primary/90">
              <Upload className="mr-2 h-4 w-4" />
              Process New File
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Processed"
          value="1,284"
          icon={FileText}
          trend={{ value: 12, label: 'vs last month', positive: true }}
        />
        <StatsCard
          title="Active Users"
          value="342"
          icon={Users}
          trend={{ value: 4, label: 'vs last month', positive: true }}
        />
        <StatsCard
          title="Processing Time"
          value="1.2s"
          icon={Clock}
          trend={{ value: 8, label: 'improvement', positive: true }}
        />
        <StatsCard
          title="Success Rate"
          value="99.9%"
          icon={Upload}
          trend={{ value: 0.1, label: 'vs last month', positive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Area (Placeholder for now) */}
        <div className="col-span-4">
          <div className="rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm h-full min-h-[400px] p-6">
            <div className="flex flex-col space-y-1.5 pb-4">
              <h3 className="font-semibold leading-none tracking-tight">Processing Volume</h3>
              <p className="text-sm text-muted-foreground">Daily records processed over time</p>
            </div>
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20">
              <p className="text-muted-foreground">Chart Visualization Placeholder</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-3">
          <RecentActivity />
        </div>
      </div>

      {/* Attendance Details Table */}
      <AttendanceDetailsTable />
    </div>
  );
}
