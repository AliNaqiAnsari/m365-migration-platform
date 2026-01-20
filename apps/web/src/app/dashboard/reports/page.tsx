'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const reports = [
  {
    id: '1',
    name: 'Migration Summary Report',
    description: 'Overview of all migration jobs and their status',
    type: 'migration',
    lastGenerated: '2024-02-11T10:30:00Z',
    format: 'PDF',
  },
  {
    id: '2',
    name: 'Backup Status Report',
    description: 'Summary of backup jobs, success rates, and storage usage',
    type: 'backup',
    lastGenerated: '2024-02-11T06:00:00Z',
    format: 'PDF',
  },
  {
    id: '3',
    name: 'Tenant Inventory Report',
    description: 'Detailed inventory of all connected tenants',
    type: 'tenant',
    lastGenerated: '2024-02-10T14:00:00Z',
    format: 'Excel',
  },
  {
    id: '4',
    name: 'Storage Usage Report',
    description: 'Breakdown of storage consumption by tenant and workload',
    type: 'storage',
    lastGenerated: '2024-02-09T08:00:00Z',
    format: 'PDF',
  },
  {
    id: '5',
    name: 'Activity Audit Log',
    description: 'Detailed log of all user and system activities',
    type: 'audit',
    lastGenerated: '2024-02-11T12:00:00Z',
    format: 'CSV',
  },
  {
    id: '6',
    name: 'Billing Summary',
    description: 'Monthly billing breakdown and usage statistics',
    type: 'billing',
    lastGenerated: '2024-02-01T00:00:00Z',
    format: 'PDF',
  },
];

const typeIcons: Record<string, typeof Icons.chart> = {
  migration: Icons.migration,
  backup: Icons.database,
  tenant: Icons.cloud,
  storage: Icons.archive,
  audit: Icons.settings,
  billing: Icons.chart,
};

const typeColors: Record<string, string> = {
  migration: 'bg-blue-100 text-blue-700',
  backup: 'bg-purple-100 text-purple-700',
  tenant: 'bg-green-100 text-green-700',
  storage: 'bg-orange-100 text-orange-700',
  audit: 'bg-gray-100 text-gray-700',
  billing: 'bg-pink-100 text-pink-700',
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download reports for your migration activities
          </p>
        </div>
        <Button>
          <Icons.add className="mr-2 h-4 w-4" />
          Custom Report
        </Button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reports Generated</CardDescription>
            <CardTitle className="text-3xl">24</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled Reports</CardDescription>
            <CardTitle className="text-3xl">6</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Generated</CardDescription>
            <CardTitle className="text-xl">2 hours ago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Migration Summary</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage Used</CardDescription>
            <CardTitle className="text-3xl">1.2 GB</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Report archive</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reports List */}
      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-xl font-semibold">Available Reports</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const TypeIcon = typeIcons[report.type] || Icons.chart;
            return (
              <motion.div
                key={report.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeColors[report.type]}`}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline">{report.format}</Badge>
                    </div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>Last generated:</p>
                        <p className="font-medium text-foreground">
                          {formatDate(report.lastGenerated)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Icons.play className="mr-1 h-3 w-3" />
                          Generate
                        </Button>
                        <Button variant="outline" size="sm">
                          <Icons.download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Reports */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Report History</CardTitle>
            <CardDescription>Previously generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Migration Summary Report', date: '2024-02-11T10:30:00Z', size: '2.4 MB', status: 'completed' },
                { name: 'Backup Status Report', date: '2024-02-11T06:00:00Z', size: '1.8 MB', status: 'completed' },
                { name: 'Tenant Inventory Report', date: '2024-02-10T14:00:00Z', size: '4.2 MB', status: 'completed' },
                { name: 'Storage Usage Report', date: '2024-02-09T08:00:00Z', size: '1.1 MB', status: 'completed' },
                { name: 'Activity Audit Log', date: '2024-02-11T12:00:00Z', size: '8.7 MB', status: 'completed' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icons.chart className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(item.date)} • {item.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <Icons.check className="mr-1 h-3 w-3" />
                      {item.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Icons.download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
