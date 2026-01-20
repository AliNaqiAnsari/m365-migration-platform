'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type ChangeType = 'positive' | 'negative' | 'neutral';

const stats: Array<{
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  icon: typeof Icons.migration;
}> = [
  {
    title: 'Active Migrations',
    value: '3',
    change: '+2 this week',
    changeType: 'positive',
    icon: Icons.migration,
  },
  {
    title: 'Connected Tenants',
    value: '4',
    change: '2 source, 2 destination',
    changeType: 'neutral',
    icon: Icons.cloud,
  },
  {
    title: 'Data Migrated',
    value: '1.2 TB',
    change: '+340 GB this month',
    changeType: 'positive',
    icon: Icons.database,
  },
  {
    title: 'Backups',
    value: '12',
    change: 'All healthy',
    changeType: 'positive',
    icon: Icons.archive,
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'migration',
    title: 'Exchange migration completed',
    description: 'Contoso Corp → Fabrikam Inc',
    time: '2 hours ago',
    status: 'success',
    icon: Icons.mail,
  },
  {
    id: 2,
    type: 'backup',
    title: 'Scheduled backup started',
    description: 'Northwind Traders - Full backup',
    time: '4 hours ago',
    status: 'in_progress',
    icon: Icons.database,
  },
  {
    id: 3,
    type: 'tenant',
    title: 'New tenant connected',
    description: 'Adventure Works - Source tenant',
    time: '1 day ago',
    status: 'success',
    icon: Icons.cloud,
  },
  {
    id: 4,
    type: 'migration',
    title: 'OneDrive migration in progress',
    description: 'Contoso Corp → Fabrikam Inc - 45% complete',
    time: '1 day ago',
    status: 'in_progress',
    icon: Icons.drive,
  },
  {
    id: 5,
    type: 'alert',
    title: 'Migration paused',
    description: 'Rate limit reached - will resume automatically',
    time: '2 days ago',
    status: 'warning',
    icon: Icons.alert,
  },
];

const quickActions = [
  {
    title: 'New Migration',
    description: 'Start a new tenant-to-tenant migration',
    icon: Icons.migration,
    href: '/migrations/new',
    color: 'bg-blue-500',
  },
  {
    title: 'Connect Tenant',
    description: 'Add a new Microsoft 365 tenant',
    icon: Icons.cloud,
    href: '/tenants/connect',
    color: 'bg-green-500',
  },
  {
    title: 'Create Backup',
    description: 'Schedule a new backup job',
    icon: Icons.database,
    href: '/backups/new',
    color: 'bg-purple-500',
  },
  {
    title: 'View Reports',
    description: 'Analyze migration statistics',
    icon: Icons.chart,
    href: '/reports',
    color: 'bg-orange-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your migration activities.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {stat.value}
                </motion.div>
                <p
                  className={cn(
                    'text-xs',
                    stat.changeType === 'positive' && 'text-green-600',
                    stat.changeType === 'negative' && 'text-red-600',
                    stat.changeType === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {stat.change}
                </p>
              </CardContent>
              {/* Decorative gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div
                    className={cn(
                      'mb-2 flex h-10 w-10 items-center justify-center rounded-lg',
                      action.color,
                    )}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest migration and backup activities
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        activity.status === 'success' && 'bg-green-100 text-green-600',
                        activity.status === 'in_progress' && 'bg-blue-100 text-blue-600',
                        activity.status === 'warning' && 'bg-yellow-100 text-yellow-600',
                        activity.status === 'error' && 'bg-red-100 text-red-600',
                      )}
                    >
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Migrations */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Migrations</CardTitle>
                <CardDescription>Currently running migration jobs</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Icons.add className="mr-1 h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActiveMigrationCard
                source="Contoso Corp"
                destination="Fabrikam Inc"
                progress={67}
                workload="OneDrive"
                status="running"
              />
              <ActiveMigrationCard
                source="Northwind"
                destination="Adventure Works"
                progress={23}
                workload="Exchange"
                status="running"
              />
              <ActiveMigrationCard
                source="Tailspin Toys"
                destination="Wide World"
                progress={89}
                workload="SharePoint"
                status="running"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ActiveMigrationCard({
  source,
  destination,
  progress,
  workload,
  status,
}: {
  source: string;
  destination: string;
  progress: number;
  workload: string;
  status: string;
}) {
  return (
    <motion.div
      className="rounded-lg border p-4"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{source}</span>
          <Icons.chevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{destination}</span>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
          {workload}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
