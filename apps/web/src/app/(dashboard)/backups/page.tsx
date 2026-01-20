'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface BackupJob {
  id: string;
  name: string;
  tenant: string;
  type: 'full' | 'incremental' | 'differential';
  workloads: string[];
  schedule: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: 'success' | 'failed' | 'running' | null;
  retentionDays: number;
  snapshots: number;
  totalSize: number;
  status: 'active' | 'paused' | 'disabled';
}

const mockBackups: BackupJob[] = [
  {
    id: '1',
    name: 'Contoso Full Backup',
    tenant: 'Contoso Corporation',
    type: 'full',
    workloads: ['Exchange', 'OneDrive', 'SharePoint', 'Teams'],
    schedule: 'Daily at 2:00 AM',
    nextRun: '2024-02-12T02:00:00Z',
    lastRun: '2024-02-11T02:00:00Z',
    lastStatus: 'success',
    retentionDays: 30,
    snapshots: 28,
    totalSize: 1099511627776, // 1 TB
    status: 'active',
  },
  {
    id: '2',
    name: 'Fabrikam Exchange Backup',
    tenant: 'Fabrikam Inc',
    type: 'incremental',
    workloads: ['Exchange'],
    schedule: 'Every 6 hours',
    nextRun: '2024-02-11T18:00:00Z',
    lastRun: '2024-02-11T12:00:00Z',
    lastStatus: 'success',
    retentionDays: 14,
    snapshots: 84,
    totalSize: 214748364800, // 200 GB
    status: 'active',
  },
  {
    id: '3',
    name: 'Northwind Weekly Backup',
    tenant: 'Northwind Traders',
    type: 'full',
    workloads: ['Exchange', 'SharePoint'],
    schedule: 'Weekly on Sunday at 1:00 AM',
    nextRun: '2024-02-18T01:00:00Z',
    lastRun: '2024-02-11T01:00:00Z',
    lastStatus: 'failed',
    retentionDays: 90,
    snapshots: 12,
    totalSize: 536870912000, // 500 GB
    status: 'active',
  },
  {
    id: '4',
    name: 'Adventure Works OneDrive',
    tenant: 'Adventure Works',
    type: 'differential',
    workloads: ['OneDrive'],
    schedule: 'Daily at 3:00 AM',
    nextRun: null,
    lastRun: '2024-02-09T03:00:00Z',
    lastStatus: 'success',
    retentionDays: 30,
    snapshots: 15,
    totalSize: 161061273600, // 150 GB
    status: 'paused',
  },
];

const typeColors = {
  full: 'bg-purple-100 text-purple-700',
  incremental: 'bg-blue-100 text-blue-700',
  differential: 'bg-orange-100 text-orange-700',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BackupsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const filteredBackups = mockBackups.filter((backup) => {
    if (filter === 'all') return true;
    return backup.status === filter;
  });

  const totalStorage = mockBackups.reduce((sum, b) => sum + b.totalSize, 0);
  const totalSnapshots = mockBackups.reduce((sum, b) => sum + b.snapshots, 0);
  const activeJobs = mockBackups.filter((b) => b.status === 'active').length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground">
            Manage scheduled backup jobs and snapshots
          </p>
        </div>
        <Link href="/backups/new">
          <Button>
            <Icons.add className="mr-2 h-4 w-4" />
            New Backup Job
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="text-3xl">{activeJobs}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              of {mockBackups.length} total jobs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Snapshots</CardDescription>
            <CardTitle className="text-3xl">{totalSnapshots}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage Used</CardDescription>
            <CardTitle className="text-3xl">{formatBytes(totalStorage)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total backup size</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last 24 Hours</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-green-600">
              <Icons.check className="h-6 w-6" />
              All Good
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No failed backups</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {(['all', 'active', 'paused'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All Jobs' : status}
          </Button>
        ))}
      </motion.div>

      {/* Backup Jobs Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredBackups.map((backup) => (
            <BackupCard key={backup.id} backup={backup} />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function BackupCard({ backup }: { backup: BackupJob }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(backup.status === 'paused' && 'opacity-75')}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{backup.name}</CardTitle>
              <CardDescription>{backup.tenant}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('capitalize', typeColors[backup.type])}>
                {backup.type}
              </Badge>
              {backup.status === 'paused' && (
                <Badge variant="secondary">
                  <Icons.pause className="mr-1 h-3 w-3" />
                  Paused
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workloads */}
          <div className="flex flex-wrap gap-2">
            {backup.workloads.map((workload) => (
              <Badge key={workload} variant="outline" className="text-xs">
                {workload}
              </Badge>
            ))}
          </div>

          {/* Schedule & Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium">{backup.schedule}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retention</p>
              <p className="font-medium">{backup.retentionDays} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Run</p>
              <div className="flex items-center gap-2">
                {backup.lastRun ? (
                  <>
                    <span className="font-medium">{formatDate(backup.lastRun)}</span>
                    {backup.lastStatus === 'success' && (
                      <Icons.check className="h-4 w-4 text-green-500" />
                    )}
                    {backup.lastStatus === 'failed' && (
                      <Icons.close className="h-4 w-4 text-red-500" />
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Next Run</p>
              <p className="font-medium">
                {backup.nextRun ? formatDate(backup.nextRun) : 'Not scheduled'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between border-t pt-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icons.archive className="h-4 w-4" />
                <span>{backup.snapshots} snapshots</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icons.database className="h-4 w-4" />
                <span>{formatBytes(backup.totalSize)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Icons.play className="mr-1 h-3 w-3" />
                Run Now
              </Button>
              <Button variant="outline" size="sm">
                <Icons.settings className="mr-1 h-3 w-3" />
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
