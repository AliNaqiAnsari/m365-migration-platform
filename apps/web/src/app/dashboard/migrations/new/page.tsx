'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type Step = 'type' | 'source' | 'destination' | 'workloads' | 'users' | 'options' | 'review';
type MigrationType = 'same-platform' | 'cross-platform';
type Platform = 'microsoft' | 'google';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  platform: Platform;
  userCount: number;
}

const mockTenants: Tenant[] = [
  { id: '1', name: 'Contoso Corporation', domain: 'contoso.onmicrosoft.com', platform: 'microsoft', userCount: 250 },
  { id: '2', name: 'Fabrikam Inc', domain: 'fabrikam.onmicrosoft.com', platform: 'microsoft', userCount: 180 },
  { id: '3', name: 'Acme Inc', domain: 'acme.com', platform: 'google', userCount: 320 },
  { id: '4', name: 'TechStart Solutions', domain: 'techstart.io', platform: 'google', userCount: 85 },
  { id: '5', name: 'Northwind Traders', domain: 'northwind.onmicrosoft.com', platform: 'microsoft', userCount: 450 },
];

const microsoftWorkloads = [
  { id: 'exchange', name: 'Exchange', description: 'Mailboxes, calendars, contacts', icon: Icons.mail },
  { id: 'onedrive', name: 'OneDrive', description: 'Personal files and folders', icon: Icons.drive },
  { id: 'sharepoint', name: 'SharePoint', description: 'Sites, document libraries, lists', icon: Icons.database },
  { id: 'teams', name: 'Teams', description: 'Teams, channels, messages, files', icon: Icons.teams },
];

const googleWorkloads = [
  { id: 'gmail', name: 'Gmail', description: 'Emails, labels, filters', icon: Icons.gmail },
  { id: 'drive', name: 'Google Drive', description: 'Files, folders, shared drives', icon: Icons.googleDrive },
  { id: 'calendar', name: 'Calendar', description: 'Events, reminders, meeting rooms', icon: Icons.googleCalendar },
  { id: 'contacts', name: 'Contacts', description: 'Personal and directory contacts', icon: Icons.googleContacts },
];

// Workload mapping for cross-platform migrations
const crossPlatformMapping = {
  'microsoft-to-google': {
    exchange: 'gmail',
    onedrive: 'drive',
    sharepoint: 'drive',
    teams: null, // No direct equivalent
  },
  'google-to-microsoft': {
    gmail: 'exchange',
    drive: 'onedrive',
    calendar: 'exchange', // Calendar is part of Exchange
    contacts: 'exchange', // Contacts are part of Exchange
  },
};

const mockUsers = [
  { id: '1', name: 'John Smith', email: 'john.smith@contoso.com', department: 'Engineering' },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@contoso.com', department: 'Marketing' },
  { id: '3', name: 'Bob Wilson', email: 'bob.wilson@contoso.com', department: 'Sales' },
  { id: '4', name: 'Alice Brown', email: 'alice.brown@contoso.com', department: 'HR' },
  { id: '5', name: 'Charlie Davis', email: 'charlie.davis@contoso.com', department: 'Finance' },
  { id: '6', name: 'Diana Evans', email: 'diana.evans@contoso.com', department: 'Engineering' },
  { id: '7', name: 'Edward Foster', email: 'edward.foster@contoso.com', department: 'Marketing' },
  { id: '8', name: 'Fiona Green', email: 'fiona.green@contoso.com', department: 'Sales' },
];

export default function NewMigrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [migrationType, setMigrationType] = useState<MigrationType | null>(null);
  const [sourceTenant, setSourceTenant] = useState<Tenant | null>(null);
  const [destinationTenant, setDestinationTenant] = useState<Tenant | null>(null);
  const [selectedWorkloads, setSelectedWorkloads] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [migrationName, setMigrationName] = useState('');
  const [options, setOptions] = useState({
    skipExisting: true,
    includePermissions: true,
    includeVersionHistory: false,
    notifyUsers: false,
    scheduleTime: '',
  });

  const steps: { id: Step; label: string }[] = [
    { id: 'type', label: 'Migration Type' },
    { id: 'source', label: 'Source' },
    { id: 'destination', label: 'Destination' },
    { id: 'workloads', label: 'Workloads' },
    { id: 'users', label: 'Users' },
    { id: 'options', label: 'Options' },
    { id: 'review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const toggleWorkload = (id: string) => {
    setSelectedWorkloads((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === mockUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(mockUsers.map((u) => u.id));
    }
  };

  const getAvailableWorkloads = () => {
    if (!sourceTenant) return [];
    return sourceTenant.platform === 'microsoft' ? microsoftWorkloads : googleWorkloads;
  };

  const getDestinationTenants = () => {
    if (!sourceTenant) return mockTenants;
    if (migrationType === 'same-platform') {
      return mockTenants.filter(
        (t) => t.id !== sourceTenant.id && t.platform === sourceTenant.platform
      );
    }
    // Cross-platform: show tenants of the other platform
    return mockTenants.filter(
      (t) => t.platform !== sourceTenant.platform
    );
  };

  const isCrossPlatform = sourceTenant && destinationTenant && sourceTenant.platform !== destinationTenant.platform;

  const getMigrationDirection = () => {
    if (!sourceTenant || !destinationTenant) return null;
    if (sourceTenant.platform === 'microsoft' && destinationTenant.platform === 'google') {
      return 'microsoft-to-google';
    }
    if (sourceTenant.platform === 'google' && destinationTenant.platform === 'microsoft') {
      return 'google-to-microsoft';
    }
    return null;
  };

  const handleCreate = () => {
    // In a real app, this would create the migration
    router.push('/dashboard/migrations');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return migrationType !== null;
      case 'source':
        return sourceTenant !== null;
      case 'destination':
        return destinationTenant !== null;
      case 'workloads':
        return selectedWorkloads.length > 0;
      case 'users':
        return selectedUsers.length > 0;
      case 'options':
        return migrationName.trim() !== '';
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Migration</h1>
        <p className="text-muted-foreground">
          Set up a new migration between your cloud tenants
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isPast = index < currentStepIndex;
            return (
              <div key={step.id} className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      isPast && 'bg-green-500 text-white',
                      !isActive && !isPast && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isPast ? <Icons.check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      'hidden text-xs font-medium lg:block',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-4 sm:w-8',
                      isPast ? 'bg-green-500' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Migration Type */}
        {currentStep === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Migration Type</CardTitle>
                <CardDescription>
                  Choose the type of migration you want to perform
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    migrationType === 'same-platform' && 'border-primary ring-2 ring-primary/20',
                  )}
                  onClick={() => setMigrationType('same-platform')}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                      <Icons.migration className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Same Platform</CardTitle>
                    <CardDescription>
                      Migrate between tenants on the same platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Icons.microsoft className="h-4 w-4" />
                        <span>Microsoft 365 to Microsoft 365</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.googleWorkspace className="h-4 w-4" />
                        <span>Google Workspace to Google Workspace</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    migrationType === 'cross-platform' && 'border-primary ring-2 ring-primary/20',
                  )}
                  onClick={() => setMigrationType('cross-platform')}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-red-100">
                      <Icons.crossPlatform className="h-8 w-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Cross Platform</CardTitle>
                    <CardDescription>
                      Migrate between different cloud platforms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Icons.googleWorkspace className="h-4 w-4" />
                        <Icons.chevronRight className="h-3 w-3" />
                        <Icons.microsoft className="h-4 w-4" />
                        <span>Google to Microsoft 365</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.microsoft className="h-4 w-4" />
                        <Icons.chevronRight className="h-3 w-3" />
                        <Icons.googleWorkspace className="h-4 w-4" />
                        <span>Microsoft 365 to Google</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Source Tenant */}
        {currentStep === 'source' && (
          <motion.div
            key="source"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Source Tenant</CardTitle>
                <CardDescription>
                  Choose the tenant to migrate data FROM
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {mockTenants.map((tenant) => (
                  <Card
                    key={tenant.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary',
                      sourceTenant?.id === tenant.id && 'border-primary ring-2 ring-primary/20',
                    )}
                    onClick={() => {
                      setSourceTenant(tenant);
                      setDestinationTenant(null);
                      setSelectedWorkloads([]);
                    }}
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
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">{tenant.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{tenant.domain}</p>
                        <p className="text-xs text-muted-foreground">{tenant.userCount} users</p>
                      </div>
                      {sourceTenant?.id === tenant.id && (
                        <Icons.check className="h-5 w-5 shrink-0 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Destination Tenant */}
        {currentStep === 'destination' && (
          <motion.div
            key="destination"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Destination Tenant</CardTitle>
                <CardDescription>
                  Choose the tenant to migrate data TO
                  {isCrossPlatform && (
                    <Badge variant="secondary" className="ml-2">
                      Cross-Platform Migration
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getDestinationTenants().length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {getDestinationTenants().map((tenant) => (
                      <Card
                        key={tenant.id}
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary',
                          destinationTenant?.id === tenant.id && 'border-primary ring-2 ring-primary/20',
                        )}
                        onClick={() => setDestinationTenant(tenant)}
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
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate font-medium">{tenant.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{tenant.domain}</p>
                            <p className="text-xs text-muted-foreground">{tenant.userCount} users</p>
                          </div>
                          {destinationTenant?.id === tenant.id && (
                            <Icons.check className="h-5 w-5 shrink-0 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icons.alert className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      No compatible destination tenants found. Please connect a{' '}
                      {migrationType === 'same-platform'
                        ? sourceTenant?.platform === 'microsoft' ? 'Microsoft 365' : 'Google Workspace'
                        : sourceTenant?.platform === 'microsoft' ? 'Google Workspace' : 'Microsoft 365'
                      } tenant first.
                    </p>
                    <Button className="mt-4" onClick={() => router.push('/dashboard/tenants/connect')}>
                      Connect Tenant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Workloads */}
        {currentStep === 'workloads' && (
          <motion.div
            key="workloads"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Workloads</CardTitle>
                <CardDescription>
                  Choose which workloads to include in the migration
                  {isCrossPlatform && (
                    <span className="block mt-1 text-yellow-600">
                      Note: Some workloads will be mapped to equivalent services on the destination platform
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {getAvailableWorkloads().map((workload) => {
                  const isSelected = selectedWorkloads.includes(workload.id);
                  const direction = getMigrationDirection();
                  const mapping = direction ? crossPlatformMapping[direction] : null;
                  const mappedTo = mapping ? mapping[workload.id as keyof typeof mapping] : null;

                  return (
                    <Card
                      key={workload.id}
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary',
                        isSelected && 'border-primary ring-2 ring-primary/20',
                        mappedTo === null && isCrossPlatform && 'opacity-50 cursor-not-allowed',
                      )}
                      onClick={() => {
                        if (mappedTo === null && isCrossPlatform) return;
                        toggleWorkload(workload.id);
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-lg',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}
                        >
                          <workload.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{workload.name}</p>
                          <p className="text-sm text-muted-foreground">{workload.description}</p>
                          {isCrossPlatform && mappedTo && (
                            <p className="text-xs text-blue-600 mt-1">
                              Maps to: {mappedTo}
                            </p>
                          )}
                          {isCrossPlatform && mappedTo === null && (
                            <p className="text-xs text-red-600 mt-1">
                              No equivalent on destination
                            </p>
                          )}
                        </div>
                        {isSelected && <Icons.check className="h-5 w-5 text-primary" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Users */}
        {currentStep === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Users</CardTitle>
                    <CardDescription>
                      Choose which users to include in the migration
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleAllUsers}>
                    {selectedUsers.length === mockUsers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input placeholder="Search users..." />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {mockUsers.map((user) => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          'flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors',
                          isSelected && 'border-primary bg-primary/5',
                        )}
                        onClick={() => toggleUser(user.id)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="outline">{user.department}</Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {selectedUsers.length} of {mockUsers.length} users selected
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 6: Options */}
        {currentStep === 'options' && (
          <motion.div
            key="options"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Migration Options</CardTitle>
                <CardDescription>
                  Configure additional options for your migration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium">Migration Name</label>
                  <Input
                    className="mt-2"
                    placeholder="e.g., Contoso to Fabrikam Full Migration"
                    value={migrationName}
                    onChange={(e) => setMigrationName(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Skip existing items</p>
                      <p className="text-sm text-muted-foreground">
                        Skip items that already exist in the destination
                      </p>
                    </div>
                    <Checkbox
                      checked={options.skipExisting}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, skipExisting: !!checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include permissions</p>
                      <p className="text-sm text-muted-foreground">
                        Migrate sharing permissions and access rights
                      </p>
                    </div>
                    <Checkbox
                      checked={options.includePermissions}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, includePermissions: !!checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include version history</p>
                      <p className="text-sm text-muted-foreground">
                        Migrate file version history (increases migration time)
                      </p>
                    </div>
                    <Checkbox
                      checked={options.includeVersionHistory}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, includeVersionHistory: !!checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notify users</p>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications to migrated users
                      </p>
                    </div>
                    <Checkbox
                      checked={options.notifyUsers}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, notifyUsers: !!checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Schedule (Optional)</label>
                  <Input
                    className="mt-2"
                    type="datetime-local"
                    value={options.scheduleTime}
                    onChange={(e) => setOptions({ ...options, scheduleTime: e.target.value })}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Leave empty to start immediately after creation
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 7: Review */}
        {currentStep === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Review Migration</CardTitle>
                <CardDescription>
                  Review your migration configuration before starting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-4">Migration Summary</h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium">{migrationName}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>
                        <Badge variant={isCrossPlatform ? 'secondary' : 'default'}>
                          {isCrossPlatform ? 'Cross-Platform' : 'Same Platform'}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="flex items-center gap-2">
                        {sourceTenant?.platform === 'microsoft' ? (
                          <Icons.microsoft className="h-4 w-4" />
                        ) : (
                          <Icons.googleWorkspace className="h-4 w-4" />
                        )}
                        {sourceTenant?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">Destination</dt>
                      <dd className="flex items-center gap-2">
                        {destinationTenant?.platform === 'microsoft' ? (
                          <Icons.microsoft className="h-4 w-4" />
                        ) : (
                          <Icons.googleWorkspace className="h-4 w-4" />
                        )}
                        {destinationTenant?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Workloads</dt>
                      <dd>{selectedWorkloads.length} selected</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Users</dt>
                      <dd>{selectedUsers.length} selected</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Schedule</dt>
                      <dd>{options.scheduleTime || 'Start immediately'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                  <div className="flex items-start gap-3">
                    <Icons.alert className="mt-0.5 h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Ready to Start Migration
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        This migration will transfer data for {selectedUsers.length} users across {selectedWorkloads.length} workloads.
                        {isCrossPlatform && ' Some data formats may be converted during the cross-platform migration.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 'type' ? () => router.back() : handleBack}
        >
          {currentStep === 'type' ? 'Cancel' : 'Back'}
        </Button>
        {currentStep === 'review' ? (
          <Button onClick={handleCreate} disabled={!canProceed()}>
            <Icons.play className="mr-2 h-4 w-4" />
            Start Migration
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Continue
            <Icons.chevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
