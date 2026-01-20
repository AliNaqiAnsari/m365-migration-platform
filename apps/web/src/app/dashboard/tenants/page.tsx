'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  platform: 'microsoft' | 'google';
  type: 'source' | 'destination';
  status: 'connected' | 'error' | 'syncing';
  userCount: number;
  mailboxCount: number;
  siteCount: number;
  teamCount: number;
  lastSync: string;
  connectedAt: string;
}

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Contoso Corporation',
    domain: 'contoso.onmicrosoft.com',
    platform: 'microsoft',
    type: 'source',
    status: 'connected',
    userCount: 250,
    mailboxCount: 245,
    siteCount: 32,
    teamCount: 18,
    lastSync: '5 minutes ago',
    connectedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Fabrikam Inc',
    domain: 'fabrikam.onmicrosoft.com',
    platform: 'microsoft',
    type: 'destination',
    status: 'connected',
    userCount: 180,
    mailboxCount: 175,
    siteCount: 24,
    teamCount: 12,
    lastSync: '10 minutes ago',
    connectedAt: '2024-01-18',
  },
  {
    id: '3',
    name: 'Acme Inc',
    domain: 'acme.com',
    platform: 'google',
    type: 'source',
    status: 'connected',
    userCount: 320,
    mailboxCount: 318,
    siteCount: 0,
    teamCount: 45,
    lastSync: '2 minutes ago',
    connectedAt: '2024-02-01',
  },
  {
    id: '4',
    name: 'TechStart Solutions',
    domain: 'techstart.io',
    platform: 'google',
    type: 'destination',
    status: 'syncing',
    userCount: 85,
    mailboxCount: 85,
    siteCount: 0,
    teamCount: 12,
    lastSync: 'Syncing...',
    connectedAt: '2024-02-05',
  },
  {
    id: '5',
    name: 'Northwind Traders',
    domain: 'northwind.onmicrosoft.com',
    platform: 'microsoft',
    type: 'source',
    status: 'syncing',
    userCount: 450,
    mailboxCount: 442,
    siteCount: 56,
    teamCount: 28,
    lastSync: 'Syncing...',
    connectedAt: '2024-02-01',
  },
  {
    id: '6',
    name: 'Adventure Works',
    domain: 'adventureworks.onmicrosoft.com',
    platform: 'microsoft',
    type: 'destination',
    status: 'error',
    userCount: 0,
    mailboxCount: 0,
    siteCount: 0,
    teamCount: 0,
    lastSync: 'Failed 2 hours ago',
    connectedAt: '2024-02-05',
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

type FilterType = 'all' | 'source' | 'destination';
type PlatformFilter = 'all' | 'microsoft' | 'google';

export default function TenantsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const filteredTenants = mockTenants.filter((tenant) => {
    const typeMatch = filter === 'all' || tenant.type === filter;
    const platformMatch = platformFilter === 'all' || tenant.platform === platformFilter;
    return typeMatch && platformMatch;
  });

  const microsoftTenants = mockTenants.filter((t) => t.platform === 'microsoft');
  const googleTenants = mockTenants.filter((t) => t.platform === 'google');
  const sourceTenants = mockTenants.filter((t) => t.type === 'source');
  const destinationTenants = mockTenants.filter((t) => t.type === 'destination');

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
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage your connected Microsoft 365 and Google Workspace tenants
          </p>
        </div>
        <Link href="/dashboard/tenants/connect">
          <Button>
            <Icons.add className="mr-2 h-4 w-4" />
            Connect Tenant
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tenants</CardDescription>
            <CardTitle className="text-3xl">{mockTenants.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {sourceTenants.length} source, {destinationTenants.length} destination
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Microsoft 365</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Icons.microsoft className="h-6 w-6" />
              {microsoftTenants.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {microsoftTenants.reduce((sum, t) => sum + t.userCount, 0).toLocaleString()} users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Google Workspace</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Icons.googleWorkspace className="h-6 w-6" />
              {googleTenants.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {googleTenants.reduce((sum, t) => sum + t.userCount, 0).toLocaleString()} users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">
              {mockTenants.reduce((sum, t) => sum + t.userCount, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(['all', 'source', 'destination'] as const).map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
              className="capitalize"
            >
              {type === 'all' ? 'All Types' : `${type}`}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-2',
                  filter === type && 'bg-primary-foreground/20 text-primary-foreground',
                )}
              >
                {type === 'all'
                  ? mockTenants.length
                  : mockTenants.filter((t) => t.type === type).length}
              </Badge>
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'microsoft', 'google'] as const).map((platform) => (
            <Button
              key={platform}
              variant={platformFilter === platform ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPlatformFilter(platform)}
              className="gap-2"
            >
              {platform === 'microsoft' && <Icons.microsoft className="h-4 w-4" />}
              {platform === 'google' && <Icons.googleWorkspace className="h-4 w-4" />}
              {platform === 'all' ? 'All Platforms' : platform === 'microsoft' ? 'Microsoft 365' : 'Google'}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Tenant Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredTenants.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredTenants.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
        >
          <Icons.cloud className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No tenants found</h3>
          <p className="text-muted-foreground">
            No tenants match your current filter. Try adjusting your filters or connect a new tenant.
          </p>
          <Link href="/dashboard/tenants/connect" className="mt-4">
            <Button>
              <Icons.add className="mr-2 h-4 w-4" />
              Connect Tenant
            </Button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

function TenantCard({ tenant }: { tenant: Tenant }) {
  const statusConfig = {
    connected: { color: 'bg-green-500', label: 'Connected' },
    error: { color: 'bg-red-500', label: 'Error' },
    syncing: { color: 'bg-blue-500', label: 'Syncing' },
  };

  const getMicrosoftStats = () => [
    { label: 'Users', value: tenant.userCount, icon: Icons.users },
    { label: 'Mailboxes', value: tenant.mailboxCount, icon: Icons.mail },
    { label: 'Sites', value: tenant.siteCount, icon: Icons.drive },
    { label: 'Teams', value: tenant.teamCount, icon: Icons.teams },
  ];

  const getGoogleStats = () => [
    { label: 'Users', value: tenant.userCount, icon: Icons.users },
    { label: 'Gmail', value: tenant.mailboxCount, icon: Icons.gmail },
    { label: 'Drive', value: tenant.userCount, icon: Icons.googleDrive },
    { label: 'Groups', value: tenant.teamCount, icon: Icons.googleGroups },
  ];

  const stats = tenant.platform === 'microsoft' ? getMicrosoftStats() : getGoogleStats();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
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
              <div>
                <CardTitle className="text-lg">{tenant.name}</CardTitle>
                <CardDescription className="text-xs">{tenant.domain}</CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    tenant.platform === 'microsoft'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  {tenant.platform === 'microsoft' ? 'M365' : 'Google'}
                </Badge>
                <Badge
                  variant={tenant.type === 'source' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {tenant.type}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    statusConfig[tenant.status].color,
                    tenant.status === 'syncing' && 'animate-pulse',
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {statusConfig[tenant.status].label}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <div className="text-lg font-semibold">{stat.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Last Sync */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.refresh className="h-4 w-4" />
              <span>Last sync: {tenant.lastSync}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Icons.refresh className="mr-1 h-3 w-3" />
                Sync
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
