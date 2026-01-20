'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Migration {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  workloads: string[];
  totalItems: number;
  processedItems: number;
  totalBytes: number;
  transferredBytes: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const mockMigrations: Migration[] = [
  {
    id: '1',
    name: 'Full Migration - Contoso to Fabrikam',
    source: 'Contoso Corporation',
    destination: 'Fabrikam Inc',
    status: 'running',
    progress: 67,
    workloads: ['Exchange', 'OneDrive', 'SharePoint', 'Teams'],
    totalItems: 125000,
    processedItems: 83750,
    totalBytes: 524288000000, // 500 GB
    transferredBytes: 351192883200, // 327 GB
    startedAt: '2024-02-10T09:00:00Z',
    completedAt: null,
    createdAt: '2024-02-10T08:45:00Z',
  },
  {
    id: '2',
    name: 'Exchange Only - Northwind',
    source: 'Northwind Traders',
    destination: 'Adventure Works',
    status: 'running',
    progress: 23,
    workloads: ['Exchange'],
    totalItems: 45000,
    processedItems: 10350,
    totalBytes: 107374182400, // 100 GB
    transferredBytes: 24696061952, // 23 GB
    startedAt: '2024-02-11T14:30:00Z',
    completedAt: null,
    createdAt: '2024-02-11T14:00:00Z',
  },
  {
    id: '3',
    name: 'SharePoint Sites Migration',
    source: 'Tailspin Toys',
    destination: 'Wide World Importers',
    status: 'running',
    progress: 89,
    workloads: ['SharePoint'],
    totalItems: 8500,
    processedItems: 7565,
    totalBytes: 214748364800, // 200 GB
    transferredBytes: 191126604492, // 178 GB
    startedAt: '2024-02-09T11:00:00Z',
    completedAt: null,
    createdAt: '2024-02-09T10:30:00Z',
  },
  {
    id: '4',
    name: 'Teams Migration - Phase 1',
    source: 'Contoso Corporation',
    destination: 'Fabrikam Inc',
    status: 'completed',
    progress: 100,
    workloads: ['Teams'],
    totalItems: 15000,
    processedItems: 15000,
    totalBytes: 53687091200, // 50 GB
    transferredBytes: 53687091200,
    startedAt: '2024-02-05T09:00:00Z',
    completedAt: '2024-02-07T16:45:00Z',
    createdAt: '2024-02-05T08:30:00Z',
  },
  {
    id: '5',
    name: 'OneDrive Pilot Migration',
    source: 'Northwind Traders',
    destination: 'Adventure Works',
    status: 'paused',
    progress: 45,
    workloads: ['OneDrive'],
    totalItems: 25000,
    processedItems: 11250,
    totalBytes: 161061273600, // 150 GB
    transferredBytes: 72477573120, // 67.5 GB
    startedAt: '2024-02-08T10:00:00Z',
    completedAt: null,
    createdAt: '2024-02-08T09:45:00Z',
  },
  {
    id: '6',
    name: 'Failed Exchange Migration',
    source: 'Adventure Works',
    destination: 'Wide World Importers',
    status: 'failed',
    progress: 12,
    workloads: ['Exchange'],
    totalItems: 30000,
    processedItems: 3600,
    totalBytes: 85899345920, // 80 GB
    transferredBytes: 10307921510, // 9.6 GB
    startedAt: '2024-02-06T08:00:00Z',
    completedAt: '2024-02-06T10:30:00Z',
    createdAt: '2024-02-06T07:30:00Z',
  },
];

const statusConfig: Record<
  string,
  { color: string; bgColor: string; icon: typeof Icons.check }
> = {
  pending: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Icons.clock },
  running: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Icons.play },
  paused: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Icons.pause },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Icons.check },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: Icons.close },
  cancelled: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Icons.stop },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

export default function MigrationsPage() {
  const [filter, setFilter] = useState<string>('all');

  const filteredMigrations = mockMigrations.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const runningCount = mockMigrations.filter((m) => m.status === 'running').length;
  const completedCount = mockMigrations.filter((m) => m.status === 'completed').length;
  const failedCount = mockMigrations.filter((m) => m.status === 'failed').length;

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
          <h1 className="text-3xl font-bold tracking-tight">Migrations</h1>
          <p className="text-muted-foreground">
            Manage tenant-to-tenant migration jobs
          </p>
        </div>
        <Link href="/dashboard/migrations/new">
          <Button>
            <Icons.add className="mr-2 h-4 w-4" />
            New Migration
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Migrations</CardDescription>
            <CardTitle className="text-3xl">{mockMigrations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Running</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-blue-600">
              {runningCount}
              {runningCount > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-red-600">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {['all', 'running', 'paused', 'completed', 'failed', 'pending'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All' : status}
          </Button>
        ))}
      </motion.div>

      {/* Migration List */}
      <motion.div variants={itemVariants} className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredMigrations.map((migration) => (
            <MigrationCard key={migration.id} migration={migration} />
          ))}
        </AnimatePresence>

        {filteredMigrations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
          >
            <Icons.migration className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No migrations found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'all'
                ? 'Create your first migration to get started'
                : `No ${filter} migrations`}
            </p>
            {filter === 'all' && (
              <Link href="/dashboard/migrations/new">
                <Button className="mt-4">
                  <Icons.add className="mr-2 h-4 w-4" />
                  New Migration
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function MigrationCard({ migration }: { migration: Migration }) {
  const status = statusConfig[migration.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/dashboard/migrations/${migration.id}`}>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{migration.name}</h3>
                  <Badge className={cn(status.bgColor, status.color, 'border-0')}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {migration.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{migration.source}</span>
                  <Icons.chevronRight className="h-4 w-4" />
                  <span>{migration.destination}</span>
                </div>

                {/* Workloads */}
                <div className="flex flex-wrap gap-2">
                  {migration.workloads.map((workload) => (
                    <Badge key={workload} variant="outline" className="text-xs">
                      {workload}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex items-center gap-8 text-sm">
                <div className="text-right">
                  <div className="text-muted-foreground">Items</div>
                  <div className="font-medium">
                    {migration.processedItems.toLocaleString()} /{' '}
                    {migration.totalItems.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Data</div>
                  <div className="font-medium">
                    {formatBytes(migration.transferredBytes)} /{' '}
                    {formatBytes(migration.totalBytes)}
                  </div>
                </div>
                <div className="w-32">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{migration.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn(
                        'h-full',
                        migration.status === 'completed' && 'bg-green-500',
                        migration.status === 'running' && 'bg-blue-500',
                        migration.status === 'paused' && 'bg-yellow-500',
                        migration.status === 'failed' && 'bg-red-500',
                        migration.status === 'pending' && 'bg-gray-400',
                        migration.status === 'cancelled' && 'bg-gray-400',
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${migration.progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
