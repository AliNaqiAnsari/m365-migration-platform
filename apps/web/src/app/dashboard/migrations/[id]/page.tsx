'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface MigrationTask {
  id: string;
  name: string;
  type: 'user' | 'mailbox' | 'site' | 'team' | 'onedrive';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  itemsProcessed: number;
  totalItems: number;
  bytesTransferred: number;
  totalBytes: number;
  startedAt: string | null;
  completedAt: string | null;
  error?: string;
}

interface MigrationLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

interface Migration {
  id: string;
  name: string;
  source: {
    name: string;
    domain: string;
    platform: 'microsoft' | 'google';
  };
  destination: {
    name: string;
    domain: string;
    platform: 'microsoft' | 'google';
  };
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  workloads: string[];
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  totalBytes: number;
  transferredBytes: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
  tasks: MigrationTask[];
  logs: MigrationLog[];
}

// Mock data with static unique IDs (no dynamic generation to avoid hydration mismatch)
const mockMigrations: Record<string, Migration> = {
  '1': {
    id: 'mig-lx8k2n4-a7bc9d3',
    name: 'Full Migration - Contoso to Fabrikam',
    source: {
      name: 'Contoso Corporation',
      domain: 'contoso.onmicrosoft.com',
      platform: 'microsoft',
    },
    destination: {
      name: 'Fabrikam Inc',
      domain: 'fabrikam.onmicrosoft.com',
      platform: 'microsoft',
    },
    status: 'running',
    progress: 67,
    workloads: ['Exchange', 'OneDrive', 'SharePoint', 'Teams'],
    totalItems: 125000,
    processedItems: 83750,
    successfulItems: 82500,
    failedItems: 450,
    skippedItems: 800,
    totalBytes: 524288000000,
    transferredBytes: 351192883200,
    startedAt: '2024-02-10T09:00:00Z',
    completedAt: null,
    createdAt: '2024-02-10T08:45:00Z',
    createdBy: 'admin@contoso.com',
    tasks: [
      {
        id: 'task-001-abc123',
        name: 'john.doe@contoso.com',
        type: 'mailbox',
        status: 'completed',
        progress: 100,
        itemsProcessed: 15420,
        totalItems: 15420,
        bytesTransferred: 2147483648,
        totalBytes: 2147483648,
        startedAt: '2024-02-10T09:05:00Z',
        completedAt: '2024-02-10T10:30:00Z',
      },
      {
        id: 'task-002-def456',
        name: 'jane.smith@contoso.com',
        type: 'mailbox',
        status: 'running',
        progress: 78,
        itemsProcessed: 8924,
        totalItems: 11440,
        bytesTransferred: 1610612736,
        totalBytes: 2147483648,
        startedAt: '2024-02-10T10:32:00Z',
        completedAt: null,
      },
      {
        id: 'task-003-ghi789',
        name: 'Marketing Site',
        type: 'site',
        status: 'running',
        progress: 45,
        itemsProcessed: 2250,
        totalItems: 5000,
        bytesTransferred: 5368709120,
        totalBytes: 10737418240,
        startedAt: '2024-02-10T11:00:00Z',
        completedAt: null,
      },
      {
        id: 'task-004-jkl012',
        name: 'Sales Team',
        type: 'team',
        status: 'pending',
        progress: 0,
        itemsProcessed: 0,
        totalItems: 3500,
        bytesTransferred: 0,
        totalBytes: 5368709120,
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'task-005-mno345',
        name: 'bob.wilson@contoso.com',
        type: 'onedrive',
        status: 'failed',
        progress: 23,
        itemsProcessed: 1150,
        totalItems: 5000,
        bytesTransferred: 536870912,
        totalBytes: 2147483648,
        startedAt: '2024-02-10T09:15:00Z',
        completedAt: '2024-02-10T09:45:00Z',
        error: 'Access denied: Insufficient permissions to read source files',
      },
    ],
    logs: [
      {
        id: 'log-001-xyz111',
        timestamp: '2024-02-10T09:00:00Z',
        level: 'info',
        message: 'Migration job started',
      },
      {
        id: 'log-002-xyz222',
        timestamp: '2024-02-10T09:05:00Z',
        level: 'info',
        message: 'Starting mailbox migration for john.doe@contoso.com',
      },
      {
        id: 'log-003-xyz333',
        timestamp: '2024-02-10T09:45:00Z',
        level: 'error',
        message: 'Failed to migrate OneDrive for bob.wilson@contoso.com',
        details: 'Access denied: Insufficient permissions to read source files',
      },
      {
        id: 'log-004-xyz444',
        timestamp: '2024-02-10T10:30:00Z',
        level: 'success',
        message: 'Mailbox migration completed for john.doe@contoso.com',
        details: '15,420 items migrated (2.0 GB)',
      },
      {
        id: 'log-005-xyz555',
        timestamp: '2024-02-10T10:32:00Z',
        level: 'info',
        message: 'Starting mailbox migration for jane.smith@contoso.com',
      },
      {
        id: 'log-006-xyz666',
        timestamp: '2024-02-10T11:00:00Z',
        level: 'info',
        message: 'Starting SharePoint site migration for Marketing Site',
      },
      {
        id: 'log-007-xyz777',
        timestamp: '2024-02-10T11:15:00Z',
        level: 'warning',
        message: '3 files skipped due to unsupported format',
        details: 'Files: logo.psd, design.ai, mockup.sketch',
      },
    ],
  },
  '2': {
    id: 'mig-mx9l3o5-b8cd0e4',
    name: 'Exchange Only - Northwind',
    source: {
      name: 'Northwind Traders',
      domain: 'northwind.onmicrosoft.com',
      platform: 'microsoft',
    },
    destination: {
      name: 'Adventure Works',
      domain: 'adventureworks.onmicrosoft.com',
      platform: 'microsoft',
    },
    status: 'running',
    progress: 23,
    workloads: ['Exchange'],
    totalItems: 45000,
    processedItems: 10350,
    successfulItems: 10200,
    failedItems: 50,
    skippedItems: 100,
    totalBytes: 107374182400,
    transferredBytes: 24696061952,
    startedAt: '2024-02-11T14:30:00Z',
    completedAt: null,
    createdAt: '2024-02-11T14:00:00Z',
    createdBy: 'admin@northwind.com',
    tasks: [],
    logs: [],
  },
  '3': {
    id: 'mig-nx0m4p6-c9de1f5',
    name: 'Google to Microsoft Migration',
    source: {
      name: 'Acme Inc',
      domain: 'acme.com',
      platform: 'google',
    },
    destination: {
      name: 'Contoso Corporation',
      domain: 'contoso.onmicrosoft.com',
      platform: 'microsoft',
    },
    status: 'completed',
    progress: 100,
    workloads: ['Gmail → Exchange', 'Drive → OneDrive'],
    totalItems: 85000,
    processedItems: 85000,
    successfulItems: 84500,
    failedItems: 200,
    skippedItems: 300,
    totalBytes: 214748364800,
    transferredBytes: 214748364800,
    startedAt: '2024-02-01T09:00:00Z',
    completedAt: '2024-02-03T18:45:00Z',
    createdAt: '2024-02-01T08:30:00Z',
    createdBy: 'admin@acme.com',
    tasks: [],
    logs: [],
  },
};

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Icons.check }> = {
  pending: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Icons.clock },
  running: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Icons.play },
  paused: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Icons.pause },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Icons.check },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: Icons.close },
  cancelled: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Icons.stop },
};

const taskStatusConfig: Record<string, { color: string; bgColor: string }> = {
  pending: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  running: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100' },
  skipped: { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

const logLevelConfig: Record<string, { color: string; icon: typeof Icons.info }> = {
  info: { color: 'text-blue-500', icon: Icons.info },
  warning: { color: 'text-yellow-500', icon: Icons.alert },
  error: { color: 'text-red-500', icon: Icons.close },
  success: { color: 'text-green-500', icon: Icons.check },
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

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function MigrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'logs'>('overview');
  const [migration, setMigration] = useState<Migration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching migration data
    const id = params.id as string;
    setTimeout(() => {
      const data = mockMigrations[id];
      if (data) {
        setMigration(data);
      }
      setLoading(false);
    }, 500);
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading migration details...</p>
        </div>
      </div>
    );
  }

  if (!migration) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Icons.alert className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Migration Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          The migration with ID &quot;{params.id}&quot; could not be found.
        </p>
        <Link href="/dashboard/migrations">
          <Button>
            <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Migrations
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[migration.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard/migrations" className="text-muted-foreground hover:text-foreground">
              <Icons.chevronRight className="h-4 w-4 rotate-180" />
            </Link>
            <span className="text-sm text-muted-foreground">Migrations</span>
            <Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{migration.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{migration.name}</h1>
          <div className="mt-2 flex items-center gap-4">
            <Badge className={cn(status.bgColor, status.color, 'border-0')}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {migration.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{migration.id}</code>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {migration.status === 'running' && (
            <>
              <Button variant="outline">
                <Icons.pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button variant="destructive">
                <Icons.stop className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {migration.status === 'paused' && (
            <Button>
              <Icons.play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          {(migration.status === 'failed' || migration.status === 'cancelled') && (
            <Button>
              <Icons.refresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </motion.div>

      {/* Source → Destination */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                {migration.source.platform === 'microsoft' ? (
                  <Icons.microsoft className="h-6 w-6" />
                ) : (
                  <Icons.googleWorkspace className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-medium">{migration.source.name}</p>
                <p className="text-sm text-muted-foreground">{migration.source.domain}</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Icons.migration className="h-8 w-8 text-primary" />
              <span className="text-xs text-muted-foreground">
                {migration.source.platform === migration.destination.platform
                  ? 'Same Platform'
                  : 'Cross-Platform'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{migration.destination.name}</p>
                <p className="text-sm text-muted-foreground">{migration.destination.domain}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                {migration.destination.platform === 'microsoft' ? (
                  <Icons.microsoft className="h-6 w-6" />
                ) : (
                  <Icons.googleWorkspace className="h-6 w-6" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-2xl font-bold">{migration.progress}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn(
                  'h-full',
                  migration.status === 'completed' && 'bg-green-500',
                  migration.status === 'running' && 'bg-blue-500',
                  migration.status === 'paused' && 'bg-yellow-500',
                  migration.status === 'failed' && 'bg-red-500',
                  migration.status === 'pending' && 'bg-gray-400',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${migration.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {migration.successfulItems.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {migration.failedItems.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {migration.skippedItems.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">
                  {(migration.totalItems - migration.processedItems).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items Processed</CardDescription>
            <CardTitle className="text-2xl">
              {migration.processedItems.toLocaleString()} / {migration.totalItems.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Transferred</CardDescription>
            <CardTitle className="text-2xl">
              {formatBytes(migration.transferredBytes)} / {formatBytes(migration.totalBytes)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="text-2xl">
              {formatDuration(migration.startedAt, migration.completedAt)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Started</CardDescription>
            <CardTitle className="text-lg">{formatDate(migration.startedAt)}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Workloads */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Workloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {migration.workloads.map((workload) => (
                <Badge key={workload} variant="secondary" className="px-3 py-1">
                  {workload}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 border-b">
        {(['overview', 'tasks', 'logs'] as const).map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            className={cn(
              'rounded-none border-b-2 border-transparent capitalize',
              activeTab === tab && 'border-primary text-primary',
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Migration Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Migration ID</p>
                  <p className="font-mono text-sm">{migration.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="text-sm">{migration.createdBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="text-sm">{formatDate(migration.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed At</p>
                  <p className="text-sm">{formatDate(migration.completedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {migration.tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Icons.users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No tasks to display</p>
                </CardContent>
              </Card>
            ) : (
              migration.tasks.map((task) => {
                const taskStatus = taskStatusConfig[task.status];
                return (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn('rounded-lg p-2', taskStatus.bgColor)}>
                            {task.type === 'mailbox' && <Icons.mail className="h-5 w-5" />}
                            {task.type === 'site' && <Icons.drive className="h-5 w-5" />}
                            {task.type === 'team' && <Icons.teams className="h-5 w-5" />}
                            {task.type === 'onedrive' && <Icons.cloud className="h-5 w-5" />}
                            {task.type === 'user' && <Icons.user className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{task.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{task.type}</p>
                            {task.error && (
                              <p className="mt-1 text-sm text-red-500">{task.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Items</p>
                            <p>
                              {task.itemsProcessed.toLocaleString()} /{' '}
                              {task.totalItems.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Data</p>
                            <p>
                              {formatBytes(task.bytesTransferred)} / {formatBytes(task.totalBytes)}
                            </p>
                          </div>
                          <div className="w-32">
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <Badge className={cn(taskStatus.bgColor, taskStatus.color, 'border-0 text-xs')}>
                                {task.status}
                              </Badge>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  task.status === 'completed' && 'bg-green-500',
                                  task.status === 'running' && 'bg-blue-500',
                                  task.status === 'failed' && 'bg-red-500',
                                  task.status === 'pending' && 'bg-gray-400',
                                  task.status === 'skipped' && 'bg-yellow-500',
                                )}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Real-time migration activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                {migration.logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Icons.file className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No logs to display</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {migration.logs.map((log) => {
                      const logLevel = logLevelConfig[log.level];
                      const LogIcon = logLevel.icon;
                      return (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <LogIcon className={cn('mt-0.5 h-4 w-4', logLevel.color)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.message}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {log.details && (
                              <p className="mt-1 text-muted-foreground">{log.details}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
