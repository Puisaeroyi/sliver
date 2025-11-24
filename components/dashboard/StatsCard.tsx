import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
    return (
        <Card className={cn("glass-card border-border/50", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                {(description || trend) && (
                    <div className="flex items-center mt-1 text-xs">
                        {trend && (
                            <span className={cn(
                                "font-medium mr-2",
                                trend.positive ? "text-emerald-500" : "text-rose-500"
                            )}>
                                {trend.positive ? "+" : ""}{trend.value}%
                            </span>
                        )}
                        {description && (
                            <span className="text-muted-foreground">{description}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
