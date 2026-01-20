'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const workloads = [
  { id: 'exchange', name: 'Exchange', description: 'Mailboxes, calendars, contacts', icon: Icons.mail },
  { id: 'onedrive', name: 'OneDrive', description: 'Personal files and folders', icon: Icons.drive },
  { id: 'sharepoint', name: 'SharePoint', description: 'Sites, document libraries', icon: Icons.database },
  { id: 'teams', name: 'Teams', description: 'Teams, channels, files', icon: Icons.teams },
];

const schedules = [
  { id: 'hourly', label: 'Every Hour', description: 'Continuous protection' },
  { id: 'daily', label: 'Daily', description: 'Run once per day' },
  { id: 'weekly', label: 'Weekly', description: 'Run once per week' },
  { id: 'monthly', label: 'Monthly', description: 'Run once per month' },
];

const retentionOptions = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

const mockTenants = [
  { id: '1', name: 'Contoso Corporation', domain: 'contoso.onmicrosoft.com' },
  { id: '2', name: 'Fabrikam Inc', domain: 'fabrikam.onmicrosoft.com' },
  { id: '3', name: 'Northwind Traders', domain: 'northwind.onmicrosoft.com' },
];

export default function NewBackupPage() {
  const router = useRouter();
  const [backupName, setBackupName] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [selectedWorkloads, setSelectedWorkloads] = useState<string[]>([]);
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full');
  const [schedule, setSchedule] = useState('daily');
  const [retention, setRetention] = useState(30);

  const toggleWorkload = (id: string) => {
    setSelectedWorkloads((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const handleCreate = () => {
    // In a real app, this would create the backup job
    router.push('/dashboard/backups');
  };

  const isValid = backupName && selectedTenant && selectedWorkloads.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Backup Job</h1>
        <p className="text-muted-foreground">
          Set up a new scheduled backup for your Microsoft 365 data
        </p>
      </div>

      {/* Backup Name */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Name</CardTitle>
          <CardDescription>Give your backup job a descriptive name</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Contoso Daily Full Backup"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Select Tenant */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>Choose the tenant to back up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {mockTenants.map((tenant) => (
              <Card
                key={tenant.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  selectedTenant === tenant.id && 'border-primary ring-2 ring-primary/20',
                )}
                onClick={() => setSelectedTenant(tenant.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icons.microsoft className="h-8 w-8" />
                  <div className="overflow-hidden">
                    <p className="truncate font-medium">{tenant.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{tenant.domain}</p>
                  </div>
                  {selectedTenant === tenant.id && (
                    <Icons.check className="ml-auto h-5 w-5 shrink-0 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Select Workloads */}
      <Card>
        <CardHeader>
          <CardTitle>Select Workloads</CardTitle>
          <CardDescription>Choose which workloads to include in the backup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {workloads.map((workload) => {
              const isSelected = selectedWorkloads.includes(workload.id);
              return (
                <Card
                  key={workload.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    isSelected && 'border-primary ring-2 ring-primary/20',
                  )}
                  onClick={() => toggleWorkload(workload.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      )}
                    >
                      <workload.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{workload.name}</p>
                      <p className="text-sm text-muted-foreground">{workload.description}</p>
                    </div>
                    {isSelected && <Icons.check className="ml-auto h-5 w-5 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Backup Type */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Type</CardTitle>
          <CardDescription>Choose the type of backup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary',
                backupType === 'full' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => setBackupType('full')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Icons.database className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Full Backup</p>
                    <p className="text-sm text-muted-foreground">Complete backup of all data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary',
                backupType === 'incremental' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => setBackupType('incremental')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Icons.trending className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Incremental</p>
                    <p className="text-sm text-muted-foreground">Only changes since last backup</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>How often should this backup run?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {schedules.map((s) => (
              <Badge
                key={s.id}
                variant={schedule === s.id ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSchedule(s.id)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Period</CardTitle>
          <CardDescription>How long should backups be kept?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {retentionOptions.map((r) => (
              <Badge
                key={r.days}
                variant={retention === r.days ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setRetention(r.days)}
              >
                {r.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary & Actions */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready to create backup job</h3>
              <p className="text-sm text-muted-foreground">
                {selectedWorkloads.length} workload(s) selected • {schedules.find((s) => s.id === schedule)?.label} •{' '}
                {retentionOptions.find((r) => r.days === retention)?.label} retention
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!isValid}>
                <Icons.add className="mr-2 h-4 w-4" />
                Create Backup Job
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
