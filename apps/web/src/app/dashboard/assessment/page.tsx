'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type AssessmentStatus = 'idle' | 'running' | 'completed';

interface AssessmentResult {
  category: string;
  items: {
    name: string;
    status: 'pass' | 'warning' | 'error' | 'info';
    message: string;
    details?: string;
  }[];
}

const mockTenants = [
  { id: '1', name: 'Contoso Corporation', domain: 'contoso.onmicrosoft.com', platform: 'microsoft' as const },
  { id: '2', name: 'Acme Inc', domain: 'acme.com', platform: 'google' as const },
];

const mockAssessmentResults: AssessmentResult[] = [
  {
    category: 'User Accounts',
    items: [
      { name: 'Total Users', status: 'info', message: '250 users found' },
      { name: 'Licensed Users', status: 'pass', message: '245 users have active licenses' },
      { name: 'Guest Users', status: 'warning', message: '15 guest users will need manual migration' },
      { name: 'Disabled Accounts', status: 'info', message: '5 accounts are disabled' },
    ],
  },
  {
    category: 'Mailboxes',
    items: [
      { name: 'User Mailboxes', status: 'pass', message: '245 mailboxes ready for migration' },
      { name: 'Shared Mailboxes', status: 'pass', message: '12 shared mailboxes found' },
      { name: 'Archive Mailboxes', status: 'warning', message: '8 archive mailboxes (may increase migration time)', details: 'Archive mailboxes contain historical data that will be migrated separately' },
      { name: 'Mailbox Size', status: 'info', message: 'Total size: 1.2 TB', details: 'Average mailbox size: 4.9 GB' },
      { name: 'Large Mailboxes', status: 'warning', message: '3 mailboxes exceed 50 GB', details: 'Large mailboxes may require extended migration time' },
    ],
  },
  {
    category: 'OneDrive / Google Drive',
    items: [
      { name: 'Total Files', status: 'info', message: '125,000 files across all users' },
      { name: 'Total Storage', status: 'info', message: '500 GB of data' },
      { name: 'Large Files', status: 'warning', message: '45 files exceed 100 MB', details: 'Files larger than 100MB will be migrated in chunks' },
      { name: 'Unsupported Files', status: 'error', message: '12 files with unsupported formats', details: '.exe files cannot be migrated to destination' },
      { name: 'Path Length', status: 'pass', message: 'All file paths within limits' },
    ],
  },
  {
    category: 'SharePoint / Shared Drives',
    items: [
      { name: 'Sites', status: 'pass', message: '32 SharePoint sites found' },
      { name: 'Document Libraries', status: 'pass', message: '156 document libraries' },
      { name: 'Lists', status: 'info', message: '89 lists with 45,000 items' },
      { name: 'Permissions', status: 'warning', message: 'Complex permissions on 8 sites', details: 'Custom permission levels may need manual review' },
      { name: 'Workflows', status: 'error', message: '5 legacy workflows detected', details: 'SharePoint 2010 workflows cannot be migrated automatically' },
    ],
  },
  {
    category: 'Teams / Chat',
    items: [
      { name: 'Teams', status: 'pass', message: '18 teams found' },
      { name: 'Channels', status: 'pass', message: '156 channels total' },
      { name: 'Private Channels', status: 'warning', message: '12 private channels', details: 'Private channels require additional permissions' },
      { name: 'Team Files', status: 'pass', message: '25 GB of files in Teams' },
      { name: 'Chat History', status: 'info', message: 'Chat messages will be migrated' },
    ],
  },
  {
    category: 'Compatibility',
    items: [
      { name: 'API Access', status: 'pass', message: 'All required APIs are accessible' },
      { name: 'Throttling Limits', status: 'pass', message: 'Within recommended limits' },
      { name: 'License Compatibility', status: 'pass', message: 'Destination licenses support all features' },
      { name: 'Region Compliance', status: 'pass', message: 'Data residency requirements met' },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AssessmentPage() {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [status, setStatus] = useState<AssessmentStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AssessmentResult[]>([]);

  const startAssessment = () => {
    if (!selectedTenant) return;

    setStatus('running');
    setProgress(0);
    setResults([]);

    // Simulate assessment progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('completed');
          setResults(mockAssessmentResults);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <Icons.check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <Icons.alert className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <Icons.close className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Icons.info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      error: 'bg-red-100 text-red-700 border-red-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return variants[status as keyof typeof variants] || '';
  };

  const getSummary = () => {
    if (results.length === 0) return { pass: 0, warning: 0, error: 0, info: 0 };

    const all = results.flatMap((r) => r.items);
    return {
      pass: all.filter((i) => i.status === 'pass').length,
      warning: all.filter((i) => i.status === 'warning').length,
      error: all.filter((i) => i.status === 'error').length,
      info: all.filter((i) => i.status === 'info').length,
    };
  };

  const summary = getSummary();

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
          <h1 className="text-3xl font-bold tracking-tight">Pre-Migration Assessment</h1>
          <p className="text-muted-foreground">
            Analyze your tenant to identify potential migration issues before starting
          </p>
        </div>
      </motion.div>

      {/* Tenant Selection */}
      {status === 'idle' && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Select Tenant to Assess</CardTitle>
              <CardDescription>
                Choose a source tenant to run the pre-migration assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {mockTenants.map((tenant) => (
                  <Card
                    key={tenant.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary',
                      selectedTenant === tenant.id && 'border-primary ring-2 ring-primary/20',
                    )}
                    onClick={() => setSelectedTenant(tenant.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        tenant.platform === 'microsoft' ? 'bg-blue-100' : 'bg-red-100'
                      )}>
                        {tenant.platform === 'microsoft' ? (
                          <Icons.microsoft className="h-6 w-6" />
                        ) : (
                          <Icons.googleWorkspace className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                      </div>
                      {selectedTenant === tenant.id && (
                        <Icons.check className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={!selectedTenant}
                onClick={startAssessment}
              >
                <Icons.assessment className="mr-2 h-4 w-4" />
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Assessment Progress */}
      {status === 'running' && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="py-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center"
              >
                <Icons.spinner className="h-12 w-12 text-primary" />
              </motion.div>
              <h3 className="text-xl font-semibold">Running Assessment</h3>
              <p className="mt-2 text-muted-foreground">
                Analyzing your tenant configuration and data...
              </p>
              <div className="mx-auto mt-6 max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-muted-foreground">{progress}% complete</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Assessment Results */}
      {status === 'completed' && (
        <>
          {/* Summary Cards */}
          <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Icons.check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.pass}</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <Icons.alert className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.warning}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Icons.close className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.error}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Icons.info className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.info}</p>
                  <p className="text-sm text-muted-foreground">Info</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex gap-4">
            <Button variant="outline" onClick={() => setStatus('idle')}>
              <Icons.refresh className="mr-2 h-4 w-4" />
              Run New Assessment
            </Button>
            <Button variant="outline">
              <Icons.download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button>
              <Icons.migration className="mr-2 h-4 w-4" />
              Start Migration
            </Button>
          </motion.div>

          {/* Detailed Results */}
          <motion.div variants={itemVariants} className="space-y-6">
            {results.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 rounded-lg border p-4"
                      >
                        <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            <Badge
                              variant="outline"
                              className={getStatusBadge(item.status)}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.message}</p>
                          {item.details && (
                            <p className="mt-1 text-xs text-muted-foreground/80">
                              {item.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
