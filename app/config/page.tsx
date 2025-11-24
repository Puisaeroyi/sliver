'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Users, Clock, Settings } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
} from '@/components/ui';
import UserManagementTab from '@/components/config/UserManagementTab';
import ShiftConfigTab from '@/components/config/ShiftConfigTab';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'shifts'>('users');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <Settings className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configuration Manager
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Manage users and shift settings for the attendance processor
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`rounded-lg border p-4 ${notification.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
            : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
        <Button
          variant={activeTab === 'users' ? 'primary' : 'outline'}
          className={`h-auto py-4 flex flex-col gap-2 ${activeTab === 'users' ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-6 w-6" />
          <span className="font-semibold uppercase tracking-wide">User Management</span>
          {activeTab === 'users' && <Badge variant="default" className="mt-1">Active</Badge>}
        </Button>

        <Button
          variant={activeTab === 'shifts' ? 'primary' : 'outline'}
          className={`h-auto py-4 flex flex-col gap-2 ${activeTab === 'shifts' ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          onClick={() => setActiveTab('shifts')}
        >
          <Clock className="h-6 w-6" />
          <span className="font-semibold uppercase tracking-wide">Shift Settings</span>
          {activeTab === 'shifts' && <Badge variant="default" className="mt-1">Active</Badge>}
        </Button>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto">
        {activeTab === 'users' && (
          <UserManagementTab
            onNotification={showNotification}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftConfigTab
            onNotification={showNotification}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </div>

      {/* Info Section */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-500">
                  Important Security Notice
                </h3>
                <p className="text-sm text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                  Configuration changes are immediately applied to the attendance processor.
                  All changes are validated and backed up automatically. Only authorized personnel
                  should modify these settings. Invalid configurations will be rejected.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}