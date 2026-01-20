'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile', icon: Icons.user },
  { id: 'organization', label: 'Organization', icon: Icons.building },
  { id: 'security', label: 'Security', icon: Icons.security },
  { id: 'notifications', label: 'Notifications', icon: Icons.bell },
  { id: 'billing', label: 'Billing', icon: Icons.chart },
  { id: 'api', label: 'API Keys', icon: Icons.zap },
];

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuthStore();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization preferences
        </p>
      </motion.div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <motion.div variants={itemVariants} className="w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants} className="flex-1">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'organization' && <OrganizationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'api' && <ApiSettings />}
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <Button variant="outline">Change Avatar</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input defaultValue={user?.name || ''} className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue={user?.email || ''} className="mt-1.5" disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Job Title</label>
              <Input placeholder="e.g. IT Administrator" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="+1 (555) 000-0000" className="mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Manage your organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <Input defaultValue="Acme Corporation" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input defaultValue="acme-corp" className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Website</label>
              <Input placeholder="https://example.com" className="mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage who has access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'John Doe', email: 'john@example.com', role: 'Admin' },
              { name: 'Jane Smith', email: 'jane@example.com', role: 'Member' },
              { name: 'Bob Wilson', email: 'bob@example.com', role: 'Member' },
            ].map((member) => (
              <div key={member.email} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <Badge variant="secondary">{member.role}</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-4">
            <Icons.add className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySettings() {
  const [mfaEnabled, setMfaEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" className="mt-1.5" />
          </div>
          <div className="flex justify-end">
            <Button>Update Password</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icons.security className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">
                  {mfaEnabled ? 'Enabled' : 'Not configured'}
                </p>
              </div>
            </div>
            <Button variant={mfaEnabled ? 'destructive' : 'default'}>
              {mfaEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Manage your active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <Icons.cloud className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">Windows 10 - Chrome</p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
          <Button variant="outline" className="mt-4 text-red-600 hover:text-red-700">
            Sign out of all other sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'migration-complete', label: 'Migration completed', description: 'When a migration job finishes' },
            { id: 'migration-failed', label: 'Migration failed', description: 'When a migration job fails' },
            { id: 'backup-complete', label: 'Backup completed', description: 'When a scheduled backup completes' },
            { id: 'backup-failed', label: 'Backup failed', description: 'When a backup job fails' },
            { id: 'tenant-disconnect', label: 'Tenant disconnected', description: 'When a tenant connection is lost' },
            { id: 'weekly-report', label: 'Weekly summary', description: 'Weekly activity summary' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-6">
            <div>
              <h3 className="text-xl font-semibold">Business Plan</h3>
              <p className="text-muted-foreground">Up to 200 users per migration</p>
              <p className="mt-2 text-2xl font-bold">
                $299<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
            </div>
            <Button variant="outline">Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-16 items-center justify-center rounded bg-gradient-to-r from-blue-600 to-blue-400 text-xs font-bold text-white">
                VISA
              </div>
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2025</p>
              </div>
            </div>
            <Button variant="outline">Update</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your recent invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: 'Feb 1, 2024', amount: '$299.00', status: 'Paid' },
              { date: 'Jan 1, 2024', amount: '$299.00', status: 'Paid' },
              { date: 'Dec 1, 2023', amount: '$299.00', status: 'Paid' },
            ].map((invoice) => (
              <div key={invoice.date} className="flex items-center justify-between text-sm">
                <span>{invoice.date}</span>
                <span className="font-medium">{invoice.amount}</span>
                <Badge variant="success">{invoice.status}</Badge>
                <Button variant="ghost" size="sm">
                  <Icons.download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Production API Key</p>
                <p className="font-mono text-sm text-muted-foreground">
                  m365_prod_****************************abcd
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Icons.edit className="mr-1 h-3 w-3" />
                  Reveal
                </Button>
                <Button variant="outline" size="sm" className="text-red-600">
                  <Icons.delete className="mr-1 h-3 w-3" />
                  Revoke
                </Button>
              </div>
            </div>
          </div>
          <Button>
            <Icons.add className="mr-2 h-4 w-4" />
            Create New API Key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Configure webhooks for real-time notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No webhooks configured. Add a webhook to receive real-time updates about migrations
            and backups.
          </p>
          <Button variant="outline" className="mt-4">
            <Icons.add className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
