import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const activities = [
    {
        id: 1,
        type: 'success',
        message: 'Processed attendance_nov_2023.csv',
        time: '2 minutes ago',
        icon: CheckCircle2,
    },
    {
        id: 2,
        type: 'warning',
        message: 'Conversion failed for data_export.xlsx',
        time: '1 hour ago',
        icon: AlertCircle,
    },
    {
        id: 3,
        type: 'info',
        message: 'New user registered',
        time: '3 hours ago',
        icon: FileText,
    },
    {
        id: 4,
        type: 'success',
        message: 'System backup completed',
        time: '5 hours ago',
        icon: CheckCircle2,
    },
];

export function RecentActivity() {
    return (
        <Card className="glass-card border-border/50 h-full">
            <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start">
                            <div className={`
                mt-0.5 h-2 w-2 rounded-full ring-4 ring-opacity-20 mr-4 flex-shrink-0
                ${activity.type === 'success' ? 'bg-emerald-500 ring-emerald-500' : ''}
                ${activity.type === 'warning' ? 'bg-amber-500 ring-amber-500' : ''}
                ${activity.type === 'info' ? 'bg-blue-500 ring-blue-500' : ''}
              `} />
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">
                                    {activity.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {activity.time}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
